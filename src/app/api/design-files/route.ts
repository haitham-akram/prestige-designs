/**
 * Public Design Files API Routes
 * 
 * This file handles public design file access for customers.
 * 
 * Routes:
 * - GET /api/design-files - Get design files for authenticated customer
 * 
 * Features:
 * - Customer authentication required
 * - Order-based access control
 * - Download tracking
 * - File security validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCustomerOrAdmin } from '@/lib/auth/middleware';
import { SessionUser, ApiRouteContext } from '@/lib/auth/types';
import connectDB from '@/lib/db/connection';
import { DesignFile, OrderDesignFile, Order } from '@/lib/db/models';
import { z } from 'zod';

const querySchema = z.object({
    orderId: z.string().optional(),
    productId: z.string().optional(),
    fileType: z.string().optional(),
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('10').transform(Number)
});

/**
 * GET /api/design-files
 * Get design files for authenticated customer
 */
async function getCustomerDesignFiles(req: NextRequest, context: ApiRouteContext, user: SessionUser) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const query = querySchema.parse({
            orderId: searchParams.get('orderId') || undefined,
            productId: searchParams.get('productId') || undefined,
            fileType: searchParams.get('fileType') || undefined,
            page: searchParams.get('page') || '1',
            limit: searchParams.get('limit') || '10'
        });

        const { orderId, productId, fileType, page, limit } = query;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter: Record<string, unknown> = {
            isActive: true
        };

        // If admin, they can access all files
        if (user.role === 'admin') {
            if (productId) {
                filter.productId = productId;
            }
            if (fileType) {
                filter.fileType = fileType;
            }
        } else {
            // For customers, they can only access files from their orders via junction table
            if (orderId) {
                // Verify the order belongs to the customer
                const order = await Order.findOne({
                    _id: orderId,
                    userId: user.id,
                    status: { $in: ['completed', 'paid'] }
                });

                if (!order) {
                    return NextResponse.json(
                        {
                            success: false,
                            message: 'Order not found or access denied'
                        },
                        { status: 404 }
                    );
                }

                // Get design file IDs for this order from junction table
                const orderFiles = await OrderDesignFile.find({
                    orderId,
                    isActive: true
                }).select('designFileId');

                const designFileIds = orderFiles.map(odf => odf.designFileId);

                if (designFileIds.length === 0) {
                    return NextResponse.json({
                        success: true,
                        data: [],
                        pagination: {
                            page,
                            limit,
                            total: 0,
                            pages: 0,
                            hasNext: false,
                            hasPrev: false
                        }
                    });
                }

                filter._id = { $in: designFileIds };
            } else {
                // Get all orders for the customer
                const customerOrders = await Order.find({
                    userId: user.id,
                    status: { $in: ['completed', 'paid'] }
                }).select('_id');

                const orderIds = customerOrders.map(order => order._id);

                if (orderIds.length === 0) {
                    // No orders found, return empty result
                    return NextResponse.json({
                        success: true,
                        data: [],
                        pagination: {
                            page,
                            limit,
                            total: 0,
                            pages: 0,
                            hasNext: false,
                            hasPrev: false
                        }
                    });
                }

                // Get design file IDs for all customer orders from junction table
                const orderFiles = await OrderDesignFile.find({
                    orderId: { $in: orderIds },
                    isActive: true
                }).select('designFileId');

                const designFileIds = orderFiles.map(odf => odf.designFileId);

                if (designFileIds.length === 0) {
                    return NextResponse.json({
                        success: true,
                        data: [],
                        pagination: {
                            page,
                            limit,
                            total: 0,
                            pages: 0,
                            hasNext: false,
                            hasPrev: false
                        }
                    });
                }

                filter._id = { $in: designFileIds };
            }

            if (productId) {
                filter.productId = productId;
            }
            if (fileType) {
                filter.fileType = fileType;
            }
        }

        // Execute query with product lookup
        const [designFiles, total] = await Promise.all([
            DesignFile.aggregate([
                { $match: filter },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'productId',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $addFields: {
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $project: {
                        // Only return necessary fields for customer
                        fileName: 1,
                        fileType: 1,
                        fileSize: 1,
                        description: 1,
                        downloadCount: 1,
                        maxDownloads: 1,
                        expiresAt: 1,
                        isExpired: 1,
                        downloadLimitReached: 1,
                        canDownload: 1,
                        product: 1,
                        createdAt: 1
                    }
                }
            ]),
            DesignFile.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            success: true,
            data: designFiles,
            pagination: {
                page,
                limit,
                total,
                pages: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Get customer design files error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid query parameters',
                    errors: error.issues
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch design files'
            },
            { status: 500 }
        );
    }
}

// Apply middleware and export handlers
export const GET = withCustomerOrAdmin(getCustomerDesignFiles); 