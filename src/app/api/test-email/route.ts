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
        } else if (emailType === 'cancelled') {
            result = await EmailService.sendOrderCancelledEmail(
                testEmail,
                {
                    orderNumber: 'PD-2025-TEST',
                    customerName: 'عميل تجريبي',
                    reason: 'طلب تجريبي للإلغاء'
                }
            );
        } else {
            return NextResponse.json(
                { error: 'Invalid email type. Use "completed" or "cancelled"' },
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