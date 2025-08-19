import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { EmailService } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
    try {
        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { emailType, testEmail } = body;

        if (!testEmail) {
            return NextResponse.json(
                { error: 'Test email address is required' },
                { status: 400 }
            );
        }

        let result;

        if (emailType === 'completed') {
            result = await EmailService.sendOrderCompletedEmail(
                testEmail,
                {
                    orderNumber: 'PD-2025-TEST',
                    customerName: 'عميل تجريبي',
                    totalPrice: 89.99,
                    downloadLinks: [
                        {
                            fileName: 'تصميم-تجريبي.psd',
                            fileUrl: 'https://example.com/download/test-file.psd',
                            fileSize: 2048576,
                            fileType: 'application/octet-stream'
                        },
                        {
                            fileName: 'ملف-تجريبي-آخر.ai',
                            fileUrl: 'https://example.com/download/test-file-2.ai',
                            fileSize: 1048576,
                            fileType: 'application/octet-stream'
                        }
                    ],
                    downloadExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            );
        } else if (emailType === 'free_completed') {
            result = await EmailService.sendFreeOrderCompletedEmail(
                testEmail,
                {
                    orderNumber: 'PD-2025-FREE-TEST',
                    customerName: 'عميل تجريبي',
                    downloadLinks: [
                        {
                            fileName: 'تصميم-مجاني.psd',
                            fileUrl: 'https://example.com/download/free-file.psd',
                            fileSize: 1024576,
                            fileType: 'application/octet-stream'
                        }
                    ]
                }
            );
        } else if (emailType === 'free_completed_no_files') {
            result = await EmailService.sendFreeOrderCompletedEmail(
                testEmail,
                {
                    orderNumber: 'PD-2025-FREE-PENDING',
                    customerName: 'عميل تجريبي'
                    // No downloadLinks - this will show the "files coming soon" message
                }
            );
        } else if (emailType === 'cancelled') {
            result = await EmailService.sendOrderCancelledEmail(
                testEmail,
                {
                    orderNumber: 'PD-2025-CANCELLED',
                    customerName: 'عميل تجريبي',
                    totalPrice: 45.50,
                    reason: 'طلب تجريبي للإلغاء - عدم توفر التصميم المطلوب'
                }
            );
        } else if (emailType === 'cancelled_no_reason') {
            result = await EmailService.sendOrderCancelledEmail(
                testEmail,
                {
                    orderNumber: 'PD-2025-CANCELLED-2',
                    customerName: 'عميل تجريبي'
                    // No reason provided
                }
            );
        } else if (emailType === 'custom_message') {
            result = await EmailService.sendCustomMessage(
                testEmail,
                {
                    orderNumber: 'PD-2025-CUSTOM',
                    customerName: 'عميل تجريبي',
                    subject: 'رسالة تجريبية مخصصة',
                    message: 'هذه رسالة تجريبية مخصصة لاختبار قالب الرسائل المخصصة. يمكن استخدام هذا النوع من الرسائل لإرسال تحديثات خاصة أو معلومات إضافية للعملاء.'
                }
            );
        } else if (emailType === 'admin_notification') {
            result = await EmailService.sendAdminNotification(
                testEmail,
                {
                    orderNumber: 'PD-2025-ADMIN-001',
                    customerName: 'خالد التجريبي',
                    customerEmail: 'khalid.test@example.com',
                    customerPhone: '+970595123456',
                    totalPrice: 89.50,
                    items: [
                        {
                            productName: 'تصميم شعار احترافي',
                            quantity: 1,
                            price: 49.99
                        },
                        {
                            productName: 'بطاقة أعمال مع الشعار',
                            quantity: 2,
                            price: 19.75
                        }
                    ],
                    orderType: 'paid'
                }
            );
        } else {
            return NextResponse.json(
                {
                    error: 'Invalid email type. Available types: completed, free_completed, free_completed_no_files, cancelled, cancelled_no_reason, custom_message, admin_notification'
                },
                { status: 400 }
            );
        }

        if (result.success) {
            return NextResponse.json({
                message: 'Test email sent successfully',
                messageId: result.messageId
            });
        } else {
            return NextResponse.json(
                { error: 'Failed to send test email', details: result.error },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error sending test email:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Test email service connection
        const result = await EmailService.testConnection();

        if (result.success) {
            return NextResponse.json({
                message: 'Email service is ready',
                status: 'connected'
            });
        } else {
            return NextResponse.json(
                { error: 'Email service connection failed', details: result.error },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error testing email service:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 