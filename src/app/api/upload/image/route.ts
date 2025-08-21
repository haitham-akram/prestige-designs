import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import cloudinary, { categoryImageOptions } from '@/lib/cloudinary/config';
import { z } from 'zod';

// Validation schema for upload request
const uploadSchema = z.object({
    image: z.string().min(1, 'Image data is required'),
    folder: z.string().optional().default('prestige-designs'),
    public_id: z.string().optional(),
    transformation: z.object({
        quality: z.string().optional(),
        fetch_format: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        crop: z.string().optional(),
        gravity: z.string().optional()
    }).optional()
});
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};
/**
 * POST /api/upload/image
 * Upload image to Cloudinary
 */
async function uploadImage(req: NextRequest) {
    try {
        const body = await req.json();
        const validatedData = uploadSchema.parse(body);

        // Extract base64 data from the image string
        const base64Data = validatedData.image;

        // Upload to Cloudinary
        const uploadOptions = {
            ...categoryImageOptions,
            ...validatedData.transformation,
            folder: validatedData.folder || categoryImageOptions.folder,
            public_id: validatedData.public_id
        };

        const result = await cloudinary.uploader.upload(base64Data, uploadOptions);

        return NextResponse.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                public_id: result.public_id,
                secure_url: result.secure_url,
                url: result.url,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes
            }
        });

    } catch (error) {
        console.error('Image upload error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid upload data',
                    errors: error.issues
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to upload image'
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/upload/image
 * Delete image from Cloudinary
 */
async function deleteImage(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const publicId = searchParams.get('public_id');

        if (!publicId) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Public ID is required'
                },
                { status: 400 }
            );
        }

        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === 'ok') {
            return NextResponse.json({
                success: true,
                message: 'Image deleted successfully'
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Failed to delete image'
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Image deletion error:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to delete image'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const POST = withAdmin(uploadImage);
export const DELETE = withAdmin(deleteImage); 