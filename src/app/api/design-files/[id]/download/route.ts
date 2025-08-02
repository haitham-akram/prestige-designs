/**
 * Design File Download API Routes
 * 
 * This file handles design file downloads for customers.
 * 
 * Routes:
 * - GET /api/design-files/[id]/download - Download a specific design file
 * 
 * Features:
 * - Customer authentication required
 * - Order-based access control
 * - Download tracking
 * - Temporary download URLs
 * - Security validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCustomerOrAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import connectDB from '@/lib/db/connection';
import { DesignFile, OrderDesignFile, Order } from '@/lib/db/models';

/**
 * GET /api/design-files/[id]/download
 * Download a specific design file
 */
async function downloadDesignFile(req: NextRequest, context: ApiRouteContext, user: SessionUser) {
    try {
        await connectDB();

        const { id } = context.params;

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Design file ID is required'
                },
                { status: 400 }
            );
        }

        // Find the design file
        const designFile = await DesignFile.findById(id);
        if (!designFile) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Design file not found'
                },
                { status: 404 }
            );
        }

        // Check if file is active
        if (!designFile.isActive) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Design file is not available'
                },
                { status: 404 }
            );
        }

        // Check if file is expired
        if (designFile.expiresAt && new Date() > designFile.expiresAt) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Design file has expired'
                },
                { status: 410 }
            );
        }

        // Check download limit
        if (designFile.maxDownloads && designFile.downloadCount >= designFile.maxDownloads) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Download limit reached for this file'
                },
                { status: 429 }
            );
        }

        // Access control based on user role
        if (user.role === 'admin') {
            // Admins can download any file
        } else {
            // Customers can only download files from their orders via junction table
            const orderAccess = await OrderDesignFile.findOne({
                designFileId: designFile._id,
                isActive: true
            });

            if (!orderAccess) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Access denied - file not available for download'
                    },
                    { status: 403 }
                );
            }

            // Verify the order belongs to the customer
            const order = await Order.findOne({
                _id: orderAccess.orderId,
                userId: user.id,
                status: { $in: ['completed', 'paid'] }
            });

            if (!order) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Access denied - order not found or not paid'
                    },
                    { status: 403 }
                );
            }

            // Check if this specific order access is expired
            if (orderAccess.isExpired()) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Access denied - download access has expired'
                    },
                    { status: 410 }
                );
            }

            // Check download limit for this specific order
            if (designFile.maxDownloads && orderAccess.downloadCount >= designFile.maxDownloads) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Download limit reached for this file'
                    },
                    { status: 429 }
                );
            }

            // Increment download count for this specific order
            await orderAccess.incrementDownloads();
        }

        // Generate temporary download URL (24 hours)
        const downloadUrl = designFile.generateDownloadUrl(24);

        // Save the updated design file
        await designFile.save();

        return NextResponse.json({
            success: true,
            message: 'Download URL generated successfully',
            data: {
                downloadUrl,
                expiresAt: designFile.downloadUrlExpiresAt,
                fileName: designFile.fileName,
                fileSize: designFile.fileSize,
                fileType: designFile.fileType,
                mimeType: designFile.mimeType,
                downloadCount: designFile.downloadCount + 1
            }
        });

    } catch (error) {
        console.error('Download design file error:', error);

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to generate download URL'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const GET = withCustomerOrAdmin(downloadDesignFile); 