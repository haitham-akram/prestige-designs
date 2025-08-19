import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import Order from '@/lib/db/models/Order';
import connectDB from '@/lib/db/connection';
import { EmailService } from '@/lib/services/emailService';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const orderId = params.id;
        const body = await request.json();
        const { emailType, customMessage } = body;

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Email templates
        const emailTemplates = {
            order_confirmation: {
                subject: `Order Confirmation - ${order.orderNumber}`,
                template: 'order-confirmation',
                data: {
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    totalPrice: order.totalPrice,
                    items: order.items,
                    orderDate: order.createdAt
                }
            },
            order_processing: {
                subject: `Order Processing - ${order.orderNumber}`,
                template: 'order-processing',
                data: {
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    estimatedDelivery: order.estimatedDelivery
                }
            },
            order_completed: {
                subject: `Order Completed - ${order.orderNumber}`,
                template: 'order-completed',
                data: {
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    downloadLinks: order.downloadLinks,
                    downloadExpiry: order.downloadExpiry
                }
            },
            custom_message: {
                subject: `Order Update - ${order.orderNumber}`,
                template: 'custom-message',
                data: {
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    message: customMessage
                }
            }
        };

        const template = emailTemplates[emailType as keyof typeof emailTemplates];
        if (!template) {
            return NextResponse.json(
                { error: 'Invalid email type' },
                { status: 400 }
            );
        }

        let emailResult;

        // Send the actual email using our EmailService
        try {
            switch (emailType) {
                case 'order_completed':
                    // Convert download links from strings to objects
                    const downloadLinksForEmail = (order.downloadLinks || []).map((url: string, index: number) => ({
                        fileName: `design-file-${index + 1}`,
                        fileUrl: url,
                        fileSize: 1024 * 1024, // 1MB default
                        fileType: 'design'
                    }));

                    emailResult = await EmailService.sendOrderCompletedEmail(
                        order.customerEmail,
                        {
                            orderNumber: order.orderNumber,
                            customerName: order.customerName,
                            downloadLinks: downloadLinksForEmail,
                            downloadExpiry: order.downloadExpiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        }
                    );
                    break;
                case 'custom_message':
                    emailResult = await EmailService.sendCustomMessage(
                        order.customerEmail,
                        {
                            orderNumber: order.orderNumber,
                            customerName: order.customerName,
                            subject: template.subject,
                            message: customMessage || 'رسالة مخصصة من إدارة الموقع'
                        }
                    );
                    break;
                default:
                    // For other email types, send custom message with appropriate content
                    emailResult = await EmailService.sendCustomMessage(
                        order.customerEmail,
                        {
                            orderNumber: order.orderNumber,
                            customerName: order.customerName,
                            subject: template.subject,
                            message: customMessage || 'تحديث على حالة طلبك'
                        }
                    );
            }

            if (!emailResult.success) {
                throw new Error(emailResult.error);
            }
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            return NextResponse.json(
                { error: 'Failed to send email', details: emailError },
                { status: 500 }
            );
        }

        // Create email data for database
        const emailData = {
            type: emailType,
            subject: template.subject,
            sentAt: new Date(),
            sentBy: session.user.id || 'admin',
            recipient: order.customerEmail,
            customMessage: customMessage || null,
            messageId: emailResult.messageId
        };

        // Update order with email sent status
        order.emailSent = true;
        order.emailSentAt = new Date();
        order.orderHistory.push({
            status: 'email_sent',
            timestamp: new Date(),
            note: `تم إرسال بريد إلكتروني ${emailType} إلى العميل بنجاح`,
            changedBy: session.user.name || 'admin'
        });

        await order.save();

        return NextResponse.json({
            message: 'Email sent successfully',
            emailData
        });

    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const orderId = params.id;

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Get email history from order history
        const emailHistory = order.orderHistory
            .filter(entry => entry.status === 'email_sent')
            .map(entry => ({
                timestamp: entry.timestamp,
                note: entry.note,
                sentBy: entry.changedBy
            }));

        return NextResponse.json({
            emailSent: order.emailSent,
            emailSentAt: order.emailSentAt,
            emailHistory
        });

    } catch (error) {
        console.error('Error fetching email history:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 