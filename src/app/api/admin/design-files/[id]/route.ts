/**
 * Admin Design File Operations API Routes
 * 
 * This file handles admin-only operations on individual design files.
 * 
 * Routes:
 * - GET /api/admin/design-files/[id] - Get a specific design file
 * - PUT /api/admin/design-files/[id] - Update a specific design file
 * - DELETE /api/admin/design-files/[id] - Delete a specific design file
 * 
 * Features:
 * - Admin-only access control
 * - File management operations
 * - Download tracking
 * - Security validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import connectDB from '@/lib/db/connection';
import { DesignFile, Product } from '@/lib/db/models';
import { deleteFile } from '@/lib/utils/fileUtils';
import { z } from 'zod';

// Validation schemas
const updateDesignFileSchema = z.object({
    fileName: z.string()
        .min(1, 'File name is required')
        .max(255, 'File name cannot exceed 255 characters')
        .trim()
        .optional(),
    fileUrl: z.string()
        .url('Please provide a valid file URL')
        .optional(),
    fileType: z.enum(['psd', 'ai', 'eps', 'pdf', 'svg', 'zip', 'rar', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']).optional(),
    fileSize: z.number()
        .min(1, 'File size must be greater than 0')
        .max(100 * 1024 * 1024, 'File size cannot exceed 100MB')
        .optional(),
    mimeType: z.string()
        .min(1, 'MIME type is required')
        .trim()
        .optional(),
    description: z.string()
        .max(500, 'Description cannot exceed 500 characters')
        .trim()
        .optional(),
    isActive: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    maxDownloads: z.number()
        .min(1, 'Maximum downloads must be at least 1')
        .optional(),
    expiresAt: z.string()
        .datetime('Invalid expiration date')
        .optional()
        .transform(val => val ? new Date(val) : undefined)
});

/**
 * GET /api/admin/design-files/[id]
 * Get a specific design file by ID
 */
async function getDesignFile(req: NextRequest, context: ApiRouteContext) {
    try {
        await connectDB();

        const { id } = context.params;

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Design file ID is required'
                },
                { status: 400 }
            );
        }

        const designFile = await DesignFile.findById(id).populate('productId', 'name slug');

        if (!designFile) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Design file not found'
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: designFile
        });

    } catch (error) {
        console.error('Get design file error:', error);

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch design file'
            },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/design-files/[id]
 * Update a specific design file
 */
async function updateDesignFile(req: NextRequest, context: ApiRouteContext, user: SessionUser) {
    try {
        await connectDB();

        const { id } = context.params;

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Design file ID is required'
                },
                { status: 400 }
            );
        }

        const body = await req.json();
        const validatedData = updateDesignFileSchema.parse(body);

        // Check if design file exists
        const existingDesignFile = await DesignFile.findById(id);
        if (!existingDesignFile) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Design file not found'
                },
                { status: 404 }
            );
        }

        // Update design file
        const updatedDesignFile = await DesignFile.findByIdAndUpdate(
            id,
            {
                ...validatedData,
                updatedBy: user.id
            },
            { new: true, runValidators: true }
        ).populate('productId', 'name slug');

        return NextResponse.json({
            success: true,
            message: 'Design file updated successfully',
            data: updatedDesignFile
        });

    } catch (error) {
        console.error('Update design file error:', error);

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
                message: 'Failed to update design file'
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/design-files/[id]
 * Delete a specific design file
 */
async function deleteDesignFile(req: NextRequest, context: ApiRouteContext, user: SessionUser) {
    try {
        await connectDB();

        const { id } = context.params;

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Design file ID is required'
                },
                { status: 400 }
            );
        }

        // Check if design file exists
        const designFile = await DesignFile.findById(id);
        if (!designFile) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Design file not found'
                },
                { status: 404 }
            );
        }

        // Check if design file is associated with any orders via junction table
        const { OrderDesignFile } = await import('@/lib/db/models');
        const orderAccess = await OrderDesignFile.findOne({ designFileId: designFile._id });

        if (orderAccess) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Cannot delete design file that is associated with an order'
                },
                { status: 400 }
            );
        }

        // Delete the actual file from storage if it's a local file
        if (designFile.fileUrl.startsWith('/uploads/')) {
            await deleteFile(designFile.fileUrl);
        }

        // Soft delete by setting isActive to false
        await DesignFile.findByIdAndUpdate(id, {
            isActive: false,
            updatedBy: user.id
        });

        return NextResponse.json({
            success: true,
            message: 'Design file deleted successfully'
        });

    } catch (error) {
        console.error('Delete design file error:', error);

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to delete design file'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const GET = withAdmin(getDesignFile);
export const PUT = withAdmin(updateDesignFile);
export const DELETE = withAdmin(deleteDesignFile); 