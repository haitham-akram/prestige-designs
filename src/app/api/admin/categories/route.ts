/**
 * Admin Categories API Routes
 * 
 * This file handles admin-only category management operations.
 * 
 * Routes:
 * - GET /api/admin/categories - List all categories with pagination
 * - POST /api/admin/categories - Create a new category
 * 
 * Features:
 * - Admin-only access control
 * - Input validation and sanitization
 * - Pagination support
 * - Search and filtering
 * - Duplicate name checking
 * - Auto-slug generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import connectDB from '@/lib/db/connection';
import { Category } from '@/lib/db/models';
import { z } from 'zod';

// Validation schemas
const createCategorySchema = z.object({
    name: z.string()
        .min(2, 'Category name must be at least 2 characters')
        .max(100, 'Category name cannot exceed 100 characters')
        .trim(),
    description: z.string()
        .max(500, 'Description cannot exceed 500 characters')
        .optional(),
    image: z.string()
        .regex(/\.(jpg|jpeg|png|gif|webp|svg)$/i, 'Image must be a valid image format (jpg, jpeg, png, gif, webp, svg)')
        .optional().or(z.literal(''))
        .or(z.string().regex(/^https:\/\/res\.cloudinary\.com\/.+$/i, 'Invalid Cloudinary URL')),
    imagePublicId: z.string().optional(),
    icon: z.string()
        .max(50, 'Icon name cannot exceed 50 characters')
        .trim()
        .optional(),
    order: z.number()
        .min(0, 'Order cannot be negative')
        .optional()
        .default(0),
    isActive: z.boolean()
        .optional()
        .default(true),
    isFeatured: z.boolean()
        .optional()
        .default(false),
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

const querySchema = z.object({
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('10').transform(Number),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
    isFeatured: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['name', 'createdAt', 'order', 'productsCount', 'viewCount']).optional().default('order'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

/**
 * GET /api/admin/categories
 * List all categories with pagination and filtering
 */
async function getCategories(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const query = querySchema.parse({
            page: searchParams.get('page') || '1',
            limit: searchParams.get('limit') || '10',
            search: searchParams.get('search') || undefined,
            isActive: searchParams.get('isActive') || undefined,
            isFeatured: searchParams.get('isFeatured') || undefined,
            sortBy: searchParams.get('sortBy') || 'order',
            sortOrder: searchParams.get('sortOrder') || 'asc'
        });

        const { page, limit, search, isActive, isFeatured, sortBy, sortOrder } = query;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter: Record<string, unknown> = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        if (isFeatured !== undefined) {
            filter.isFeatured = isFeatured === 'true';
        }        // Build sort object
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute optimized query with products count in single aggregation
        const [categoriesWithCounts, total] = await Promise.all([
            Category.aggregate([
                { $match: filter },
                { $sort: sort },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: 'category',
                        as: 'products'
                    }
                },
                {
                    $addFields: {
                        productsCount: { $size: '$products' }
                    }
                },
                {
                    $project: {
                        products: 0 // Remove the products array, keep only the count
                    }
                }
            ]),
            Category.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            success: true,
            data: categoriesWithCounts,
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
        console.error('Get categories error:', error);

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
                message: 'Failed to fetch categories'
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/categories
 * Create a new category
 */
async function createCategory(req: NextRequest, _context: ApiRouteContext, user: SessionUser) {
    try {
        await connectDB();

        const body = await req.json();
        const validatedData = createCategorySchema.parse(body);

        // Generate slug from name
        const slug = validatedData.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();

        // Check for duplicate name or slug
        const existingCategory = await Category.findOne({
            $or: [
                { name: { $regex: `^${validatedData.name}$`, $options: 'i' } },
                { slug }
            ]
        });

        if (existingCategory) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Category with this name already exists'
                },
                { status: 409 }
            );
        }

        // Create new category with createdBy from authenticated user
        const category = new Category({
            ...validatedData,
            slug,
            createdBy: user.id // Set the createdBy field from authenticated admin user
        });

        await category.save();

        return NextResponse.json(
            {
                success: true,
                message: 'Category created successfully',
                data: category
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Create category error:', error);

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
                message: 'Failed to create category'
            },
            { status: 500 }
        );
    }
}// Apply middleware and export handlers
export const GET = withAdmin(getCategories);
export const POST = withAdmin(createCategory);
