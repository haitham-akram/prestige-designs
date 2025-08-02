/**
 * Design File Streaming API Routes
 * 
 * This file handles video streaming for design files with range support.
 * 
 * Routes:
 * - GET /api/design-files/[id]/stream - Stream a video file with range support
 * 
 * Features:
 * - Range request support for video streaming
 * - Proper video headers
 * - Security validation
 * - Access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCustomerOrAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import connectDB from '@/lib/db/connection';
import { DesignFile, OrderDesignFile, Order } from '@/lib/db/models';
import { isVideoFile, getDesignFilePath, fileExists } from '@/lib/utils/fileUtils';
import { createReadStream, statSync } from 'fs';

/**
 * GET /api/design-files/[id]/stream
 * Stream a video file with range support
 */
async function streamDesignFile(req: NextRequest, context: ApiRouteContext, user: SessionUser) {
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

        // Check if file is a video
        if (!isVideoFile(designFile.fileName)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'This endpoint is only for video files'
                },
                { status: 400 }
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

        // Access control based on user role
        if (user.role === 'admin') {
            // Admins can stream any file
        } else {
            // Customers can only stream files from their orders via junction table
            const orderAccess = await OrderDesignFile.findOne({
                designFileId: designFile._id,
                isActive: true
            });

            if (!orderAccess) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Access denied - file not available for streaming'
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
                        message: 'Access denied - streaming access has expired'
                    },
                    { status: 410 }
                );
            }

            // Check download limit for this specific order
            if (designFile.maxDownloads && orderAccess.downloadCount >= designFile.maxDownloads) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Streaming limit reached for this file'
                    },
                    { status: 429 }
                );
            }

            // Increment download count for this specific order
            await orderAccess.incrementDownloads();
        }

        // Get file path
        const filePath = getDesignFilePath(designFile.productId, designFile.fileName.split('/').pop() || '');

        if (!fileExists(filePath)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'File not found on server'
                },
                { status: 404 }
            );
        }

        // Get file stats
        const stats = statSync(filePath);
        const fileSize = stats.size;

        // Handle range requests
        const range = req.headers.get('range');

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            if (start >= fileSize || end >= fileSize) {
                return new NextResponse('Range Not Satisfiable', {
                    status: 416,
                    headers: {
                        'Content-Range': `bytes */${fileSize}`,
                    },
                });
            }

            const file = createReadStream(filePath, { start, end });

            const headers = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize.toString(),
                'Content-Type': designFile.mimeType,
                'Cache-Control': 'public, max-age=31536000',
            };

            return new NextResponse(file as any, {
                status: 206,
                headers,
            });
        } else {
            // Full file request
            const file = createReadStream(filePath);

            const headers = {
                'Content-Length': fileSize.toString(),
                'Content-Type': designFile.mimeType,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=31536000',
            };

            return new NextResponse(file as any, {
                status: 200,
                headers,
            });
        }

    } catch (error) {
        console.error('Stream design file error:', error);

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to stream file'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const GET = withCustomerOrAdmin(streamDesignFile); 