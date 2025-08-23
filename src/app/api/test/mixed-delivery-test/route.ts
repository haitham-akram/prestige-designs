/**
 * Test Route for Mixed Delivery Scenarios
 * 
 * This route tests the item-level delivery system for mixed orders
 * (some items auto-deliverable, some requiring customization)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { ItemDeliveryService } from '@/lib/services/itemDeliveryService';

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { orderId, testType } = body;

        console.log('🧪 Testing mixed delivery for order:', orderId, 'Type:', testType);

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        console.log('📦 Order items before processing:');
        order.items.forEach((item, index) => {
            console.log(`  Item ${index + 1}: ${item.productName}`);
            console.log(`    EnableCustomizations: ${item.EnableCustomizations}`);
            console.log(`    hasCustomizations: ${item.hasCustomizations}`);
            console.log(`    deliveryStatus: ${item.deliveryStatus}`);
            console.log(`    customizations:`, JSON.stringify(item.customizations, null, 2));
        });

        // Process item-level delivery
        console.log('🔄 Processing item-level delivery...');
        const deliveryResult = await ItemDeliveryService.processOrderDelivery(order);

        console.log('📊 Delivery result:', deliveryResult);

        console.log('📦 Order items after processing:');
        order.items.forEach((item, index) => {
            console.log(`  Item ${index + 1}: ${item.productName}`);
            console.log(`    deliveryStatus: ${item.deliveryStatus}`);
            console.log(`    deliveredAt: ${item.deliveredAt}`);
            console.log(`    deliveryNotes: ${item.deliveryNotes}`);
        });

        console.log('📋 Final order status:', {
            orderStatus: order.orderStatus,
            customizationStatus: order.customizationStatus,
            paymentStatus: order.paymentStatus
        });

        return NextResponse.json({
            success: true,
            orderNumber: order.orderNumber,
            deliveryResult,
            items: order.items.map((item, index) => ({
                index,
                productName: item.productName,
                EnableCustomizations: item.EnableCustomizations,
                hasCustomizations: item.hasCustomizations,
                deliveryStatus: item.deliveryStatus,
                deliveredAt: item.deliveredAt,
                deliveryNotes: item.deliveryNotes
            })),
            orderStatus: order.orderStatus,
            customizationStatus: order.customizationStatus
        });

    } catch (error) {
        console.error('❌ Error in mixed delivery test:', error);
        return NextResponse.json(
            { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
