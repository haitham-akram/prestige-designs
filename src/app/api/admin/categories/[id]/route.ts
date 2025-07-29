/**
 * Admin Individual Category API Routes
 * 
 * This file handles admin-only operations for individual categories.
 * 
 * Routes:
 * - GET /api/admin/categories/[id] - Get single category details
 * - PUT /api/admin/categories/[id] - Update category
 * - DELETE /api/admin/categories/[id] - Delete category
 * 
 * Features:
 * - Admin-only access control
 * - Input validation and sanitization
 * - Duplicate checking on updates
 * - Product association checking on delete
 * - Auto-slug regeneration on name updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { ApiRouteContext, SessionUser } from '@/lib/auth/types';
import connectDB from '@/lib/db/connection';
import { Category, Product } from '@/lib/db/models';
import { z } from 'zod';
import mongoose from 'mongoose';
import { deleteImage } from '@/lib/cloudinary/config';

// Validation schema for updates
const updateCategorySchema = z.object({
    name: z.string()
        .min(2, 'Category name must be at least 2 characters')
        .max(100, 'Category name cannot exceed 100 characters')
        .trim()
        .optional(),
    description: z.string()
        .max(500, 'Description cannot exceed 500 characters')
        .optional(),
    image: z.string()
        .regex(/\.(jpg|jpeg|png|gif|webp|svg)$/i, 'Image must be a valid image format (jpg, jpeg, png, gif, webp, svg)')
        .or(z.literal(''))
        .or(z.string().regex(/^https:\/\/res\.cloudinary\.com\/.+$/i, 'Invalid Cloudinary URL'))
        .optional(),
    imagePublicId: z.string().optional(),
    icon: z.string()
        .max(50, 'Icon name cannot exceed 50 characters')
        .trim()
        .optional(),
    order: z.number()
        .min(0, 'Order cannot be negative')
        .optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    color: z.string()
        .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color code (e.g., #FF5733 or #F53)')
        .optional(),
    metaTitle: z.string()
        .max(60, 'Meta title cannot exceed 60 characters')
        .trim()
        .optional(),
    metaDescription: z.string()
        .max(160, 'Meta description cannot exceed 160 characters')
        .trim()
        .optional(),
    keywords: z.array(z.string().trim().toLowerCase())
        .max(10, 'Cannot have more than 10 keywords')
        .optional()
});

/**
 * GET /api/admin/categories/[id]
 * Get single category with details
 */
async function getCategory(req: NextRequest, context: ApiRouteContext) {
    try {
        await connectDB();

        // Fix Next.js 15 params issue - await params
        const params = await context.params;
        const id = params?.id as string;

        // Validate ObjectId
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid category ID'
                },
                { status: 400 }
            );
        }

        // Find category and get products count efficiently
        const [category, productsCount] = await Promise.all([
            Category.findById(id).lean(),
            Product.countDocuments({ category: id })
        ]);

        if (!category) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Category not found'
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...category,
                productsCount
            }
        });

    } catch (error) {
        console.error('Get category error:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch category'
            },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/categories/[id]
 * Update category
 */
async function updateCategory(req: NextRequest, context: ApiRouteContext, user: SessionUser) {
    try {
        await connectDB();

        // Fix Next.js 15 params issue - await params
        const params = await context.params;
        const id = params?.id as string;

        // Validate ObjectId
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid category ID'
                },
                { status: 400 }
            );
        }

        const body = await req.json();
        const validatedData = updateCategorySchema.parse(body);

        // Check if category exists
        const existingCategory = await Category.findById(id);
        if (!existingCategory) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Category not found'
                },
                { status: 404 }
            );
        }

        // Prepare update data
        const updateData: Record<string, unknown> = { ...validatedData };

        // If name is being updated, generate new slug and check for duplicates
        if (validatedData.name) {
            const slug = validatedData.name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .trim();

            // Check for duplicate name or slug (excluding current category)
            const duplicateCategory = await Category.findOne({
                _id: { $ne: id },
                $or: [
                    { name: { $regex: `^${validatedData.name}$`, $options: 'i' } },
                    { slug }
                ]
            });

            if (duplicateCategory) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Category with this name already exists'
                    },
                    { status: 409 }
                );
            }

            updateData.slug = slug;
        }

        // If image is being updated and we have an old Cloudinary image, delete it
        if (validatedData.image !== undefined && existingCategory.imagePublicId) {
            try {
                await deleteImage(existingCategory.imagePublicId);
            } catch (error) {
                console.error('Failed to delete old image from Cloudinary:', error);
                // Continue with update even if image deletion fails
            }
        }

        // Update category
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            {
                ...updateData,
                updatedBy: user.id // Set the updatedBy field from authenticated admin user
            },
            { new: true, runValidators: true }
        );

        return NextResponse.json({
            success: true,
            message: 'Category updated successfully',
            data: updatedCategory
        });

    } catch (error) {
        console.error('Update category error:', error);

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
                message: 'Failed to update category'
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/categories/[id]
 * Delete category (with product association check)
 */
async function deleteCategory(req: NextRequest, context: ApiRouteContext) {
    try {
        await connectDB();

        // Fix Next.js 15 params issue - await params
        const params = await context.params;
        const id = params?.id as string;

        // Validate ObjectId
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid category ID'
                },
                { status: 400 }
            );
        }

        // Check if category exists
        const category = await Category.findById(id);
        if (!category) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Category not found'
                },
                { status: 404 }
            );
        }

        // Check for associated products
        const productsCount = await Product.countDocuments({ category: id });
        if (productsCount > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Cannot delete category. It has ${productsCount} associated products. Please remove or reassign the products first.`
                },
                { status: 409 }
            );
        }

        // If category has a Cloudinary image, delete it
        if (category.imagePublicId) {
            try {
                await deleteImage(category.imagePublicId);
            } catch (error) {
                console.error('Failed to delete image from Cloudinary:', error);
                // Continue with deletion even if image deletion fails
            }
        }

        // Delete category
        await Category.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        console.error('Delete category error:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to delete category'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const GET = withAdmin(getCategory);
export const PUT = withAdmin(updateCategory);
export const DELETE = withAdmin(deleteCategory);
