import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { PayPalService } from '@/lib/paypal/service';

export async function POST(request: NextRequest) {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return NextResponse.json({
                error: 'Order ID is required'
            }, { status: 400 });
        }

        await connectDB();

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({
                error: 'Order not found'
            }, { status: 404 });
        }

        console.log('🧪 Manual delivery test for order:', order.orderNumber);

        // Test the delivery type detection manually
        const deliveryResult = await PayPalService.checkDeliveryType(order);

        console.log('📊 Delivery result:', deliveryResult);

        return NextResponse.json({
            success: true,
            orderNumber: order.orderNumber,
            currentDeliveryType: order.deliveryType,
            currentRequiresCustomWork: order.requiresCustomWork,
            testResult: deliveryResult
        });

    } catch (error) {
        console.error('❌ Error testing delivery:', error);
        return NextResponse.json({
            error: 'Failed to test delivery',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
