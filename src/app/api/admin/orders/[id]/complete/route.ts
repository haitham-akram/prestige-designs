/**
 * Complete Order API Route
 * 
 * This endpoint allows admins to manually mark an order as complete.
 * 
 * Route: POST /api/admin/orders/[id]/complete
 * 
 * Features:
 * - Admin-only access control
 * - Order status update
 * - Email notification to customer
 * - Order history tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order, OrderDesignFile } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        console.log('🚀 Starting order completion process...');

        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== 'admin') {
            console.log('❌ Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('✅ Admin authenticated:', session.user.email);

        await connectDB();
        console.log('✅ Database connected');

        const { id: orderId } = await params;
        console.log('📦 Order ID:', orderId);

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            console.log('❌ Order not found:', orderId);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        console.log('✅ Order found:', order.orderNumber);
        console.log('📋 Current status:', order.orderStatus);

        // Check if order can be completed
        if (order.orderStatus === 'completed') {
            console.log('❌ Order is already completed');
            return NextResponse.json(
                { error: 'Order is already completed' },
                { status: 400 }
            );
        }

        if (order.orderStatus === 'cancelled' || order.orderStatus === 'refunded') {
            console.log('❌ Cannot complete cancelled or refunded order');
            return NextResponse.json(
                { error: 'Cannot complete cancelled or refunded order' },
                { status: 400 }
            );
        }

        // Check if order has design files
        const orderDesignFiles = await OrderDesignFile.find({ orderId })
            .populate<{ designFileId: { _id: string; fileName: string; fileUrl: string; fileSize: number; fileType: string; productId: string; description: string; createdAt: Date } }>('designFileId')
            .lean();

        if (orderDesignFiles.length === 0) {
            console.log('❌ No design files found for order');
            return NextResponse.json(
                { error: 'No design files found for this order' },
                { status: 400 }
            );
        }

        console.log('✅ Found design files:', orderDesignFiles.length);

        // Update order status
        order.orderStatus = 'completed';
        order.customizationStatus = 'completed';
        order.processedAt = new Date();
        order.processedBy = session.user.id || 'admin';
        order.actualDelivery = new Date();
        order.downloadExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Add to order history
        order.orderHistory.push({
            status: 'completed',
            timestamp: new Date(),
            note: `تم تحديد الطلب ${order.orderNumber} كمكتمل من قبل المدير`,
            changedBy: session.user.name || 'admin'
        });

        await order.save();
        console.log('✅ Order status updated to completed');

        // Generate download links for email
        const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
        const downloadLinks = orderDesignFiles.map(odf => ({
            fileName: odf.designFileId.fileName,
            fileUrl: `${baseUrl}/api/design-files/${odf.designFileId._id}/download`,
            fileSize: odf.designFileId.fileSize,
            fileType: odf.designFileId.fileType
        }));

        console.log('📧 Download links generated:', downloadLinks.length);

        // Send completion email to customer
        try {
            const { EmailService } = await import('@/lib/services/emailService');

            const emailResult = await EmailService.sendOrderCompletedEmail(
                order.customerEmail,
                {
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    downloadLinks: downloadLinks,
                    downloadExpiry: order.downloadExpiry
                }
            );

            if (emailResult.success) {
                console.log('✅ Completion email sent successfully');

                // Add email sent to order history
                await Order.findByIdAndUpdate(
                    orderId,
                    {
                        $push: {
                            orderHistory: {
                                status: 'email_sent',
                                timestamp: new Date(),
                                note: 'تم إرسال بريد إلكتروني إكمال الطلب إلى العميل',
                                changedBy: session.user.name || 'admin'
                            }
                        }
                    }
                );
            } else {
                console.log('⚠️ Failed to send completion email:', emailResult.error);
            }
        } catch (emailError) {
            console.error('❌ Error sending completion email:', emailError);
        }

        console.log('🎉 Order completion process finished!');

        return NextResponse.json({
            message: 'Order marked as complete successfully',
            orderStatus: order.orderStatus,
            customizationStatus: order.customizationStatus,
            downloadLinks: downloadLinks,
            downloadExpiry: order.downloadExpiry
        });

    } catch (error) {
        console.error('Error completing order:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 