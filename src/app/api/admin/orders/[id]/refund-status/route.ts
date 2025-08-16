import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import Order from '@/lib/db/models/Order';
import connectDB from '@/lib/db/connection';

/**
 * Get detailed refund status for an order
 * This endpoint provides comprehensive refund verification information
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { id: orderId } = await params;

        // Get order with refund information
        const order = await Order.findById(orderId).lean();

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Extract refund-related information from order history
        interface OrderHistoryEntry {
            status: string;
            timestamp: Date;
            note?: string;
            changedBy?: string;
        }

        const refundHistory = order.orderHistory.filter((entry: OrderHistoryEntry) =>
            entry.status === 'refund_processed' ||
            entry.status === 'refunded' ||
            entry.note?.includes('RefundID') ||
            entry.note?.includes('استرداد') ||
            entry.note?.includes('refund')
        );

        // Extract PayPal refund ID from history notes
        let paypalRefundId = null;
        const refundEntry = refundHistory.find((entry: OrderHistoryEntry) =>
            entry.note && entry.note.includes('RefundID:')
        );

        if (refundEntry && refundEntry.note) {
            const match = refundEntry.note.match(/RefundID:\s*([A-Z0-9]+)/);
            if (match) {
                paypalRefundId = match[1];
            }
        }

        // Determine refund status
        let refundStatus = 'not_refunded';
        let refundAmount = null;
        let refundDate = null;

        if (order.paymentStatus === 'refunded') {
            refundStatus = 'fully_refunded';
            refundAmount = order.totalPrice;

            // Find the refund date from history
            const refundProcessedEntry = refundHistory.find((entry: OrderHistoryEntry) =>
                entry.status === 'refund_processed'
            );
            if (refundProcessedEntry) {
                refundDate = refundProcessedEntry.timestamp;
            }
        } else if (refundHistory.length > 0) {
            refundStatus = 'refund_attempted';
        }

        // Verification steps for admin
        const verificationSteps = [
            {
                step: 'order_status_check',
                title: 'فحص حالة الطلب',
                status: order.orderStatus === 'cancelled' ? 'success' : 'warning',
                message: order.orderStatus === 'cancelled'
                    ? 'الطلب ملغي بنجاح'
                    : `حالة الطلب: ${order.orderStatus}`,
                details: `Order Status: ${order.orderStatus}`
            },
            {
                step: 'payment_status_check',
                title: 'فحص حالة الدفع',
                status: order.paymentStatus === 'refunded' ? 'success' :
                    order.paymentStatus === 'paid' ? 'warning' : 'info',
                message: order.paymentStatus === 'refunded'
                    ? 'تم استرداد المبلغ بنجاح'
                    : order.paymentStatus === 'paid'
                        ? 'الطلب مدفوع - لم يتم الاسترداد بعد'
                        : `حالة الدفع: ${order.paymentStatus}`,
                details: `Payment Status: ${order.paymentStatus}`
            },
            {
                step: 'paypal_transaction_check',
                title: 'فحص معرف المعاملة',
                status: order.paypalTransactionId ? 'success' : 'error',
                message: order.paypalTransactionId
                    ? 'معرف المعاملة متوفر'
                    : 'معرف المعاملة غير متوفر',
                details: order.paypalTransactionId || 'No PayPal Transaction ID'
            },
            {
                step: 'refund_id_check',
                title: 'فحص معرف الاسترداد',
                status: paypalRefundId ? 'success' : order.paymentStatus === 'paid' ? 'warning' : 'info',
                message: paypalRefundId
                    ? 'معرف الاسترداد متوفر'
                    : order.paymentStatus === 'paid'
                        ? 'لم يتم العثور على معرف الاسترداد'
                        : 'الطلب لم يكن مدفوعاً',
                details: paypalRefundId || 'No Refund ID found'
            },
            {
                step: 'history_check',
                title: 'فحص سجل الاسترداد',
                status: refundHistory.length > 0 ? 'success' : 'info',
                message: refundHistory.length > 0
                    ? `تم العثور على ${refundHistory.length} إدخال في السجل`
                    : 'لا يوجد سجل للاسترداد',
                details: `${refundHistory.length} refund-related history entries`
            }
        ];

        // PayPal verification instructions
        const paypalVerificationInstructions = {
            title: 'تحقق من PayPal',
            steps: [
                '1. سجل دخولك إلى PayPal Business Account',
                '2. انتقل إلى Activity > All Transactions',
                '3. ابحث عن المعاملة باستخدام Transaction ID: ' + (order.paypalTransactionId || 'N/A'),
                paypalRefundId ? '4. ابحث عن الاسترداد باستخدام Refund ID: ' + paypalRefundId : '4. ابحث عن أي عمليات استرداد مرتبطة',
                '5. تأكد من أن حالة الاسترداد "Completed"'
            ],
            paypalDashboardUrl: process.env.NODE_ENV === 'production'
                ? 'https://www.paypal.com/businessprofile/mytools/activity'
                : 'https://sandbox.paypal.com/businessprofile/mytools/activity'
        };

        return NextResponse.json({
            orderId: order._id,
            orderNumber: order.orderNumber,
            refundStatus,
            refundAmount,
            refundDate,
            paypalTransactionId: order.paypalTransactionId,
            paypalRefundId,
            verificationSteps,
            paypalVerificationInstructions,
            refundHistory: refundHistory.map((entry: OrderHistoryEntry) => ({
                status: entry.status,
                timestamp: entry.timestamp,
                note: entry.note,
                changedBy: entry.changedBy
            })),
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus
        });

    } catch (error) {
        console.error('Error fetching refund status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
