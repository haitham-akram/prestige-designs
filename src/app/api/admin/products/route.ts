/**
 * Admin Products API Routes
 * 
 * This file handles admin-only product management operations.
 * 
 * Routes:
 * - GET /api/admin/products - List all products with pagination
 * - POST /api/admin/products - Create a new product
 * 
 * Features:
 * - Admin-only access control
 * - Input validation and sanitization
 * - Pagination support
 * - Search and filtering
 * - Duplicate name/slug checking
 * - Auto-slug generation
 * - Image management
 * - Color theme management
 * - Category validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import connectDB from '@/lib/db/connection';
import { Product, Category, DesignFile } from '@/lib/db/models';
import { z } from 'zod';
import {
    generateSlug,
    calculateFinalPrice,
    validateProductData,
    sanitizeProductForResponse
} from '@/lib/utils/productUtils';
import { join } from 'path';
import { existsSync, unlink, rmdir, readdir, stat } from 'fs';
import { promisify } from 'util';

// Promisify fs functions
const readdirAsync = promisify(readdir);
const statAsync = promisify(stat);
const unlinkAsync = promisify(unlink);
const rmdirAsync = promisify(rmdir);

// Recursive directory removal function
async function removeDirectoryRecursive(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
        return;
    }

    const files = await readdirAsync(dirPath);

    for (const file of files) {
        const filePath = join(dirPath, file);
        const stats = await statAsync(filePath);

        if (stats.isDirectory()) {
            await removeDirectoryRecursive(filePath);
        } else {
            await unlinkAsync(filePath);
            console.log(`Deleted file: ${filePath}`);
        }
    }

    await rmdirAsync(dirPath);
    console.log(`Deleted directory: ${dirPath}`);
}

// Validation schemas
const colorThemeSchema = z.object({
    name: z.string()
        .min(1, 'Color name is required')
        .max(50, 'Color name cannot exceed 50 characters')
        .trim(),
    hex: z.string()
        .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color code'),
    description: z.string()
        .max(100, 'Color description cannot exceed 100 characters')
        .trim()
        .optional()
});

const productImageSchema = z.object({
    url: z.string()
        .regex(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i, 'Please provide a valid image URL'),
    alt: z.string()
        .max(200, 'Alt text cannot exceed 200 characters')
        .trim()
        .optional(),
    isPrimary: z.boolean().default(false),
    order: z.number()
        .min(0, 'Order cannot be negative')
        .default(0)
});

const createProductSchema = z.object({
    name: z.string()
        .min(2, 'Product name must be at least 2 characters')
        .max(200, 'Product name cannot exceed 200 characters')
        .trim(),
    slug: z.string()
        .min(1, 'Slug must be at least 1 character')
        .max(200, 'Slug cannot exceed 200 characters')
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
        .trim()
        .optional(),
    description: z.string()
        .max(2000, 'Description cannot exceed 2000 characters')
        .trim()
        .optional(),
    images: z.array(z.union([
        // Accept image objects
        productImageSchema,
        // Accept string URLs and transform them to image objects
        z.string().regex(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i, 'Please provide a valid image URL')
    ]))
        .min(1, 'At least one product image is required')
        .transform((images) =>
            images.map((image, index) =>
                typeof image === 'string'
                    ? { url: image, alt: '', isPrimary: index === 0, order: index }
                    : image
            )
        ),
    youtubeLink: z.string()
        .regex(/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/).+/, 'Please provide a valid YouTube URL')
        .optional()
        .or(z.literal('')),
    EnableCustomizations: z.boolean().default(false),
    allowColorChanges: z.boolean().default(false),
    allowTextEditing: z.boolean().default(false),
    allowImageReplacement: z.boolean().default(false),
    allowLogoUpload: z.boolean().default(false),
    colors: z.array(colorThemeSchema).default([]),
    categoryId: z.string()
        .min(1, 'Category is required'),
    tags: z.array(z.string()
        .max(30, 'Tag cannot exceed 30 characters')
        .trim()
        .toLowerCase())
        .max(20, 'Cannot have more than 20 tags')
        .optional(),
    price: z.number()
        .min(0, 'Price cannot be negative'),
    discountAmount: z.number()
        .min(0, 'Discount amount cannot be negative')
        .optional(),
    discountPercentage: z.number()
        .min(0, 'Discount percentage cannot be negative')
        .max(100, 'Discount percentage cannot exceed 100')
        .optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    // designFiles field removed - now handled by DesignFile model
});

const updateProductSchema = createProductSchema.partial().extend({
    id: z.string().min(1, 'Product ID is required')
});

const querySchema = z.object({
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('10').transform(Number),
    search: z.string().optional(),
    categoryId: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
    isFeatured: z.enum(['true', 'false']).optional(),
    minPrice: z.string().optional().transform(val => val ? Number(val) : undefined),
    maxPrice: z.string().optional().transform(val => val ? Number(val) : undefined),
    sortBy: z.enum(['name', 'createdAt', 'price', 'finalPrice', 'rating', 'purchaseCount']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

/**
 * GET /api/admin/products
 * List all products with pagination and filtering
 */
async function getProducts(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const query = querySchema.parse({
            page: searchParams.get('page') || '1',
            limit: searchParams.get('limit') || '10',
            search: searchParams.get('search') || undefined,
            categoryId: searchParams.get('categoryId') || undefined,
            isActive: searchParams.get('isActive') || undefined,
            isFeatured: searchParams.get('isFeatured') || undefined,
            minPrice: searchParams.get('minPrice') || undefined,
            maxPrice: searchParams.get('maxPrice') || undefined,
            sortBy: searchParams.get('sortBy') || 'createdAt',
            sortOrder: searchParams.get('sortOrder') || 'desc'
        });

        const { page, limit, search, categoryId, isActive, isFeatured, minPrice, maxPrice, sortBy, sortOrder } = query;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter: Record<string, unknown> = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        if (categoryId) {
            // Handle both String and ObjectId formats for backward compatibility
            try {
                const mongoose = await import('mongoose');
                filter.categoryId = mongoose.Types.ObjectId.isValid(categoryId)
                    ? new mongoose.Types.ObjectId(categoryId)
                    : categoryId;
            } catch (error) {
                filter.categoryId = categoryId;
            }
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        if (isFeatured !== undefined) {
            filter.isFeatured = isFeatured === 'true';
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.finalPrice = {};
            if (minPrice !== undefined) filter.finalPrice.$gte = minPrice;
            if (maxPrice !== undefined) filter.finalPrice.$lte = maxPrice;
        }

        // Build sort object
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute optimized query with category lookup and design files count
        console.log('Filter:', JSON.stringify(filter, null, 2));
        const [productsWithCategory, total] = await Promise.all([
            Product.aggregate([
                { $match: filter },
                { $sort: sort },
                { $skip: skip },
                { $limit: limit },
                // Try to convert categoryId to ObjectId for lookup
                {
                    $addFields: {
                        categoryIdForLookup: {
                            $cond: {
                                if: { $type: '$categoryId' },
                                then: {
                                    $cond: {
                                        if: { $eq: [{ $type: '$categoryId' }, 'string'] },
                                        then: { $toObjectId: '$categoryId' },
                                        else: '$categoryId'
                                    }
                                },
                                else: '$categoryId'
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'categoryIdForLookup',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                {
                    $addFields: {
                        category: {
                            $cond: {
                                if: { $gt: [{ $size: '$category' }, 0] },
                                then: { $arrayElemAt: ['$category', 0] },
                                else: null
                            }
                        }
                    }
                },
                // Add design files count lookup
                {
                    $lookup: {
                        from: 'designfiles',
                        let: { productId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: [{ $toString: '$productId' }, { $toString: '$$productId' }] },
                                            { $eq: ['$isActive', true] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: 'designFiles'
                    }
                },
                {
                    $addFields: {
                        designFilesCount: { $size: '$designFiles' }
                    }
                },
                // Remove the temporary fields
                {
                    $project: {
                        categoryIdForLookup: 0,
                        designFiles: 0
                    }
                }
            ]),
            Product.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        console.log('Products with category:', JSON.stringify(productsWithCategory.map(p => ({
            _id: p._id,
            name: p.name,
            categoryId: p.categoryId,
            category: p.category,
            designFilesCount: p.designFilesCount
        })), null, 2));

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
            }
        });

    } catch (error) {
        console.error('Get products error:', error);

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

/**
 * POST /api/admin/products
 * Create a new product
 */
async function createProduct(req: NextRequest, _context: ApiRouteContext, user: SessionUser) {
    try {
        await connectDB();

        const body = await req.json();
        const validatedData = createProductSchema.parse(body);

        // Generate slug from name only if slug is not provided
        const slug = validatedData.slug || generateSlug(validatedData.name);

        // Check for duplicate name or slug
        const existingProduct = await Product.findOne({
            $or: [
                { name: { $regex: `^${validatedData.name}$`, $options: 'i' } },
                { slug }
            ]
        });

        if (existingProduct) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Product with this name or slug already exists'
                },
                { status: 409 }
            );
        }

        // Validate category exists
        const category = await Category.findById(validatedData.categoryId);
        if (!category) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Selected category does not exist'
                },
                { status: 400 }
            );
        }

        // Ensure only one primary image
        const images = validatedData.images.map((img, index) => ({
            ...img,
            isPrimary: index === 0 // First image is primary
        }));

        // Calculate final price using the correct logic
        let finalPrice = validatedData.price;

        // Apply amount discount first
        if (validatedData.discountAmount && validatedData.discountAmount > 0) {
            finalPrice -= validatedData.discountAmount;
        }

        // Apply percentage discount to the remaining price
        if (validatedData.discountPercentage && validatedData.discountPercentage > 0) {
            finalPrice -= (finalPrice * validatedData.discountPercentage) / 100;
        }

        finalPrice = Math.max(0, finalPrice);

        // Create new product
        const product = new Product({
            ...validatedData,
            slug,
            images,
            finalPrice,
            createdBy: user.id // Set the createdBy field from authenticated admin user
        });

        await product.save();

        return NextResponse.json(
            {
                success: true,
                message: 'Product created successfully',
                data: sanitizeProductForResponse(product)
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Create product error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid input data',
                    errors: error.issues
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to create product'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const GET = withAdmin(getProducts);
export const POST = withAdmin(createProduct);

// Soft delete and restore handlers
export const DELETE = withAdmin(async (req: NextRequest, _context: ApiRouteContext, user: SessionUser) => {
    try {
        const { searchParams } = new URL(req.url);
        const productId = searchParams.get('id');

        if (!productId) {
            return NextResponse.json(
                { success: false, message: 'Product ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find the product first
        const product = await Product.findById(productId);
        if (!product) {
            return NextResponse.json(
                { success: false, message: 'Product not found' },
                { status: 404 }
            );
        }

        // Get all design files for this product
        const designFiles = await DesignFile.find({ productId });
        console.log(`Found ${designFiles.length} design files to delete for product ${productId}`);
        console.log('Design files:', designFiles.map(f => ({ fileName: f.fileName, fileUrl: f.fileUrl })));

        // Delete files from disk
        const deletedFiles = [];
        const failedFiles = [];

        for (const designFile of designFiles) {
            try {
                if (designFile.fileUrl) {
                    let filePath: string;

                    // Handle different URL formats
                    if (designFile.fileUrl.startsWith('/uploads/')) {
                        // Local file path
                        filePath = join(process.cwd(), 'public', designFile.fileUrl);
                    } else if (designFile.fileUrl.startsWith('http')) {
                        // External URL (Cloudinary, etc.) - skip file deletion
                        console.log(`Skipping external file: ${designFile.fileUrl}`);
                        continue;
                    } else {
                        // Relative path without leading slash
                        filePath = join(process.cwd(), 'public', 'uploads', designFile.fileUrl);
                    }

                    console.log(`Attempting to delete file: ${filePath}`);
                    console.log(`File exists: ${existsSync(filePath)}`);

                    if (existsSync(filePath)) {
                        await unlinkAsync(filePath);
                        console.log(`Successfully deleted file: ${filePath}`);
                        deletedFiles.push(designFile.fileUrl);
                    } else {
                        console.log(`File not found: ${filePath}`);
                        failedFiles.push(designFile.fileUrl);
                    }
                }
            } catch (fileError) {
                console.error(`Error deleting file ${designFile.fileUrl}:`, fileError);
                failedFiles.push(designFile.fileUrl);
            }
        }

        console.log(`File deletion summary: ${deletedFiles.length} deleted, ${failedFiles.length} failed`);

        // Try to remove the product's upload directory if it exists
        try {
            const uploadDir = join(process.cwd(), 'public', 'uploads', 'designs', product.slug);
            console.log(`Attempting to delete directory: ${uploadDir}`);
            console.log(`Directory exists: ${existsSync(uploadDir)}`);

            if (existsSync(uploadDir)) {
                await removeDirectoryRecursive(uploadDir);
                console.log(`Successfully deleted directory: ${uploadDir}`);
            } else {
                console.log(`Directory not found: ${uploadDir}`);
            }
        } catch (dirError) {
            console.error(`Error deleting directory:`, dirError);
        }

        // Delete design files from database
        const deleteResult = await DesignFile.deleteMany({ productId });
        console.log(`Deleted ${deleteResult.deletedCount} design files from database`);

        // Delete the product
        await Product.findByIdAndDelete(productId);
        console.log(`Deleted product: ${productId}`);

        return NextResponse.json({
            success: true,
            message: 'Product and all associated files deleted successfully',
            data: {
                productId,
                deletedFiles: deletedFiles.length,
                failedFiles: failedFiles.length,
                deletedDesignFiles: deleteResult.deletedCount,
                debug: {
                    productSlug: product.slug,
                    uploadDir: join(process.cwd(), 'public', 'uploads', 'designs', product.slug),
                    cwd: process.cwd()
                }
            }
        });

    } catch (error) {
        console.error('Delete product error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to delete product' },
            { status: 500 }
        );
    }
}); 