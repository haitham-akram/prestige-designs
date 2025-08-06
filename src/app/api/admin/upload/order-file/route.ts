/**
 * Admin Order File Upload API Routes
 * 
 * This file handles admin-only order file uploads to local server storage.
 * 
 * Routes:
 * - POST /api/admin/upload/order-file - Upload an order file
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
        .min(1, 'File size must be greater than 0'),
    description: z.string()
        .max(500, 'Description cannot exceed 500 characters')
        .nullable()
        .optional()
        .transform(val => val === null ? undefined : val),
    orderNumber: z.string()
        .min(1, 'Order number is required')
        .regex(/^[A-Z0-9-]+$/, 'Order number can only contain uppercase letters, numbers, and hyphens'),
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

/**
 * POST /api/admin/upload/order-file
 * Upload an order file to local server storage
 */
async function uploadOrderFile(req: NextRequest, _context: ApiRouteContext, user: SessionUser) {
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
        const orderNumber = formData.get('orderNumber') as string;
        const productSlug = formData.get('productSlug') as string;
        const colorName = formData.get('colorName') as string;

        // Debug logging
        console.log('Order file upload data:', {
            fileName,
            fileType,
            description,
            orderNumber,
            productSlug,
            colorName,
            fileSize: file?.size,
            hasFile: !!file
        });

        // Validate input data
        const validatedData = uploadSchema.parse({
            fileName,
            fileType,
            fileSize: file?.size || 0,
            description,
            orderNumber,
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

        // Create directory structure: uploads/orders/{orderNumber}/{productSlug}/{colorName?}/
        let uploadDir: string;
        let publicUrl: string;

        if (validatedData.colorName) {
            // Color-specific folder structure: /uploads/orders/{orderNumber}/{productSlug}/{colorName}/
            uploadDir = join(process.cwd(), 'public', 'uploads', 'orders', validatedData.orderNumber, validatedData.productSlug, validatedData.colorName);
            publicUrl = `/uploads/orders/${validatedData.orderNumber}/${validatedData.productSlug}/${validatedData.colorName}/${sanitizedFileName}`;
        } else {
            // Regular folder structure: /uploads/orders/{orderNumber}/{productSlug}/
            uploadDir = join(process.cwd(), 'public', 'uploads', 'orders', validatedData.orderNumber, validatedData.productSlug);
            publicUrl = `/uploads/orders/${validatedData.orderNumber}/${validatedData.productSlug}/${sanitizedFileName}`;
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
                orderNumber: validatedData.orderNumber,
                productSlug: validatedData.productSlug,
                colorName: validatedData.colorName,
                uploadedBy: user.id,
                uploadedAt: new Date().toISOString()
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Order file upload error:', error);

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
export const POST = withAdmin(uploadOrderFile); 