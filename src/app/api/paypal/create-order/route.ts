/**
 * PayPal Create Order API Route
 * 
 * Creates a PayPal order for payment processing
 * 
 * Route: POST /api/paypal/create-order
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { PayPalService } from '@/lib/paypal/service';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { z } from 'zod';

// Validation schema
const createOrderSchema = z.object({
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
        const { orderId } = createOrderSchema.parse(body);

        console.log('🔄 Creating PayPal order for order:', orderId);

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

        // Check if order is already paid
        if (order.paymentStatus === 'paid') {
            return NextResponse.json(
                { error: 'Order is already paid' },
                { status: 400 }
            );
        }

        // Prepare PayPal order items
        const paypalItems = order.items.map(item => ({
            name: item.productName,
            description: `${item.productName} - Quantity: ${item.quantity}`,
            quantity: item.quantity.toString(),
            unitAmount: {
                currencyCode: 'USD',
                value: item.unitPrice.toFixed(2)
            }
        }));

        // Create PayPal order
        const paypalOrderResponse = await PayPalService.createOrder({
            items: paypalItems,
            totalAmount: order.totalPrice.toFixed(2),
            orderId: order._id.toString(),
            customerEmail: order.customerEmail,
            customerName: order.customerName
        });

        // Update order with PayPal order ID
        order.paypalOrderId = paypalOrderResponse.id;
        await order.save();

        console.log('✅ PayPal order created successfully');

        return NextResponse.json({
            success: true,
            paypalOrderId: paypalOrderResponse.id,
            paypalOrderStatus: paypalOrderResponse.status,
            approvalUrl: paypalOrderResponse.links.find(link => link.rel === 'approve')?.href
        });

    } catch (error) {
        console.error('❌ Error creating PayPal order:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create PayPal order' },
            { status: 500 }
        );
    }
}
