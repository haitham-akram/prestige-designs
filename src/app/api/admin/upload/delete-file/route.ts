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
import { FileUtils } from '@/lib/utils/fileUtils';
import { DesignFile } from '@/lib/db/models';
import { z } from 'zod';

// Validation schema
const deleteFileSchema = z.object({
    fileUrl: z.string()
        .min(1, 'File URL is required')
        .startsWith('/uploads/', 'File URL must be a valid upload path'),
    deleteFromDatabase: z.boolean().optional().default(true)
});

/**
 * DELETE /api/admin/upload/delete-file
 * Delete an uploaded file by its URL
 */
async function deleteUploadedFile(req: NextRequest) {
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

        const { fileUrl, deleteFromDatabase } = validationResult.data;

        let databaseDeleted = true;

        // Delete from database if requested and file exists in database
        if (deleteFromDatabase) {
            try {
                const deletedFile = await DesignFile.findOneAndDelete({ fileUrl });
                if (deletedFile) {
                    console.log(`Deleted file from database: ${fileUrl}`);
                } else {
                    console.log(`File not found in database (may be temporary): ${fileUrl}`);
                }
            } catch (dbError) {
                console.error('Error deleting file from database:', dbError);
                databaseDeleted = false;
            }
        }

        // Delete the file from storage
        const deleteSuccess = await FileUtils.deleteFile(fileUrl);

        if (deleteSuccess && databaseDeleted) {
            return NextResponse.json({
                success: true,
                message: 'File deleted successfully from storage and database'
            });
        } else if (deleteSuccess && !databaseDeleted) {
            return NextResponse.json({
                success: true,
                message: 'File deleted from storage, but failed to delete from database'
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Failed to delete file from storage'
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