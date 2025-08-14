import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify PayPal SDK integration
 */
export async function GET() {
    try {
        // Test the PayPal service
        const { PayPalService } = await import('@/lib/paypal/service');

        // Create a test order request with correct interface
        const testOrderRequest = {
            orderId: 'test-order-id',
            customerName: 'Test Customer',
            customerEmail: 'test@example.com',
            totalAmount: '10.00',
            items: [
                {
                    name: 'Test Product',
                    description: 'Test Product Description',
                    quantity: '1',
                    unitAmount: {
                        currencyCode: 'USD',
                        value: '10.00'
                    }
                }
            ]
        };

        // Test create order
        const result = await PayPalService.createOrder(testOrderRequest);

        return NextResponse.json({
            success: true,
            message: 'PayPal integration working correctly',
            paypalOrderId: result.id
        });

    } catch (error) {
        console.error('PayPal test failed:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
