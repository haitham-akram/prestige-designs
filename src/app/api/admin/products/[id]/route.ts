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
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import connectDB from '@/lib/db/connection';
import { Product, DesignFile } from '@/lib/db/models';
import { z } from 'zod';
import { unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Validation schema for product ID
const productIdSchema = z.object({
    id: z.string().min(1, 'Product ID is required')
});

/**
 * GET /api/admin/products/[id]
 * Get a specific product by ID
 */
async function getProduct(req: NextRequest, context: ApiRouteContext, user: SessionUser) {
    try {
        await connectDB();

        const { params } = context;
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
async function updateProduct(req: NextRequest, context: ApiRouteContext, user: SessionUser) {
    try {
        await connectDB();

        const { params } = context;
        const validatedParams = productIdSchema.parse(params);
        const body = await req.json();

        // Find the product first
        const existingProduct = await Product.findById(validatedParams.id);
        if (!existingProduct) {
            return NextResponse.json(
                { success: false, message: 'Product not found' },
                { status: 404 }
            );
        }

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(
            validatedParams.id,
            { ...body, updatedBy: user.id },
            { new: true, runValidators: true }
        ).populate('categoryId', 'name');

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
async function deleteProduct(req: NextRequest, context: ApiRouteContext, user: SessionUser) {
    try {
        await connectDB();

        const { params } = context;
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