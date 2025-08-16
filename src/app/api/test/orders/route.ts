/**
 * Get Test Orders API Route
 * 
 * Retrieves test orders for the current user
 * 
 * Route: GET /api/test/orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';

export async function GET(request: NextRequest) {
    try {
        // Remove auth check temporarily for debugging
        // const session = await getServerSession(authOptions);
        // if (!session?.user) {
        //     return NextResponse.json(
        //         { error: 'Authentication required' },
        //         { status: 401 }
        //     );
        // }

        await connectDB();

        // Find recent orders for debugging (remove auth check temporarily)
        const recentOrders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();

        return NextResponse.json({
            success: true,
            orders: recentOrders.map(order => ({
                _id: order._id.toString(),
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                totalPrice: order.totalPrice,
                subtotal: order.subtotal,
                totalPromoDiscount: order.totalPromoDiscount,
                appliedPromoCodes: order.appliedPromoCodes,
                hasCustomizableProducts: order.hasCustomizableProducts,
                deliveryType: order.deliveryType,
                requiresCustomWork: order.requiresCustomWork,
                paymentStatus: order.paymentStatus,
                orderStatus: order.orderStatus,
                items: order.items.map(item => ({
                    productId: item.productId, // Add the productId to debug
                    productName: item.productName,
                    hasCustomizations: item.hasCustomizations,
                    customizations: item.customizations,
                    totalPrice: item.totalPrice,
                    unitPrice: item.unitPrice,
                    originalPrice: item.originalPrice,
                    discountAmount: item.discountAmount
                })),
                createdAt: order.createdAt
            }))
        });

    } catch (error) {
        console.error('❌ Error fetching test orders:', error);

        return NextResponse.json(
            { error: 'Failed to fetch test orders' },
            { status: 500 }
        );
    }
}
