import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import Order from '@/lib/db/models/Order';
import OrderDesignFile from '@/lib/db/models/OrderDesignFile';
import connectDB from '@/lib/db/connection';

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

        // Get order with populated data
        const order = await Order.findById(orderId).lean();

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Get associated design files for this order
        const orderDesignFiles = await OrderDesignFile.find({ orderId: order._id })
            .populate('designFileId')
            .lean();

        return NextResponse.json({
            order,
            designFiles: orderDesignFiles
        });

    } catch (error) {
        console.error('Error fetching order:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(
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
        const body = await request.json();
        const {
            orderStatus,
            adminNotes,
            estimatedDelivery,
            customerNotes
        } = body;

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Update fields
        const updates: any = {};
        const historyEntry: any = {
            timestamp: new Date(),
            changedBy: session.user.name || 'admin'
        };

        if (orderStatus && orderStatus !== order.orderStatus) {
            updates.orderStatus = orderStatus;
            historyEntry.status = orderStatus;
            historyEntry.note = `تم تغيير حالة الطلب إلى ${orderStatus === 'pending' ? 'في الانتظار' : orderStatus === 'processing' ? 'قيد المعالجة' : orderStatus === 'completed' ? 'مكتمل' : orderStatus === 'cancelled' ? 'ملغي' : orderStatus}`;
        }

        if (adminNotes !== undefined) {
            updates.adminNotes = adminNotes;
            if (!historyEntry.status) {
                historyEntry.status = 'note_updated';
                historyEntry.note = 'تم تحديث ملاحظات المدير';
            }
        }

        if (estimatedDelivery !== undefined) {
            updates.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
            if (!historyEntry.status) {
                historyEntry.status = 'delivery_updated';
                historyEntry.note = 'تم تحديث موعد التسليم المتوقع';
            }
        }

        if (customerNotes !== undefined) {
            updates.customerNotes = customerNotes;
            if (!historyEntry.status) {
                historyEntry.status = 'customer_note_updated';
                historyEntry.note = 'تم تحديث ملاحظات العميل';
            }
        }

        // Add to history if there are changes
        if (Object.keys(updates).length > 0) {
            updates.$push = { orderHistory: historyEntry };
        }

        // Update the order
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            updates,
            { new: true, runValidators: true }
        );

        return NextResponse.json({
            message: 'Order updated successfully',
            order: updatedOrder
        });

    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
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

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Soft delete - mark as cancelled instead of actually deleting
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                orderStatus: 'cancelled',
                $push: {
                    orderHistory: {
                        status: 'cancelled',
                        timestamp: new Date(),
                        note: 'تم إلغاء الطلب من قبل المدير',
                        changedBy: session.user.name || 'admin'
                    }
                }
            },
            { new: true }
        );

        // Send cancellation email to customer
        try {
            const { EmailService } = await import('@/lib/services/emailService');

            const emailResult = await EmailService.sendOrderCancelledEmail(
                order.customerEmail,
                {
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    reason: 'تم إلغاء الطلب من قبل المدير'
                }
            );

            if (emailResult.success) {
                console.log('✅ Cancellation email sent successfully');

                // Add email sent to order history
                await Order.findByIdAndUpdate(
                    orderId,
                    {
                        $push: {
                            orderHistory: {
                                status: 'email_sent',
                                timestamp: new Date(),
                                note: 'تم إرسال بريد إلكتروني إلغاء الطلب إلى العميل',
                                changedBy: session.user.name || 'admin'
                            }
                        }
                    }
                );
            } else {
                console.log('⚠️ Failed to send cancellation email:', emailResult.error);
            }
        } catch (emailError) {
            console.error('❌ Error sending cancellation email:', emailError);
        }

        return NextResponse.json({
            message: 'Order cancelled successfully',
            order: updatedOrder
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 