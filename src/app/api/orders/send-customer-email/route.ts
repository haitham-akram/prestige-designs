/**
 * Send Customer Email API Route
 * 
 * ⚠️  DEPRECATED: This route should only be used by ItemDeliveryService internally
 * ⚠️  Do NOT call this route directly from frontend or other services
 * 
 * Route: POST /api/orders/send-customer-email
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { z } from 'zod';

interface FileData {
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    fileType?: string;
}

interface ItemData {
    productName: string;
    quantity: number;
}

const sendCustomerEmailSchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    orderNumber: z.string().min(1, 'Order number is required'),
    isFreeOrder: z.boolean().default(false),
    missingCustomization: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
    try {
        // Check authentication - allow both user sessions and system internal calls
        const session = await getServerSession(authOptions);
        const authHeader = request.headers.get('Authorization');
        const isSystemCall = authHeader === 'Bearer system-internal-call';

        // Add caller identification for debugging
        const userAgent = request.headers.get('User-Agent');
        const referer = request.headers.get('Referer');

        console.log('📧 send-customer-email called by:', {
            hasSession: !!session?.user,
            isSystemCall,
            userAgent,
            referer,
            timestamp: new Date().toISOString()
        });

        if (!session?.user && !isSystemCall) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // ⚠️ WARNING: Log if this is being called from non-ItemDeliveryService sources
        if (!isSystemCall && !userAgent?.includes('ItemDeliveryService')) {
            console.warn('⚠️ send-customer-email called directly (not from ItemDeliveryService). This may cause duplicate emails!');
            console.warn('⚠️ Caller details:', { userAgent, referer });
        }

        await connectDB();

        const body = await request.json();
        const { orderId, orderNumber, isFreeOrder, missingCustomization } = sendCustomerEmailSchema.parse(body);

        console.log('📧 Processing email for order:', orderNumber, { isFreeOrder, missingCustomization });

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Check if we already sent an email for this order recently (within 2 minutes)
        const recentEmailHistory = order.orderHistory.filter(entry =>
            entry.status === 'email_sent' &&
            entry.timestamp &&
            (new Date().getTime() - new Date(entry.timestamp).getTime()) < 120000 // 2 minutes
        );

        if (recentEmailHistory.length > 0) {
            console.warn('⚠️ Email already sent recently for this order. Skipping to prevent duplicates.');
            console.warn('Recent email history:', recentEmailHistory);
            return NextResponse.json({
                success: true,
                message: 'Email already sent recently, skipped to prevent duplicates',
                skipped: true
            });
        }

        // Import email service
        const { EmailService } = await import('@/lib/services/emailService');

        if (isFreeOrder) {
            if (missingCustomization) {
                const result = await EmailService.sendFreeOrderMissingCustomizationEmail(
                    order.customerEmail,
                    {
                        orderNumber: order.orderNumber,
                        customerName: order.customerName,
                        orderId: order._id.toString(),
                        createdAt: order.createdAt,
                    }
                );

                if (!result.success) {
                    return NextResponse.json(
                        { error: 'Failed to send email', details: result.error },
                        { status: 500 }
                    );
                }

                order.orderHistory.push({
                    status: 'email_sent',
                    timestamp: new Date(),
                    note: `تم إرسال بريد إلكتروني للعميل: تفاصيل إضافية مطلوبة`,
                    changedBy: 'system'
                });
                await order.save();

                return NextResponse.json({
                    success: true,
                    message: 'Missing customization email sent successfully',
                    messageId: result.messageId
                });

            } else if (order.orderStatus === 'completed' || order.orderStatus === 'outdelivered') {
                const downloadLinks = order.downloadLinks?.map((url: string, index: number) => ({
                    fileName: `Design_File_${index + 1}`,
                    fileUrl: url,
                    fileSize: 0,
                    fileType: 'download'
                })) || [];

                const result = await EmailService.sendOrderCompletedEmail(
                    order.customerEmail,
                    {
                        orderNumber: order.orderNumber,
                        customerName: order.customerName,
                        downloadLinks,
                        downloadExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        totalPrice: 0
                    }
                );

                if (!result.success) {
                    return NextResponse.json(
                        { error: 'Failed to send email', details: result.error },
                        { status: 500 }
                    );
                }

                order.orderHistory.push({
                    status: 'email_sent',
                    timestamp: new Date(),
                    note: `تم إرسال بريد إلكتروني للعميل: طلبك المجاني مكتمل`,
                    changedBy: 'system'
                });
                await order.save();

                return NextResponse.json({
                    success: true,
                    message: 'Free order completed email sent successfully',
                    messageId: result.messageId
                });

            } else {
                const result = await EmailService.sendFreeOrderUnderReviewEmail(
                    order.customerEmail,
                    {
                        orderNumber: order.orderNumber,
                        customerName: order.customerName,
                        orderId: order._id.toString(),
                        createdAt: order.createdAt,
                    }
                );

                if (!result.success) {
                    return NextResponse.json(
                        { error: 'Failed to send email', details: result.error },
                        { status: 500 }
                    );
                }

                order.orderHistory.push({
                    status: 'email_sent',
                    timestamp: new Date(),
                    note: `تم إرسال بريد إلكتروني للعميل: طلبك قيد المراجعة`,
                    changedBy: 'system'
                });
                await order.save();

                return NextResponse.json({
                    success: true,
                    message: 'Free order under review email sent successfully',
                    messageId: result.messageId
                });
            }
        } else {
            // Paid order
            const customWorkItems = order.items?.map((item: ItemData) => ({
                productName: item.productName,
                quantity: item.quantity
            })) || [];

            const result = await EmailService.sendCustomizationProcessingEmail(
                order.customerEmail,
                {
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    customWorkItems: customWorkItems.length > 0 ? customWorkItems : undefined,
                }
            );

            if (!result.success) {
                return NextResponse.json(
                    { error: 'Failed to send email', details: result.error },
                    { status: 500 }
                );
            }

            order.orderHistory.push({
                status: 'email_sent',
                timestamp: new Date(),
                note: `تم إرسال بريد إلكتروني للعميل: معالجة طلبك`,
                changedBy: 'system'
            });
            await order.save();

            return NextResponse.json({
                success: true,
                message: 'Customization processing email sent successfully',
                messageId: result.messageId
            });
        }
    } catch (error) {
        console.error('❌ Error sending customer email:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to send customer email' },
            { status: 500 }
        );
    }
}