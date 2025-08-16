/**
 * API Route: Get Order Details for Success Page
 * 
 * Fetches order details by MongoDB _id and returns the order number and basic info
 * Used by the success page and order details page to display proper order information
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Order from '@/lib/db/models/Order';
import OrderDesignFile from '@/lib/db/models/OrderDesignFile';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DesignFile from '@/lib/db/models/DesignFile';

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

        // Find order by MongoDB _id with populated items
        const order = await Order.findById(orderId)
            .populate('items.productId', 'name description image')

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Get design files for this order
        const orderDesignFiles = await OrderDesignFile.find({
            orderId: order._id
        }).populate('designFileId', 'fileName fileUrl fileType')

        const designFiles = orderDesignFiles.map(odf => {
            // Type assertion to handle populated designFile
            const designFile = odf.designFileId as unknown as { fileName: string; fileUrl: string; fileType: string }
            return {
                fileName: designFile.fileName,
                fileUrl: designFile.fileUrl,
                fileType: designFile.fileType
            }
        })

        // Return order details
        return NextResponse.json({
            success: true,
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                totalPrice: order.totalPrice,
                orderStatus: order.orderStatus,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                items: order.items,
                designFiles: designFiles,
                customerInfo: {
                    name: order.customerName,
                    email: order.customerEmail,
                    phone: '',
                    address: order.paypalAddress?.address || ''
                }
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
