/**
 * PayPal Capture Payment API Route
 * 
 * Captures a PayPal payment and completes the order
 * 
 * Route: POST /api/paypal/capture-payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { PayPalService } from '@/lib/paypal/service';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { z } from 'zod';

// Validation schema
const capturePaymentSchema = z.object({
    paypalOrderId: z.string().min(1, 'PayPal Order ID is required'),
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

        // Parse and validate request body
        const body = await request.json();
        const { paypalOrderId, orderId } = capturePaymentSchema.parse(body);

        console.log('🔄 Capturing PayPal payment:', paypalOrderId);

        await connectDB();

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Verify the order belongs to the user
        if (order.customerId !== session.user.id) {
            return NextResponse.json(
                { error: 'Unauthorized access to order' },
                { status: 403 }
            );
        }

        // Verify PayPal Order ID matches
        if (order.paypalOrderId !== paypalOrderId) {
            return NextResponse.json(
                { error: 'PayPal Order ID mismatch' },
                { status: 400 }
            );
        }

        // Check if order is already paid
        if (order.paymentStatus === 'paid') {
            return NextResponse.json(
                { error: 'Order is already paid' },
                { status: 400 }
            );
        }

        // Capture PayPal payment
        const captureResponse = await PayPalService.capturePayment(paypalOrderId);

        if (captureResponse.status !== 'COMPLETED') {
            return NextResponse.json(
                { error: 'Payment capture failed', status: captureResponse.status },
                { status: 400 }
            );
        }

        // Complete the order
        const updatedOrder = await PayPalService.completeOrder(orderId, captureResponse);

        console.log('✅ Payment captured and order completed');

        return NextResponse.json({
            success: true,
            message: 'Payment completed successfully',
            orderId: updatedOrder._id,
            orderStatus: updatedOrder.orderStatus,
            paymentStatus: updatedOrder.paymentStatus,
            transactionId: captureResponse.transactionId,
            hasCustomizations: updatedOrder.hasCustomizableProducts,
        });

    } catch (error) {
        console.error('❌ Error capturing PayPal payment:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to capture payment' },
            { status: 500 }
        );
    }
}
