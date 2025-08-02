/**
 * Delete Uploaded File API Route
 * 
 * This endpoint allows admins to delete uploaded files by their URL.
 * 
 * Route: DELETE /api/admin/upload/delete-file
 * 
 * Features:
 * - Admin-only access control
 * - File deletion from server storage
 * - Security validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import { deleteFile } from '@/lib/utils/fileUtils';
import { z } from 'zod';

// Validation schema
const deleteFileSchema = z.object({
    fileUrl: z.string()
        .min(1, 'File URL is required')
        .startsWith('/uploads/', 'File URL must be a valid upload path')
});

/**
 * DELETE /api/admin/upload/delete-file
 * Delete an uploaded file by its URL
 */
async function deleteUploadedFile(req: NextRequest, context: ApiRouteContext, user: SessionUser) {
    try {
        const body = await req.json();

        // Validate input
        const validationResult = deleteFileSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid input data',
                    errors: validationResult.error.issues
                },
                { status: 400 }
            );
        }

        const { fileUrl } = validationResult.data;

        // Delete the file from storage
        const deleteSuccess = await deleteFile(fileUrl);

        if (deleteSuccess) {
            return NextResponse.json({
                success: true,
                message: 'File deleted successfully'
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Failed to delete file'
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Delete uploaded file error:', error);

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to delete file'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handler
export const DELETE = withAdmin(deleteUploadedFile); 