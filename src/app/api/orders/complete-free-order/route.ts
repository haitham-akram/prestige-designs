import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { z } from 'zod';
import { ItemDeliveryService } from '@/lib/services/itemDeliveryService';

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
        order.orderStatus = 'processing'; // This triggers the delivery logic

        // Add to order history
        order.orderHistory.push({
            status: 'processing',
            timestamp: new Date(),
            note: 'تم بدء معالجة الطلب المجاني تلقائياً',
            changedBy: 'system'
        });

        await order.save();

        // Process item-level delivery using the service
        console.log('📄 Processing item-level delivery for free order');
        const deliveryResult = await ItemDeliveryService.processOrderDelivery(order);

        // Send delivery notifications (THIS IS THE SINGLE SOURCE OF EMAIL SENDING)
        await ItemDeliveryService.sendDeliveryNotifications(order, deliveryResult);

        console.log('✅ Free order completed successfully');
        console.log(`📊 Delivery Summary: ${deliveryResult.autoDeliveredItems} auto-delivered, ${deliveryResult.awaitingCustomizationItems} awaiting customization`);

        return NextResponse.json({
            success: true,
            message: 'Free order completed successfully',
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            deliveryResult: {
                autoDeliveredItems: deliveryResult.autoDeliveredItems,
                awaitingCustomizationItems: deliveryResult.awaitingCustomizationItems,
                totalItems: deliveryResult.totalItems,
                orderCompleted: deliveryResult.orderCompleted
            }
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