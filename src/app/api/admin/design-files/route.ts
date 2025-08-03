/**
 * Admin Design Files API Routes
 * 
 * This file handles admin-only design file management operations.
 * 
 * Routes:
 * - GET /api/admin/design-files - List all design files with pagination
 * - POST /api/admin/design-files - Upload a new design file
 * 
 * Features:
 * - Admin-only access control
 * - File upload and management
 * - Product association
 * - File validation and security
 * - Download tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import connectDB from '@/lib/db/connection';
import { DesignFile, Product } from '@/lib/db/models';
import { z } from 'zod';
import { existsSync } from 'fs';
import { join } from 'path';
import mongoose from 'mongoose';

// Validation schemas
const createDesignFileSchema = z.object({
    productId: z.string()
        .min(1, 'Product ID is required'),
    fileName: z.string()
        .min(1, 'File name is required')
        .max(255, 'File name cannot exceed 255 characters')
        .trim(),
    fileUrl: z.string()
        .min(1, 'File URL is required')
        .refine((val) => {
            // Accept both URLs and local file paths
            return val.startsWith('http') || val.startsWith('/uploads/');
        }, 'Please provide a valid file URL or local path'),
    fileType: z.enum(['psd', 'ai', 'eps', 'pdf', 'svg', 'zip', 'rar', 'png', 'jpg', 'jpeg', 'gif', 'webp']),
    fileSize: z.number()
        .min(1, 'File size must be greater than 0')
        .max(100 * 1024 * 1024, 'File size cannot exceed 100MB'), // 100MB limit
    mimeType: z.string()
        .min(1, 'MIME type is required')
        .trim(),
    description: z.string()
        .max(500, 'Description cannot exceed 500 characters')
        .trim()
        .optional(),
    isPublic: z.boolean()
        .optional()
        .default(false),
    maxDownloads: z.number()
        .min(1, 'Maximum downloads must be at least 1')
        .optional(),
    expiresAt: z.string()
        .datetime('Invalid expiration date')
        .optional()
        .transform(val => val ? new Date(val) : undefined)
});

const querySchema = z.object({
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('10').transform(Number),
    productId: z.string().optional(),
    fileType: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
    isPublic: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['fileName', 'createdAt', 'fileSize', 'downloadCount']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

/**
 * GET /api/admin/design-files
 * List all design files with pagination and filtering
 */
async function getDesignFiles(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const query = querySchema.parse({
            page: searchParams.get('page') || '1',
            limit: searchParams.get('limit') || '10',
            productId: searchParams.get('productId') || undefined,
            fileType: searchParams.get('fileType') || undefined,
            isActive: searchParams.get('isActive') || undefined,
            isPublic: searchParams.get('isPublic') || undefined,
            sortBy: searchParams.get('sortBy') || 'createdAt',
            sortOrder: searchParams.get('sortOrder') || 'desc'
        });

        const { page, limit, productId, fileType, isActive, isPublic, sortBy, sortOrder } = query;
        const skip = (page - 1) * limit;

        console.log('Design Files API Debug:', {
            productId,
            query,
            searchParams: Object.fromEntries(searchParams.entries())
        });

        // Build filter object
        const filter: Record<string, unknown> = {};

        if (productId) {
            // Convert string productId to ObjectId for proper MongoDB query
            try {
                filter.productId = new mongoose.Types.ObjectId(productId);
                console.log('Filter with productId (ObjectId):', filter);
            } catch (error) {
                console.error('Invalid productId format:', productId, error);
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Invalid product ID format'
                    },
                    { status: 400 }
                );
            }
        }

        if (fileType) {
            filter.fileType = fileType;
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        if (isPublic !== undefined) {
            filter.isPublic = isPublic === 'true';
        }

        // Build sort object
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute optimized query with product lookup
        const [designFilesWithProduct, total] = await Promise.all([
            DesignFile.aggregate([
                { $match: filter },
                { $sort: sort },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'productId',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $addFields: {
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]),
            DesignFile.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        console.log('Design Files Query Results:', {
            total,
            designFilesWithProduct,
            filter
        });

        return NextResponse.json({
            success: true,
            data: designFilesWithProduct,
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
        console.error('Get design files error:', error);

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
                message: 'Failed to fetch design files'
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/design-files
 * Upload a new design file
 */
async function createDesignFile(req: NextRequest, _context: ApiRouteContext, user: SessionUser) {
    let requestBody: Record<string, unknown> | null = null;
    try {
        await connectDB();

        const body = await req.json();
        requestBody = body; // Store for error logging
        console.log('Received design file data:', body)

        // Additional validation before schema validation
        if (!body.productId) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Product ID is required'
                },
                { status: 400 }
            );
        }

        if (!body.fileUrl) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'File URL is required'
                },
                { status: 400 }
            );
        }

        const validatedData = createDesignFileSchema.parse(body);

        // Convert productId string to ObjectId
        const mongoose = await import('mongoose');
        let productIdObjectId;
        try {
            productIdObjectId = new mongoose.Types.ObjectId(validatedData.productId);
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid Product ID format'
                },
                { status: 400 }
            );
        }

        // Verify that the product exists
        const product = await Product.findById(productIdObjectId);
        if (!product) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Product with ID ${validatedData.productId} not found`
                },
                { status: 404 }
            );
        }

        // Debug: Check existing design files for this product
        const existingFiles = await DesignFile.find({ productId: validatedData.productId });
        console.log(`Existing design files for product ${validatedData.productId}:`, existingFiles.length);
        if (existingFiles.length > 0) {
            console.log('Sample existing file:', {
                _id: existingFiles[0]._id,
                productId: existingFiles[0].productId,
                productIdType: typeof existingFiles[0].productId
            });
        }

        // Check if there are any design files with string productId that need migration
        const stringProductIdFiles = await DesignFile.find({
            productId: { $type: 'string' }
        });

        if (stringProductIdFiles.length > 0) {
            console.log(`Found ${stringProductIdFiles.length} files with string productId that need migration`);
            // Update them to use ObjectId - this is a one-time migration
            for (const file of stringProductIdFiles) {
                try {
                    const fileProductId = new mongoose.Types.ObjectId(file.productId.toString());
                    await DesignFile.updateOne(
                        { _id: file._id },
                        { $set: { productId: fileProductId } }
                    );
                } catch (error) {
                    console.error('Failed to migrate file:', file._id, error);
                }
            }
            console.log('Migrated string productIds to ObjectId');
        }

        // Check if the file exists at the specified URL
        if (validatedData.fileUrl.startsWith('/uploads/')) {
            const filePath = join(process.cwd(), 'public', validatedData.fileUrl);
            if (!existsSync(filePath)) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `File not found at path: ${validatedData.fileUrl}. Please ensure the file was uploaded successfully.`
                    },
                    { status: 404 }
                );
            }
        }

        // Create new design file
        const designFile = new DesignFile({
            ...validatedData,
            productId: productIdObjectId, // Use the ObjectId
            createdBy: user.id
        });

        await designFile.save();

        // Return the saved design file without populating to avoid virtual field issues
        return NextResponse.json(
            {
                success: true,
                message: 'Design file uploaded successfully',
                data: designFile
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Create design file error:', error);
        console.error('Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        // Log the request body for debugging
        console.error('Request body that caused error:', requestBody);

        if (error instanceof z.ZodError) {
            const errorMessages = error.issues.map(issue =>
                `${issue.path.join('.')}: ${issue.message}`
            ).join(', ');

            return NextResponse.json(
                {
                    success: false,
                    message: `Validation error: ${errorMessages}`,
                    errors: error.issues
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to upload design file',
                error: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const GET = withAdmin(getDesignFiles);
export const POST = withAdmin(createDesignFile); 