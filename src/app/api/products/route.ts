/**
 * Public Products API Routes
 * 
 * This file handles public product operations for customers.
 * 
 * Routes:
 * - GET /api/products - List active products with pagination and filtering
 * 
 * Features:
 * - Public access (no authentication required)
 * - Active products only
 * - Advanced filtering and search
 * - Pagination support
 * - Category filtering
 * - Price range filtering
 * - Featured products
 * - Search functionality
 * - Sorting options
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
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('12').transform(Number),
    search: z.string().optional(),
    categoryId: z.string().optional(),
    categorySlug: z.string().optional(),
    isFeatured: z.enum(['true', 'false']).optional(),
    minPrice: z.string().optional().transform(val => val ? Number(val) : undefined),
    maxPrice: z.string().optional().transform(val => val ? Number(val) : undefined),
    sortBy: z.enum(['name', 'createdAt', 'price', 'finalPrice', 'rating', 'viewCount', 'purchaseCount']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    tags: z.string().optional().transform(val => val ? val.split(',').map(tag => tag.trim().toLowerCase()) : undefined)
});

/**
 * GET /api/products
 * List active products with pagination and filtering
 */
async function getProducts(req: NextRequest, context: ApiRouteContext, user?: SessionUser) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const query = querySchema.parse({
            page: searchParams.get('page') || '1',
            limit: searchParams.get('limit') || '12',
            search: searchParams.get('search') || undefined,
            categoryId: searchParams.get('categoryId') || undefined,
            categorySlug: searchParams.get('categorySlug') || undefined,
            isFeatured: searchParams.get('isFeatured') || undefined,
            minPrice: searchParams.get('minPrice') || undefined,
            maxPrice: searchParams.get('maxPrice') || undefined,
            sortBy: searchParams.get('sortBy') || 'createdAt',
            sortOrder: searchParams.get('sortOrder') || 'desc',
            tags: searchParams.get('tags') || undefined
        });

        const { page, limit, search, categoryId, categorySlug, isFeatured, minPrice, maxPrice, sortBy, sortOrder, tags } = query;
        const skip = (page - 1) * limit;

        // Build filter object - only active products
        const filter: Record<string, unknown> = {
            isActive: true
        };

        // Search functionality
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Category filtering
        if (categoryId) {
            filter.categoryId = categoryId;
        } else if (categorySlug) {
            // Look up category by slug first
            const category = await Category.findOne({ slug: categorySlug, isActive: true });
            if (category) {
                filter.categoryId = category._id;
            } else {
                // Return empty results if category not found
                return NextResponse.json({
                    success: true,
                    data: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        pages: 0,
                        hasNext: false,
                        hasPrev: false
                    }
                });
            }
        }

        // Featured products filter
        if (isFeatured !== undefined) {
            filter.isFeatured = isFeatured === 'true';
        }

        // Price range filtering
        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.finalPrice = {};
            if (minPrice !== undefined) filter.finalPrice.$gte = minPrice;
            if (maxPrice !== undefined) filter.finalPrice.$lte = maxPrice;
        }

        // Tags filtering
        if (tags && tags.length > 0) {
            filter.tags = { $in: tags };
        }

        // Build sort object
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute optimized query with category lookup and aggregation
        const [productsWithCategory, total] = await Promise.all([
            Product.aggregate([
                { $match: filter },
                { $sort: sort },
                { $skip: skip },
                { $limit: limit },
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
                        // Only return necessary fields for public API
                        name: 1,
                        slug: 1,
                        description: 1,
                        images: 1,
                        youtubeLink: 1,
                        EnableCustomizations: 1,
                        allowColorChanges: 1,
                        allowTextEditing: 1,
                        allowImageReplacement: 1,
                        allowLogoUpload: 1,
                        colors: 1,
                        category: 1,
                        tags: 1,
                        price: 1,
                        discountAmount: 1,
                        discountPercentage: 1,
                        finalPrice: 1,
                        isFeatured: 1,
                        rating: 1,
                        reviewCount: 1,
                        viewCount: 1,
                        purchaseCount: 1,
                        createdAt: 1,
                        // Calculate discount percentage for display
                        calculatedDiscountPercentage: {
                            $cond: {
                                if: { $gt: ['$discountAmount', 0] },
                                then: { $multiply: [{ $divide: ['$discountAmount', '$price'] }, 100] },
                                else: '$discountPercentage'
                            }
                        },
                        // Check if product is on sale
                        isOnSale: {
                            $or: [
                                { $gt: ['$discountAmount', 0] },
                                { $gt: ['$discountPercentage', 0] }
                            ]
                        }
                    }
                }
            ]),
            Product.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        // Increment view count for products (optional - for analytics)
        if (productsWithCategory.length > 0) {
            const productIds = productsWithCategory.map(p => p._id);
            // Use updateMany for better performance
            await Product.updateMany(
                { _id: { $in: productIds } },
                { $inc: { viewCount: 1 } }
            );
        }

        return NextResponse.json({
            success: true,
            data: productsWithCategory,
            pagination: {
                page,
                limit,
                total,
                pages: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filters: {
                applied: {
                    search,
                    categoryId,
                    categorySlug,
                    isFeatured,
                    minPrice,
                    maxPrice,
                    tags
                }
            }
        });

    } catch (error) {
        console.error('Get public products error:', error);

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
                message: 'Failed to fetch products'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const GET = withOptionalAuth(getProducts); 