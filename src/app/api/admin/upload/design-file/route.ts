/**
 * Admin Design File Upload API Routes
 * 
 * This file handles admin-only design file uploads to Cloudflare R2 storage.
 * All files are now stored in R2 for optimal performance and scalability.
 * 
 * Routes:
 * - POST /api/admin/upload/design-file - Upload a design file to R2
 * 
 * Features:
 * - Admin-only access control
 * - Cloudflare R2 storage (S3-compatible object storage)
 * - File validation and security
 * - Automatic folder structure organization
 * - R2 key-based file tracking
 * - Support for upload-before-product-creation workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import { z } from 'zod';
import { R2Service } from '@/lib/services/r2Service';
import connectDB from '@/lib/db/connection';
import { DesignFile } from '@/lib/db/models';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '500mb',
        },
    },
};

// File upload validation schema
const uploadSchema = z.object({
    fileName: z.string()
        .min(1, 'File name is required')
        .max(255, 'File name cannot exceed 255 characters'),
    fileType: z.enum(['psd', 'ai', 'eps', 'pdf', 'svg', 'zip', 'rar', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']),
    fileSize: z.number()
        .min(1, 'File size must be greater than 0')
        .max(500 * 1024 * 1024, 'File size cannot exceed 500MB'),
    description: z.string()
        .max(500, 'Description cannot exceed 500 characters')
        .nullable()
        .optional()
        .transform(val => val === null ? undefined : val),
    productId: z.string()
        .min(1, 'Product ID is required')
        .or(z.literal('temp')), // Allow "temp" for uploads before product creation
    productSlug: z.string()
        .min(1, 'Product slug is required')
        .regex(/^[a-z0-9-]+$/, 'Product slug can only contain lowercase letters, numbers, and hyphens'),
    colorName: z.string()
        .regex(/^[a-z0-9]+$/, 'Color name can only contain lowercase letters and numbers')
        .nullable()
        .optional()
        .transform(val => val === null ? undefined : val),
    orderId: z.string()
        .optional()
        .nullable()
        .transform(val => val === null || val === '' ? undefined : val)
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

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * POST /api/admin/upload/design-file
 * Upload a design file to Google Drive (or local storage for legacy support)
 */
async function uploadDesignFile(req: NextRequest, _context: ApiRouteContext, user: SessionUser) {
    try {
        console.log('📤 Design file upload request received');

        // Check content type
        const contentType = req.headers.get('content-type');
        if (!contentType || !contentType.includes('multipart/form-data')) {
            return NextResponse.json(
                { success: false, message: 'Request must contain file data' },
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
        const orderId = formData.get('orderId') as string;

        console.log('📋 Upload parameters:', { fileName, fileType, productSlug, colorName, orderId });

        // Validate input
        const validatedData = uploadSchema.parse({
            fileName,
            fileType,
            fileSize: file?.size || 0,
            description,
            productId,
            productSlug,
            colorName,
            orderId
        });

        if (!file) {
            return NextResponse.json(
                { success: false, message: 'No file provided' },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, message: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
                { status: 400 }
            );
        }

        // Validate file type
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (!fileExtension || !ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES]) {
            return NextResponse.json(
                { success: false, message: `Invalid file type. Allowed: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}` },
                { status: 400 }
            );
        }

        if (fileExtension !== validatedData.fileType) {
            return NextResponse.json(
                { success: false, message: `File extension (${fileExtension}) does not match type (${validatedData.fileType})` },
                { status: 400 }
            );
        }

        // Create unique filename
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}_${validatedData.fileName}`;
        const sanitizedFileName = uniqueFileName.replace(/[^a-zA-Z0-9._-]/g, '_');

        // Build folder path based on order or product
        let folderPath: string;
        let isForOrder = false;

        if (orderId) {
            // Order-specific file path: orders/ORDER_NUMBER/product-slug[/color-name]
            isForOrder = true;
            // We'll need to get the order number from DB, for now use orderId
            folderPath = validatedData.colorName
                ? `orders/${orderId}/${validatedData.productSlug}/${validatedData.colorName}`
                : `orders/${orderId}/${validatedData.productSlug}`;
        } else {
            // Product design file path: designs/product-slug[/color-name]
            folderPath = validatedData.colorName
                ? `designs/${validatedData.productSlug}/${validatedData.colorName}`
                : `designs/${validatedData.productSlug}`;
        }

        console.log(`📁 Folder path: ${folderPath}`);

        // Upload based on configuration
        let uploadResult;

        if (R2Service.isConfigured()) {
            console.log('☁️ Uploading to Cloudflare R2...');
            uploadResult = await uploadToR2(
                file,
                sanitizedFileName,
                folderPath,
                validatedData,
                user,
                productId,
                orderId,
                isForOrder
            );
        } else {
            console.log('❌ Cloudflare R2 is not configured');
            return NextResponse.json(
                { success: false, message: 'Cloudflare R2 is not configured. Please contact administrator.' },
                { status: 503 }
            );
        } console.log(`✅ File uploaded successfully: ${sanitizedFileName}`);
        return NextResponse.json(uploadResult, { status: 201 });

    } catch (error) {
        console.error('❌ File upload error:', error);

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
            { success: false, message: 'Failed to upload file' },
            { status: 500 }
        );
    }
}

/**
 * Upload file to R2 and save metadata to database
 */
async function uploadToR2(
    file: File,
    sanitizedFileName: string,
    folderPath: string,
    validatedData: z.infer<typeof uploadSchema>,
    user: SessionUser,
    productId: string,
    orderId: string | undefined,
    isForOrder: boolean
) {
    try {
        // Convert File to Buffer for R2 upload
        const buffer = await file.arrayBuffer();
        const mimeType = ALLOWED_FILE_TYPES[validatedData.fileType as keyof typeof ALLOWED_FILE_TYPES];

        // Upload to R2
        const r2File = await R2Service.uploadFile(
            Buffer.from(buffer),
            sanitizedFileName,
            folderPath,
            mimeType
        );

        console.log(`✅ File uploaded to R2: ${r2File.key}`);

        // Save metadata to database
        await connectDB();

        const designFileData = {
            productId: validatedData.productId === 'temp' ? null : productId, // Handle "temp" productId
            fileName: validatedData.fileName,
            fileUrl: r2File.url,
            fileType: validatedData.fileType,
            fileSize: file.size,
            mimeType: mimeType,
            description: validatedData.description,
            createdBy: user.id,
            isActive: true,
            isPublic: false,
            downloadCount: 0,

            // R2 specific fields
            r2FileKey: r2File.key,
            r2FolderPath: folderPath,
            useR2: true,
            sharedWithEmails: [],

            // Color variant fields
            colorVariantName: validatedData.colorName,
            isColorVariant: !!validatedData.colorName,

            // Order-specific fields
            ...(isForOrder && orderId && { orderId, isForOrder: true })
        };

        const designFile = await DesignFile.create(designFileData);

        return {
            success: true,
            message: 'File uploaded successfully to R2',
            data: {
                fileId: designFile._id,
                r2FileKey: r2File.key,
                fileName: validatedData.fileName,
                fileUrl: designFile.fileUrl,
                fileType: validatedData.fileType,
                fileSize: file.size,
                mimeType: mimeType,
                description: validatedData.description,
                uploadedBy: user.id,
                uploadedAt: new Date().toISOString(),
                useR2: true
            }
        };

    } catch (error) {
        console.error('❌ Error uploading to R2:', error);
        throw error;
    }
}

export const POST = withAdmin(uploadDesignFile);

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout for large file uploads 