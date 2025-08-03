/**
 * Admin Product API Routes
 * 
 * This file handles admin-only product management operations for a specific product.
 * 
 * Routes:
 * - GET /api/admin/products/[id] - Get a specific product
 * - PUT /api/admin/products/[id] - Update a specific product
 * - DELETE /api/admin/products/[id] - Delete a specific product and its files
 * 
 * Features:
 * - Admin-only access control
 * - Input validation and sanitization
 * - File management
 * - Hard delete with file cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { ApiRouteContext } from '@/lib/auth/types';
import connectDB from '@/lib/db/connection';
import { Product, DesignFile } from '@/lib/db/models';
import { z } from 'zod';
import { unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Define validation schemas locally
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
    order: z.number().default(0)
});

const createProductSchema = z.object({
    name: z.string()
        .min(3, 'Product name must be at least 3 characters')
        .max(100, 'Product name cannot exceed 100 characters')
        .trim(),
    slug: z.string()
        .min(3, 'Slug must be at least 3 characters')
        .max(100, 'Slug cannot exceed 100 characters')
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
        .trim(),
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
        .default(0),
    discountPercentage: z.number()
        .min(0, 'Discount percentage cannot be negative')
        .max(100, 'Discount percentage cannot exceed 100')
        .default(0),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false)
});

// Validation schema for product ID
const productIdSchema = z.object({
    id: z.string().min(1, 'Product ID is required')
});

// Update product schema (partial, all fields optional)
const updateProductSchema = createProductSchema.partial();

/**
 * GET /api/admin/products/[id]
 * Get a specific product by ID
 */
async function getProduct(req: NextRequest, context: ApiRouteContext) {
    try {
        await connectDB();

        const params = await context.params;
        const validatedParams = productIdSchema.parse(params);

        const product = await Product.findById(validatedParams.id)
            .populate('categoryId', 'name')
            .lean();

        if (!product) {
            return NextResponse.json(
                { success: false, message: 'Product not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: product
        });

    } catch (error) {
        console.error('Get product error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, message: 'Invalid product ID' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Failed to get product' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/products/[id]
 * Update a specific product
 */
async function updateProduct(req: NextRequest, context: ApiRouteContext) {
    try {
        await connectDB();

        const params = await context.params;
        const validatedParams = productIdSchema.parse(params);
        const body = await req.json();

        console.log('API received body:', {
            images: body.images,
            bodyKeys: Object.keys(body),
            discountAmount: body.discountAmount,
            discountPercentage: body.discountPercentage
        });

        // Validate and transform the request body
        const validatedBody = updateProductSchema.parse(body);

        console.log('Validated body:', {
            validatedKeys: Object.keys(validatedBody),
            discountAmount: validatedBody.discountAmount,
            discountPercentage: validatedBody.discountPercentage
        });

        console.log('Validated body:', {
            images: validatedBody.images,
            validatedKeys: Object.keys(validatedBody)
        });

        // Find the product first
        const existingProduct = await Product.findById(validatedParams.id);
        if (!existingProduct) {
            return NextResponse.json(
                { success: false, message: 'Product not found' },
                { status: 404 }
            );
        }

        // Find the product first
        const product = await Product.findById(validatedParams.id);
        if (!product) {
            return NextResponse.json(
                { success: false, message: 'Product not found' },
                { status: 404 }
            );
        }

        // Update the product fields
        Object.assign(product, validatedBody);

        // Save the product to trigger pre-save middleware for final price calculation
        const updatedProduct = await product.save();

        // Populate the category
        await updatedProduct.populate('categoryId', 'name');

        return NextResponse.json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct
        });

    } catch (error) {
        console.error('Update product error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, message: 'Invalid input data' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Failed to update product' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/products/[id]
 * Hard delete a product and all its associated files
 */
async function deleteProduct(req: NextRequest, context: ApiRouteContext) {
    try {
        await connectDB();

        const params = await context.params;
        const validatedParams = productIdSchema.parse(params);

        // Find the product first
        const product = await Product.findById(validatedParams.id);
        if (!product) {
            return NextResponse.json(
                { success: false, message: 'Product not found' },
                { status: 404 }
            );
        }

        // Get all design files for this product
        const designFiles = await DesignFile.find({ productId: validatedParams.id });
        console.log(`Found ${designFiles.length} design files to delete for product ${validatedParams.id}`);

        // Delete files from disk
        const deletedFiles = [];
        const failedFiles = [];

        for (const designFile of designFiles) {
            try {
                if (designFile.fileUrl && designFile.fileUrl.startsWith('/uploads/')) {
                    const filePath = join(process.cwd(), 'public', designFile.fileUrl);

                    if (existsSync(filePath)) {
                        await unlink(filePath);
                        console.log(`Deleted file: ${filePath}`);
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

        // Try to remove the product's upload directory if it exists
        try {
            const uploadDir = join(process.cwd(), 'public', 'uploads', 'designs', product.slug);
            if (existsSync(uploadDir)) {
                await rmdir(uploadDir);
                console.log(`Deleted upload directory: ${uploadDir}`);
            }
        } catch (dirError) {
            console.log(`Could not delete upload directory (may not be empty): ${dirError}`);
        }

        // Delete design files from database
        const deleteResult = await DesignFile.deleteMany({ productId: validatedParams.id });
        console.log(`Deleted ${deleteResult.deletedCount} design files from database`);

        // Delete the product
        await Product.findByIdAndDelete(validatedParams.id);
        console.log(`Deleted product: ${validatedParams.id}`);

        return NextResponse.json({
            success: true,
            message: 'Product and all associated files deleted successfully',
            data: {
                productId: validatedParams.id,
                deletedFiles: deletedFiles.length,
                failedFiles: failedFiles.length,
                deletedDesignFiles: deleteResult.deletedCount
            }
        });

    } catch (error) {
        console.error('Delete product error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, message: 'Invalid product ID' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Failed to delete product' },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const GET = withAdmin(getProduct);
export const PUT = withAdmin(updateProduct);
export const DELETE = withAdmin(deleteProduct); 