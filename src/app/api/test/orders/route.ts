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
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        // Find test orders for this user
        const testOrders = await Order.find({
            customerId: session.user.id,
            orderNumber: { $regex: /^TEST-/ }
        }).sort({ createdAt: -1 }).lean();

        return NextResponse.json({
            success: true,
            orders: testOrders.map(order => ({
                _id: order._id.toString(),
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                totalPrice: order.totalPrice,
                hasCustomizableProducts: order.hasCustomizableProducts,
                paymentStatus: order.paymentStatus,
                orderStatus: order.orderStatus,
                items: order.items
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
