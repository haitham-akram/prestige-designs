/**
 * Admin Design File Upload API Routes
 * 
 * This file handles admin-only design file uploads to local server storage.
 * 
 * Routes:
 * - POST /api/admin/upload/design-file - Upload a design file
 * 
 * Features:
 * - Admin-only access control
 * - File validation and security
 * - Local server storage
 * - File organization and naming
 * - Error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { z } from 'zod';

// File upload validation schema
const uploadSchema = z.object({
    fileName: z.string()
        .min(1, 'File name is required')
        .max(255, 'File name cannot exceed 255 characters'),
    fileType: z.enum(['psd', 'ai', 'eps', 'pdf', 'svg', 'zip', 'rar', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']),
    fileSize: z.number()
        .min(1, 'File size must be greater than 0')
        .max(100 * 1024 * 1024, 'File size cannot exceed 100MB'), // 100MB limit
    description: z.string()
        .max(500, 'Description cannot exceed 500 characters')
        .nullable()
        .optional()
        .transform(val => val === null ? undefined : val),
    productId: z.string()
        .min(1, 'Product ID is required'),
    productSlug: z.string()
        .min(1, 'Product slug is required')
        .regex(/^[a-z0-9-]+$/, 'Product slug can only contain lowercase letters, numbers, and hyphens'),
    colorName: z.string()
        .regex(/^[a-z0-9]+$/, 'Color name can only contain lowercase letters and numbers')
        .nullable()
        .optional()
        .transform(val => val === null ? undefined : val)
});

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
    // Design files
    'psd': 'image/vnd.adobe.photoshop',
    'ai': 'application/postscript',
    'eps': 'application/postscript',
    'pdf': 'application/pdf',
    'svg': 'image/svg+xml',
    'zip': 'application/zip',
    'rar': 'application/vnd.rar',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    // Video files
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska'
};

// File size limits (in bytes)
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * POST /api/admin/upload/design-file
 * Upload a design file to local server storage
 */
async function uploadDesignFile(req: NextRequest, _context: ApiRouteContext, user: SessionUser) {
    try {
        // Check if request has file data
        const contentType = req.headers.get('content-type');
        if (!contentType || !contentType.includes('multipart/form-data')) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Request must contain file data'
                },
                { status: 400 }
            );
        }

        // Parse form data
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const fileName = formData.get('fileName') as string;
        const fileType = formData.get('fileType') as string;
        const description = formData.get('description') as string;
        const productId = formData.get('productId') as string;
        const productSlug = formData.get('productSlug') as string;
        const colorName = formData.get('colorName') as string;

        // Debug logging
        console.log('Upload data:', {
            fileName,
            fileType,
            description,
            productId,
            productSlug,
            colorName,
            fileSize: file?.size,
            hasFile: !!file
        });

        // Additional debug logging for validation
        console.log('Validation data:', {
            fileName: typeof fileName,
            fileType: typeof fileType,
            description: typeof description,
            productId: typeof productId,
            productSlug: typeof productSlug + ' - ' + productSlug,
            colorName: typeof colorName + ' - ' + colorName,
            fileSize: typeof file?.size
        });

        // Validate input data
        const validatedData = uploadSchema.parse({
            fileName,
            fileType,
            fileSize: file?.size || 0,
            description,
            productId,
            productSlug,
            colorName
        });

        // Validate file
        if (!file) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'No file provided'
                },
                { status: 400 }
            );
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    success: false,
                    message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
                },
                { status: 400 }
            );
        }

        // Validate file type
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (!fileExtension || !ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES]) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Invalid file type. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`
                },
                { status: 400 }
            );
        }

        // Ensure file type matches expected type
        if (fileExtension !== validatedData.fileType) {
            return NextResponse.json(
                {
                    success: false,
                    message: `File extension (${fileExtension}) does not match expected type (${validatedData.fileType})`
                },
                { status: 400 }
            );
        }

        // Create unique filename
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}_${validatedData.fileName}`;
        const sanitizedFileName = uniqueFileName.replace(/[^a-zA-Z0-9._-]/g, '_');

        // Create directory structure using product slug and color name if provided
        let uploadDir: string;
        let publicUrl: string;

        if (validatedData.colorName) {
            // Color-specific folder structure: /uploads/designs/product-slug/color-name/
            uploadDir = join(process.cwd(), 'public', 'uploads', 'designs', validatedData.productSlug, validatedData.colorName);
            publicUrl = `/uploads/designs/${validatedData.productSlug}/${validatedData.colorName}/${sanitizedFileName}`;
        } else {
            // Regular folder structure: /uploads/designs/product-slug/
            uploadDir = join(process.cwd(), 'public', 'uploads', 'designs', validatedData.productSlug);
            publicUrl = `/uploads/designs/${validatedData.productSlug}/${sanitizedFileName}`;
        }

        const filePath = join(uploadDir, sanitizedFileName);

        // Ensure upload directory exists
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Write file to disk
        await writeFile(filePath, buffer);

        // Return success response
        return NextResponse.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                fileName: validatedData.fileName,
                fileUrl: publicUrl,
                fileType: validatedData.fileType,
                fileSize: file.size,
                mimeType: ALLOWED_FILE_TYPES[validatedData.fileType as keyof typeof ALLOWED_FILE_TYPES],
                description: validatedData.description,
                uploadedBy: user.id,
                uploadedAt: new Date().toISOString()
            }
        }, { status: 201 });

    } catch (error) {
        console.error('File upload error:', error);

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
                message: 'Failed to upload file'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const POST = withAdmin(uploadDesignFile); 