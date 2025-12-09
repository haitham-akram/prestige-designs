/**
 * Link Design Files to Product by R2 Key API Route
 * 
 * This endpoint allows admins to link design files to a product by their R2 file keys.
 * This is the recommended approach as it:
 * - Prevents duplicate files (same file uploaded = same R2 key)
 * - Updates existing files instead of creating new records
 * - Works reliably even if client forgets to track IDs
 * 
 * Routes:
 * - PATCH /api/admin/design-files/link-by-r2key - Link files to product by R2 keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import { z } from 'zod';
import connectDB from '@/lib/db/connection';
import { DesignFile } from '@/lib/db/models';
import mongoose from 'mongoose';

// Schema for linking files to product by R2 keys
const linkByR2KeySchema = z.object({
    productId: z.string()
        .min(1, 'Product ID is required')
        .refine(
            (val) => mongoose.Types.ObjectId.isValid(val),
            'Invalid Product ID format'
        ),
    r2FileKeys: z.array(z.string())
        .min(1, 'At least one R2 file key is required')
        .max(50, 'Cannot link more than 50 files at once'),
    productSlug: z.string()
        .min(1, 'Product slug is required')
        .regex(/^[a-z0-9-]+$/, 'Product slug can only contain lowercase letters, numbers, and hyphens')
});

/**
 * PATCH /api/admin/design-files/link-by-r2key
 * Link design files to a product using their R2 file keys
 */
async function linkFilesByR2Key(
    req: NextRequest,
    _context: ApiRouteContext,
    user: SessionUser
) {
    try {
        const body = await req.json();

        // Validate request body
        const validation = linkByR2KeySchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    details: validation.error.issues
                },
                { status: 400 }
            );
        }

        const { productId, r2FileKeys } = validation.data;

        await connectDB();

        // Check if product exists
        const { Product } = await import('@/lib/db/models');
        const product = await Product.findById(productId);
        if (!product) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Product not found',
                    productId
                },
                { status: 404 }
            );
        }

        // Update all files with matching R2 keys that don't have a product yet
        const updateResult = await DesignFile.updateMany(
            {
                r2FileKey: { $in: r2FileKeys },
                productId: null // Only update unlinked files
            },
            {
                productId: new mongoose.Types.ObjectId(productId),
                updatedBy: user.id,
                updatedAt: new Date()
            }
        );

        console.log(`✅ Linked ${updateResult.modifiedCount} design files to product ${productId} using R2 keys`);

        // Also get information about files that were already linked
        const alreadyLinkedFiles = await DesignFile.find({
            r2FileKey: { $in: r2FileKeys },
            productId: { $ne: null, $ne: new mongoose.Types.ObjectId(productId) }
        });

        return NextResponse.json(
            {
                success: true,
                message: `Successfully linked ${updateResult.modifiedCount} design files to product`,
                data: {
                    productId,
                    productName: product.name,
                    linkedCount: updateResult.modifiedCount,
                    alreadyLinkedCount: alreadyLinkedFiles.length,
                    alreadyLinked: alreadyLinkedFiles.map(f => ({
                        fileName: f.fileName,
                        r2FileKey: f.r2FileKey,
                        currentProductId: f.productId
                    }))
                }
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('❌ Error linking design files to product by R2 key:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to link design files to product',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export const PATCH = withAdmin(linkFilesByR2Key);
