/**
 * Update Order Status API Route
 * 
 * Updates order status and payment status
 * 
 * Route: POST /api/orders/update-status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { z } from 'zod';

// Validation schema
const updateStatusSchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    status: z.enum(['pending', 'processing', 'completed', 'cancelled', 'refunded', 'awaiting_customization', 'under_customization']),
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded', 'free']).optional(),
    deliveryType: z.enum(['auto_delivery', 'custom_work']).optional(),
    note: z.string().optional(),
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
        const { orderId, status, paymentStatus, deliveryType, note } = updateStatusSchema.parse(body);

        console.log('🔄 Updating order status:', { orderId, status, paymentStatus, deliveryType });

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Update order status
        order.orderStatus = status;

        if (paymentStatus) {
            order.paymentStatus = paymentStatus;
        }

        if (deliveryType) {
            order.deliveryType = deliveryType;
            // Also update requiresCustomWork based on deliveryType
            order.requiresCustomWork = deliveryType === 'custom_work';
        }

        // Add to order history
        const historyNote = note || `تم تحديث حالة الطلب إلى: ${status}`;
        order.orderHistory.push({
            status: status,
            timestamp: new Date(),
            note: historyNote,
            changedBy: 'system'
        });

        await order.save();

        console.log('✅ Order status updated successfully');

        return NextResponse.json({
            success: true,
            message: 'Order status updated successfully',
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus
        });

    } catch (error) {
        console.error('❌ Error updating order status:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update order status' },
            { status: 500 }
        );
    }
}
