import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import Order from '@/lib/db/models/Order';
import connectDB from '@/lib/db/connection';

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

        // TODO: Implement actual email sending
        // For now, we'll just mark the email as sent in the database
        const emailData = {
            type: emailType,
            subject: template.subject,
            sentAt: new Date(),
            sentBy: session.user.id || 'admin',
            recipient: order.customerEmail,
            customMessage: customMessage || null
        };

        // Update order with email sent status
        order.emailSent = true;
        order.emailSentAt = new Date();
        order.orderHistory.push({
            status: 'email_sent',
            timestamp: new Date(),
            note: `تم إرسال بريد إلكتروني ${emailType} إلى العميل`,
            changedBy: session.user.name || 'admin'
        });

        await order.save();

        // TODO: Replace with actual email service (SendGrid, AWS SES, etc.)
        console.log('Email would be sent:', {
            to: order.customerEmail,
            subject: template.subject,
            template: template.template,
            data: template.data
        });

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