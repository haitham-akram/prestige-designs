/**
 * Send Customer Email API Route
 * 
 * Sends order confirmation email to customer
 * 
 * Route: POST /api/orders/send-customer-email
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { z } from 'zod';

// Types for file and item data
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

// Validation schema
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

        if (!session?.user && !isSystemCall) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        // Parse request body
        const body = await request.json();
        const { orderId, orderNumber, isFreeOrder, missingCustomization } = sendCustomerEmailSchema.parse(body);

        console.log('📧 Sending customer email for order:', orderNumber);

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Import email service
        const { EmailService } = await import('@/lib/services/emailService');

        if (isFreeOrder) {
            if (missingCustomization) {
                // Free order with missing customization data - use emailService
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

                // Log email in order history
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
                // Free order auto-delivered - use the same email as paid completed orders
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
                        downloadExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
                        totalPrice: 0
                    }
                );

                if (!result.success) {
                    return NextResponse.json(
                        { error: 'Failed to send email', details: result.error },
                        { status: 500 }
                    );
                }

                // Log email in order history
                order.orderHistory.push({
                    status: 'email_sent',
                    timestamp: new Date(),
                    note: `تم إرسال بريد إلكتروني للعميل: طلبك المجاني مكتمل (نفس قالب المدفوع)`,
                    changedBy: 'system'
                });
                await order.save();

                return NextResponse.json({
                    success: true,
                    message: 'Free order completed email sent successfully (paid template)',
                    messageId: result.messageId
                });

            } else {
                // Free order under review - use emailService
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

                // Log email in order history
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
            // Paid order - use customization processing email
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

            // Log email in order history
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
