/**
 * Public Product Detail API Routes
 * 
 * This file handles public product detail operations for customers.
 * 
 * Routes:
 * - GET /api/products/[slug] - Get a specific product by slug
 * 
 * Features:
 * - Public access (no authentication required)
 * - Product detail by slug
 * - View count tracking
 * - Related products
 * - Category information
 * - SEO-friendly URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOptionalAuth } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import connectDB from '@/lib/db/connection';
import { Product, Category } from '@/lib/db/models';
import { z } from 'zod';
import { 
    calculateDiscountPercentage,
    isProductOnSale,
    sanitizeProductForResponse 
} from '@/lib/utils/productUtils';

const querySchema = z.object({
    includeRelated: z.enum(['true', 'false']).optional().default('true'),
    relatedLimit: z.string().optional().default('4').transform(Number)
});

/**
 * GET /api/products/[slug]
 * Get a specific product by slug
 */
async function getProductBySlug(req: NextRequest, context: ApiRouteContext, user?: SessionUser) {
    try {
        await connectDB();

        const { slug } = context.params;
        const { searchParams } = new URL(req.url);
        const query = querySchema.parse({
            includeRelated: searchParams.get('includeRelated') || 'true',
            relatedLimit: searchParams.get('relatedLimit') || '4'
        });

        if (!slug) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Product slug is required'
                },
                { status: 400 }
            );
        }

        // Find product by slug with category population
        const product = await Product.findOne({
            slug,
            isActive: true
        }).populate('categoryId', 'name slug description');

        if (!product) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Product not found'
                },
                { status: 404 }
            );
        }

        // Increment view count
        await Product.findByIdAndUpdate(product._id, {
            $inc: { viewCount: 1 }
        });

        // Prepare product data for response
        const productData = {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            images: product.images,
            youtubeLink: product.youtubeLink,
            EnableCustomizations: product.EnableCustomizations,
            allowColorChanges: product.allowColorChanges,
            allowTextEditing: product.allowTextEditing,
            allowImageReplacement: product.allowImageReplacement,
            allowLogoUpload: product.allowLogoUpload,
            colors: product.colors,
            category: product.categoryId,
            tags: product.tags,
            price: product.price,
            discountAmount: product.discountAmount,
            discountPercentage: product.discountPercentage,
            finalPrice: product.finalPrice,
            isFeatured: product.isFeatured,
            rating: product.rating,
            reviewCount: product.reviewCount,
            viewCount: product.viewCount + 1, // Include the current view
            purchaseCount: product.purchaseCount,
            metaTitle: product.metaTitle,
            metaDescription: product.metaDescription,
            keywords: product.keywords,
            createdAt: product.createdAt,
                        // Calculate discount percentage for display
            calculatedDiscountPercentage: calculateDiscountPercentage(product.price, product.discountAmount || 0),
            // Check if product is on sale
            isOnSale: isProductOnSale(product)
        };

        let relatedProducts = [];

        // Get related products if requested
        if (query.includeRelated === 'true') {
            relatedProducts = await Product.aggregate([
                {
                    $match: {
                        _id: { $ne: product._id },
                        isActive: true,
                        categoryId: product.categoryId
                    }
                },
                { $sort: { isFeatured: -1, createdAt: -1 } },
                { $limit: query.relatedLimit },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'categoryId',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                {
                    $addFields: {
                        category: { $arrayElemAt: ['$category', 0] }
                    }
                },
                {
                    $project: {
                        name: 1,
                        slug: 1,
                        images: 1,
                        price: 1,
                        finalPrice: 1,
                        discountAmount: 1,
                        discountPercentage: 1,
                        isFeatured: 1,
                        rating: 1,
                        reviewCount: 1,
                        category: 1,
                        calculatedDiscountPercentage: {
                            $cond: {
                                if: { $gt: ['$discountAmount', 0] },
                                then: { $multiply: [{ $divide: ['$discountAmount', '$price'] }, 100] },
                                else: '$discountPercentage'
                            }
                        },
                        isOnSale: {
                            $or: [
                                { $gt: ['$discountAmount', 0] },
                                { $gt: ['$discountPercentage', 0] }
                            ]
                        }
                    }
                }
            ]);
        }

        return NextResponse.json({
            success: true,
            data: productData,
            relatedProducts: query.includeRelated === 'true' ? relatedProducts : undefined
        });

    } catch (error) {
        console.error('Get product by slug error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid query parameters',
                    errors: error.issues
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch product'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const GET = withOptionalAuth(getProductBySlug); 