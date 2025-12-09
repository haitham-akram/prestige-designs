/**
 * Order Completion Service
 * 
 * This service handles order completion processes including:
 * - Completing orders and sending files
 * - Auto-completion for non-customizable orders
 */

import { Order, OrderDesignFile } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { EmailService } from './emailService';

export async function completeOrderAndSendFiles(orderId: string): Promise<void> {
    try {
        console.log('🔄 Starting order completion process...', orderId);

        await connectDB();

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        // Check if order has design files
        const orderDesignFiles = await OrderDesignFile.find({ orderId })
            .populate<{ designFileId: { _id: string; fileName: string; fileUrl: string; fileSize: number; fileType: string; productId: string; description: string; createdAt: Date } }>('designFileId')
            .lean();

        if (orderDesignFiles.length === 0) {
            console.log('❌ No design files found for order');
            throw new Error('No design files found for this order');
        }

        console.log('✅ Found design files:', orderDesignFiles.length);

        // Update order status
        order.orderStatus = 'completed';
        order.customizationStatus = 'completed';
        order.processedAt = new Date();
        order.actualDelivery = new Date();
        order.downloadExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Add to order history
        order.orderHistory.push({
            status: 'completed',
            timestamp: new Date(),
            note: `تم تحديد الطلب ${order.orderNumber} كمكتمل تلقائياً`,
            changedBy: 'system'
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
                                changedBy: 'system'
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
    } catch (error) {
        console.error('❌ Error completing order:', error);
        throw error;
    }
}
