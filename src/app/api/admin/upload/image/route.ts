/**
 * Admin Image Upload API Routes
 * 
 * This file handles admin-only image upload operations.
 * 
 * Routes:
 * - POST /api/admin/upload/image - Upload multiple images via FormData
 * 
 * Features:
 * - Admin-only access control
 * - Multipart form data handling
 * - Multiple image upload support
 * - Cloudinary integration
 * - Image validation and optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import cloudinary, { categoryImageOptions } from '@/lib/cloudinary/config';

/**
 * POST /api/admin/upload/image
 * Upload multiple images via FormData
 */
async function uploadImages(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('file');

        if (!files || files.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'No images provided'
                },
                { status: 400 }
            );
        }

        const uploadPromises = files.map(async (file) => {
            if (!(file instanceof File)) {
                throw new Error('Invalid file type');
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                throw new Error(`Invalid file type: ${file.type}`);
            }

            // Validate file size (max 20MB for high quality)
            if (file.size > 20 * 1024 * 1024) {
                throw new Error(`File too large: ${file.name}`);
            }

            // Convert file to base64
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64String = `data:${file.type};base64,${buffer.toString('base64')}`;

            // Upload to Cloudinary
            const uploadOptions = {
                ...categoryImageOptions,
                folder: 'prestige-designs/products',
                public_id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };

            const result = await cloudinary.uploader.upload(base64String, uploadOptions);

            return {
                originalName: file.name,
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                size: result.bytes
            };
        });

        const results = await Promise.all(uploadPromises);

        return NextResponse.json({
            success: true,
            message: `${results.length} image(s) uploaded successfully`,
            urls: results.map(result => result.url),
            data: results
        });

    } catch (error) {
        console.error('Image upload error:', error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to upload images'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const POST = withAdmin(uploadImages); 