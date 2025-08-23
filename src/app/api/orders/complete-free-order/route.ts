// /**
//  * Complete Free Order API Route
//  * 
//  * Completes a free order using item-level delivery processing
//  * 
//  * Route: POST /api/orders/complete-free-order
//  */

// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth/config';
// import { Order } from '@/lib/db/models';
// import connectDB from '@/lib/db/connection';
// import { z } from 'zod';
// import { ItemDeliveryService } from '@/lib/services/itemDeliveryService';

// // Validation schema
// const completeFreeOrderSchema = z.object({
//     orderId: z.string().min(1, 'Order ID is required'),
// });

// export async function POST(request: NextRequest) {
//     try {
//         // Check authentication
//         const session = await getServerSession(authOptions);
//         if (!session?.user) {
//             return NextResponse.json(
//                 { error: 'Authentication required' },
//                 { status: 401 }
//             );
//         }

//         await connectDB();

//         // Parse request body
//         const body = await request.json();
//         const { orderId } = completeFreeOrderSchema.parse(body);

//         console.log('🎉 Completing free order:', orderId);

//         // Find the order
//         const order = await Order.findById(orderId);
//         if (!order) {
//             return NextResponse.json(
//                 { error: 'Order not found' },
//                 { status: 404 }
//             );
//         }

//         // Verify it's a free order
//         if (order.totalPrice > 0) {
//             return NextResponse.json(
//                 { error: 'Order is not a free order' },
//                 { status: 400 }
//             );
//         }

//         // Update order status to mark as free order
//         order.paymentStatus = 'free';
//         order.paidAt = new Date();

//         // Add to order history
//         order.orderHistory.push({
//             status: 'processing',
//             timestamp: new Date(),
//             note: 'تم بدء معالجة الطلب المجاني تلقائياً',
//             changedBy: 'system'
//         });

//         await order.save();

//         // Process item-level delivery using the new service
//         console.log('🔄 Processing item-level delivery for free order');
//         const deliveryResult = await ItemDeliveryService.processOrderDelivery(order);

//         // Send delivery notifications
//         await ItemDeliveryService.sendDeliveryNotifications(order, deliveryResult);

//         console.log('✅ Free order completed successfully');
//         console.log(`📊 Delivery Summary: ${deliveryResult.autoDeliveredItems} auto-delivered, ${deliveryResult.awaitingCustomizationItems} awaiting customization`);

//         return NextResponse.json({
//             success: true,
//             message: 'Free order completed successfully',
//             orderNumber: order.orderNumber,
//             orderStatus: order.orderStatus,
//             deliveryResult: {
//                 autoDeliveredItems: deliveryResult.autoDeliveredItems,
//                 awaitingCustomizationItems: deliveryResult.awaitingCustomizationItems,
//                 totalItems: deliveryResult.totalItems,
//                 orderCompleted: deliveryResult.orderCompleted
//             }
//         });

//     } catch (error) {
//         console.error('❌ Error completing free order:', error);

//         if (error instanceof z.ZodError) {
//             return NextResponse.json(
//                 { error: 'Invalid request data', details: error.issues },
//                 { status: 400 }
//             );
//         }

//         return NextResponse.json(
//             { error: 'Failed to complete free order' },
//             { status: 500 }
//         );
//     }
// }
/**
 * Complete Free Order API Route
 *
 * Completes a free order using item-level delivery processing
 *
 * Route: POST /api/orders/complete-free-order
 */

/**
 * Complete Free Order API Route
 *
 * Completes a free order using item-level delivery processing
 *
 * Route: POST /api/orders/complete-free-order
 */

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

        // --- THIS IS THE FIX ---
        // Set the order status to 'processing' to kick off the delivery logic
        // This was the missing step causing the issue.
        order.orderStatus = 'processing';
        // --- END OF FIX ---


        // Add to order history
        order.orderHistory.push({
            status: 'processing',
            timestamp: new Date(),
            note: 'تم بدء معالجة الطلب المجاني تلقائياً',
            changedBy: 'system'
        });

        await order.save();

        // Process item-level delivery using the new service
        console.log('🔄 Processing item-level delivery for free order');
        const deliveryResult = await ItemDeliveryService.processOrderDelivery(order);

        // Send delivery notifications
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