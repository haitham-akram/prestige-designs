/**
 * Complete Free Order API Route
 * 
 * Completes a free order that has no customizable products
 * 
 * Route: POST /api/orders/complete-free-order
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { z } from 'zod';

// Validation schema
const completeFreeOrderSchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
});

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        // Parse request body
        const body = await request.json();
        const { orderId } = completeFreeOrderSchema.parse(body);

        console.log('🎉 Completing free order:', orderId);

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Verify it's a free order
        if (order.totalPrice > 0) {
            return NextResponse.json(
                { error: 'Order is not a free order' },
                { status: 400 }
            );
        }

        // Update order status to mark as free order
        order.paymentStatus = 'free';
        order.paidAt = new Date();

        // Add to order history
        order.orderHistory.push({
            status: 'processing',
            timestamp: new Date(),
            note: 'تم بدء معالجة الطلب المجاني تلقائياً - لا يحتوي على منتجات قابلة للتخصيص',
            changedBy: 'system'
        });

        await order.save();

        // Import required functions
        const { PayPalService } = await import('@/lib/paypal/service');

        // Check delivery type and create design files records
        const deliveryResult = await PayPalService.checkDeliveryType(order);

        if (deliveryResult.deliveryType === 'auto_delivery' && !deliveryResult.requiresCustomWork) {
            // Create OrderDesignFile records for all available files
            const { OrderDesignFile } = await import('@/lib/db/models');

            for (const item of deliveryResult.availableFiles) {
                for (const file of item.files) {
                    await OrderDesignFile.create({
                        orderId: order._id,
                        designFileId: file._id,
                        downloadCount: 0,
                        lastDownloadedAt: null,
                        isActive: true
                    });
                }
            }

            console.log('✅ OrderDesignFiles records created for free order');

            // Now use the order completion service to complete the order and send files
            const { completeOrderAndSendFiles } = await import('@/lib/services/orderCompletionService');
            await completeOrderAndSendFiles(order._id.toString());
        } else {
            // This shouldn't happen for free orders without customizable products
            throw new Error('Free order has customizable products - should not be auto-completed');
        }

        console.log('✅ Free order completed successfully');

        return NextResponse.json({
            success: true,
            message: 'Free order completed successfully',
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus
        });

    } catch (error) {
        console.error('❌ Error completing free order:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to complete free order' },
            { status: 500 }
        );
    }
}
