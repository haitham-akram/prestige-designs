import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';

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

        console.log('🔧 Manual reprocessing order:', order.orderNumber);

        // Manually trigger the complete order process
        const { PayPalService } = await import('@/lib/paypal/service');

        // Mock PayPal data for testing
        const mockPayPalData = {
            id: 'MANUAL_TEST',
            status: 'COMPLETED',
            amount: {
                currencyCode: 'USD',
                value: order.totalPrice.toString()
            },
            transactionId: 'MANUAL_TEST_' + Date.now(),
            payer: {
                name: {
                    givenName: 'Manual',
                    surname: 'Test'
                },
                emailAddress: order.customerEmail
            }
        };

        // Reset order to pending to test the flow
        order.paymentStatus = 'pending';
        (order as { deliveryType?: string }).deliveryType = undefined;
        order.requiresCustomWork = false;
        await order.save();

        console.log('🔄 Triggering complete order process...');
        const completedOrder = await PayPalService.completeOrder(orderId, mockPayPalData);

        return NextResponse.json({
            success: true,
            message: 'Order reprocessed successfully',
            orderNumber: completedOrder.orderNumber,
            deliveryType: completedOrder.deliveryType,
            requiresCustomWork: completedOrder.requiresCustomWork,
            orderStatus: completedOrder.orderStatus
        });

    } catch (error) {
        console.error('❌ Error reprocessing order:', error);
        return NextResponse.json({
            error: 'Failed to reprocess order',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
