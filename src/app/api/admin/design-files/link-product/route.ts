/**
 * Link Design File to Product API Route
 * 
 * This endpoint allows admins to link a previously uploaded design file
 * (that was uploaded with productId: "temp" or null) to a product after
 * the product has been created.
 * 
 * Routes:
 * - PATCH /api/admin/design-files/[fileId]/link-product - Link file to product
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import { z } from 'zod';
import connectDB from '@/lib/db/connection';
import { DesignFile } from '@/lib/db/models';
import mongoose from 'mongoose';

// Schema for linking file to product
const linkSchema = z.object({
    productId: z.string()
        .min(1, 'Product ID is required')
        .refine(
            (val) => mongoose.Types.ObjectId.isValid(val),
            'Invalid Product ID format'
        ),
    productSlug: z.string()
        .min(1, 'Product slug is required')
        .regex(/^[a-z0-9-]+$/, 'Product slug can only contain lowercase letters, numbers, and hyphens')
});

/**
 * PATCH /api/admin/design-files/[fileId]/link-product
 * Link a design file to a product
 */
async function linkFileToProduct(
    req: NextRequest,
    context: ApiRouteContext,
    user: SessionUser
) {
    try {
        const { fileId } = context.params as { fileId: string };

        // Validate fileId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return NextResponse.json(
                { error: 'Invalid file ID format' },
                { status: 400 }
            );
        }

        const body = await req.json();

        // Validate request body
        const validation = linkSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: validation.error.issues
                },
                { status: 400 }
            );
        }

        const { productId } = validation.data;

        await connectDB();

        // Find the design file
        const designFile = await DesignFile.findById(fileId);
        if (!designFile) {
            return NextResponse.json(
                { error: 'Design file not found' },
                { status: 404 }
            );
        }

        // Check if file is already linked to a different product
        if (designFile.productId && designFile.productId.toString() !== productId) {
            return NextResponse.json(
                {
                    error: 'Design file is already linked to another product',
                    currentProductId: designFile.productId
                },
                { status: 400 }
            );
        }

        // Update the design file with the product ID
        designFile.productId = new mongoose.Types.ObjectId(productId);
        designFile.updatedBy = user.id;
        designFile.updatedAt = new Date();

        await designFile.save();

        console.log(`✅ Design file ${fileId} linked to product ${productId}`);

        return NextResponse.json(
            {
                success: true,
                message: 'Design file successfully linked to product',
                data: {
                    fileId: designFile._id,
                    productId: designFile.productId,
                    fileName: designFile.fileName,
                    linkedAt: new Date().toISOString()
                }
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('❌ Error linking design file to product:', error);
        return NextResponse.json(
            {
                error: 'Failed to link design file to product',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export const PATCH = withAdmin(linkFileToProduct);
