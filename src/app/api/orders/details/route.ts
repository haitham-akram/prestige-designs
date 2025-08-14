/**
 * API Route: Get Order Details for Success Page
 * 
 * Fetches order details by MongoDB _id and returns the order number and basic info
 * Used by the success page to display proper order information
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Order from '@/lib/db/models/Order';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json(
                { error: 'Order ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find order by MongoDB _id
        const order = await Order.findById(orderId).select('orderNumber customerName customerEmail totalPrice status createdAt');

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Return order details
        return NextResponse.json({
            success: true,
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                totalPrice: order.totalPrice,
                status: order.status,
                createdAt: order.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Error fetching order details:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
