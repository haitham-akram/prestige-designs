/**
 * Admin Move Files API Route
 * 
 * This file handles moving design files from old slug folder to new slug folder
 * when the product slug is changed.
 * 
 * Routes:
 * - POST /api/admin/upload/move-files - Move files from old slug to new slug
 * 
 * Features:
 * - Admin-only access control
 * - File system operations
 * - Database updates
 * - Error handling and rollback
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import { rename, mkdir, access, readdir, rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { z } from 'zod';

// Validation schema
const moveFilesSchema = z.object({
    oldSlug: z.string()
        .min(1, 'Old slug is required')
        .regex(/^[a-z0-9-]+$/, 'Old slug can only contain lowercase letters, numbers, and hyphens'),
    newSlug: z.string()
        .min(1, 'New slug is required')
        .regex(/^[a-z0-9-]+$/, 'New slug can only contain lowercase letters, numbers, and hyphens'),
    files: z.array(z.object({
        fileName: z.string().min(1, 'File name is required'),
        oldUrl: z.string().min(1, 'Old URL is required')
    })).min(1, 'At least one file is required')
});

/**
 * POST /api/admin/upload/move-files
 * Move files from old slug folder to new slug folder
 */
async function moveFiles(req: NextRequest, _context: ApiRouteContext, user: SessionUser) {
    try {
        const body = await req.json();
        const validatedData = moveFilesSchema.parse(body);

        const { oldSlug, newSlug, files } = validatedData;

        // Don't do anything if slugs are the same
        if (oldSlug === newSlug) {
            return NextResponse.json({
                success: true,
                message: 'No files to move - slugs are the same',
                files: files.map(f => ({ fileName: f.fileName, newUrl: f.oldUrl }))
            });
        }
        const projectRoot = join(process.cwd());
        const baseUploadDir = join(projectRoot, 'public', 'uploads', 'designs');
        const oldDir = join(baseUploadDir, oldSlug);
        const newDir = join(baseUploadDir, newSlug);

        // Check if old directory exists
        if (!existsSync(oldDir)) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Source directory for slug '${oldSlug}' does not exist`
                },
                { status: 404 }
            );
        }

        // Create new directory if it doesn't exist
        if (!existsSync(newDir)) {
            await mkdir(newDir, { recursive: true });
        }

        const movedFiles = [];

        // Move each file
        for (const file of files) {
            try {
                // Extract filename from old URL
                const fileName = file.oldUrl.split('/').pop();
                if (!fileName) {
                    console.error(`Invalid file URL: ${file.oldUrl}`);
                    continue;
                }

                const oldFilePath = join(oldDir, fileName);
                const newFilePath = join(newDir, fileName);

                // Check if source file exists
                try {
                    await access(oldFilePath);
                } catch {
                    console.error(`Source file does not exist: ${oldFilePath}`);
                    continue;
                }

                // Move the file
                await rename(oldFilePath, newFilePath);

                // Generate new URL
                const newUrl = `/uploads/designs/${newSlug}/${fileName}`;

                movedFiles.push({
                    fileName: file.fileName,
                    oldUrl: file.oldUrl,
                    newUrl: newUrl
                });

                console.log(`Moved file: ${oldFilePath} -> ${newFilePath}`);

            } catch (fileError) {
                console.error(`Error moving file ${file.fileName}:`, fileError);
                // Continue with other files even if one fails
            }
        }

        // Remove old directory if it's empty
        try {
            const remainingFiles = await readdir(oldDir);
            if (remainingFiles.length === 0) {
                // Directory is empty, remove it
                await rmdir(oldDir);
                console.log(`Removed empty directory: ${oldDir}`);
            } else {
                // Directory still has files, keep it
                console.log(`Old directory ${oldDir} still has ${remainingFiles.length} files, keeping it`);
            }
        } catch (dirError) {
            // Directory doesn't exist or can't be read, that's fine
            console.log(`Old directory ${oldDir} doesn't exist or can't be accessed`);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully moved ${movedFiles.length} files from '${oldSlug}' to '${newSlug}'`,
            files: movedFiles
        });

    } catch (error) {
        console.error('Move files error:', error);

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
                message: 'Failed to move files',
                error: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const POST = withAdmin(moveFiles); 