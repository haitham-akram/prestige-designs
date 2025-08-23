// /**
//  * Complete Order API Route
//  * 
//  * This endpoint allows admins to manually mark an order as complete.
//  * 
//  * Route: POST /api/admin/orders/[id]/complete
//  * 
//  * Features:
//  * - Admin-only access control
//  * - Order status update
//  * - Email notification to customer
//  * - Order history tracking
//  */

// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth/config';
// import { Order, OrderDesignFile, DesignFile } from '@/lib/db/models';
// import connectDB from '@/lib/db/connection';

// export async function POST(
//     request: NextRequest,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     try {
//         console.log('🚀 Starting order completion process...');

//         // Check authentication - allow admin OR customer completing their own free order
//         const session = await getServerSession(authOptions);
//         if (!session?.user) {
//             console.log('❌ No authentication found');
//             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//         }

//         await connectDB();
//         console.log('✅ Database connected');

//         const { id: orderId } = await params;
//         console.log('📦 Order ID:', orderId);

//         // Find the order
//         const order = await Order.findById(orderId);
//         if (!order) {
//             console.log('❌ Order not found:', orderId);
//             return NextResponse.json({ error: 'Order not found' }, { status: 404 });
//         }

//         // Parse request body for free order handling (optional)
//         let body = {};
//         try {
//             const requestText = await request.text();
//             if (requestText.trim()) {
//                 body = JSON.parse(requestText);
//             }
//         } catch {
//             // No body or invalid JSON - use empty object as default
//             body = {};
//         }

//         const { isFreeOrder = false, paymentId, payerId, paymentStatus } = body;

//         // Authorization check: Admin can complete any order, customers can only complete their own free orders
//         const isAdmin = session.user.role === 'admin';
//         const isCustomerOwnOrder = session.user.id === order.customerId;
//         const isCustomerFreeOrder = isFreeOrder && order.totalPrice === 0;

//         if (!isAdmin && !(isCustomerOwnOrder && isCustomerFreeOrder)) {
//             console.log('❌ Unauthorized access attempt');
//             console.log('Is Admin:', isAdmin);
//             console.log('Is Customer Own Order:', isCustomerOwnOrder);
//             console.log('Is Free Order:', isCustomerFreeOrder);
//             console.log('Order Total:', order.totalPrice);
//             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//         }

//         console.log('✅ User authenticated:', session.user.email);
//         console.log('✅ Order found:', order.orderNumber);
//         console.log('📋 Current status:', order.orderStatus);

//         // Check if order can be completed
//         if (order.orderStatus === 'completed') {
//             console.log('❌ Order is already completed');
//             return NextResponse.json(
//                 { error: 'Order is already completed' },
//                 { status: 400 }
//             );
//         }

//         if (order.orderStatus === 'cancelled' || order.orderStatus === 'refunded') {
//             console.log('❌ Cannot complete cancelled or refunded order');
//             return NextResponse.json(
//                 { error: 'Cannot complete cancelled or refunded order' },
//                 { status: 400 }
//             );
//         }

//         console.log('💰 Payment info:', { isFreeOrder, paymentId, payerId, paymentStatus });

//         // Check if order has design files (required for regular orders, optional for free orders)
//         const existingOrderDesignFiles = await OrderDesignFile.find({ orderId })
//             .populate<{ designFileId: { _id: string; fileName: string; fileUrl: string; fileSize: number; fileType: string; productId: string; description: string; createdAt: Date } }>('designFileId')
//             .lean();

//         if (existingOrderDesignFiles.length === 0 && !isFreeOrder) {
//             console.log('❌ No design files found for regular order');
//             return NextResponse.json(
//                 { error: 'No design files found for this order' },
//                 { status: 400 }
//             );
//         }

//         // For free orders, automatically create OrderDesignFile records if they don't exist
//         let orderDesignFiles = [...existingOrderDesignFiles];
//         if (isFreeOrder && existingOrderDesignFiles.length === 0) {
//             console.log('🆓 Free order detected with no design files, creating them automatically...');

//             // Get all products in this order
//             const orderProducts = order.items.map(item => item.productId);
//             console.log('🛍️ Order products:', orderProducts);

//             // Find all design files for these products
//             const availableDesignFiles = await DesignFile.find({
//                 productId: { $in: orderProducts }
//             }).lean();

//             console.log(`📁 Found ${availableDesignFiles.length} design files for order products`);

//             if (availableDesignFiles.length > 0) {
//                 // Check for existing OrderDesignFile records to prevent duplicates
//                 const existingRecords = await OrderDesignFile.find({
//                     orderId: order._id,
//                     designFileId: { $in: availableDesignFiles.map(df => df._id) }
//                 }).lean();

//                 const existingDesignFileIds = existingRecords.map(record => record.designFileId.toString());
//                 console.log(`🔍 Found ${existingRecords.length} existing OrderDesignFile records`);

//                 // Create OrderDesignFile records only for files that don't have records yet
//                 const newOrderDesignFiles = [];
//                 for (const designFile of availableDesignFiles) {
//                     if (!existingDesignFileIds.includes(designFile._id.toString())) {
//                         console.log(`📄 Creating OrderDesignFile for: ${designFile.fileName}`);

//                         const orderDesignFile = new OrderDesignFile({
//                             orderId: order._id,
//                             designFileId: designFile._id,
//                             downloadCount: 0,
//                             canDownload: true,
//                             createdAt: new Date()
//                         });

//                         const saved = await orderDesignFile.save();
//                         const populated = await OrderDesignFile.findById(saved._id)
//                             .populate<{ designFileId: { _id: string; fileName: string; fileUrl: string; fileSize: number; fileType: string; productId: string; description: string; createdAt: Date } }>('designFileId')
//                             .lean();

//                         if (populated) {
//                             newOrderDesignFiles.push(populated);
//                         }
//                     } else {
//                         console.log(`⏭️ Skipping duplicate OrderDesignFile for: ${designFile.fileName}`);
//                     }
//                 }

//                 // Combine existing and new records
//                 const allExistingPopulated = await OrderDesignFile.find({
//                     orderId: order._id
//                 }).populate<{ designFileId: { _id: string; fileName: string; fileUrl: string; fileSize: number; fileType: string; productId: string; description: string; createdAt: Date } }>('designFileId')
//                     .lean();

//                 orderDesignFiles = allExistingPopulated;
//                 console.log(`✅ Created ${newOrderDesignFiles.length} new OrderDesignFile records (${orderDesignFiles.length} total)`);
//             }
//         }

//         console.log('✅ Final design files count:', orderDesignFiles.length);

//         // Update order status
//         order.orderStatus = 'completed';
//         order.customizationStatus = isFreeOrder && orderDesignFiles.length === 0 ? 'pending' : 'completed';
//         order.processedAt = new Date();
//         order.processedBy = session.user.id || 'admin';

//         if (isFreeOrder) {
//             // For free orders, set payment info and ensure totalPrice is 0 (not negative)
//             order.paypalTransactionId = paymentId;
//             order.paypalOrderId = payerId;
//             order.paymentStatus = 'free'; // Use 'free' status instead of 'paid' for clarity
//             order.paidAt = new Date();

//             // Ensure totalPrice is 0 for free orders (fix negative values from promo codes)
//             if (order.totalPrice < 0) {
//                 console.log('🔧 Fixing negative totalPrice for free order:', order.totalPrice, '-> 0');
//                 order.totalPrice = 0;
//             }
//         }

//         order.actualDelivery = new Date();
//         order.downloadExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

//         // Add to order history
//         const isCustomerAction = !isAdmin && isCustomerOwnOrder && isCustomerFreeOrder;
//         const historyNote = isCustomerAction
//             ? `تم إكمال الطلب المجاني ${order.orderNumber} بواسطة العميل`
//             : isFreeOrder
//                 ? `تم قبول الطلب المجاني ${order.orderNumber} بنجاح من قبل المدير`
//                 : `تم تحديد الطلب ${order.orderNumber} كمكتمل من قبل المدير`;

//         order.orderHistory.push({
//             status: 'completed',
//             timestamp: new Date(),
//             note: historyNote,
//             changedBy: session.user.name || (isCustomerAction ? 'customer' : 'admin')
//         });

//         await order.save();
//         console.log('✅ Order status updated to completed');

//         // For free orders without OrderDesignFile records, create them automatically
//         if (isFreeOrder && orderDesignFiles.length === 0) {
//             console.log('🔄 Creating OrderDesignFile records for free order...');

//             // Import DesignFile model
//             const { DesignFile } = await import('@/lib/db/models');

//             // Get all active design files for the products in this order
//             const productIds = order.items.map(item => item.productId);
//             console.log('📦 Looking for design files for products:', productIds);

//             const availableDesignFiles = await DesignFile.find({
//                 productId: { $in: productIds },
//                 isActive: true
//             }).lean();

//             console.log('📁 Found available design files:', availableDesignFiles.length);

//             // Create OrderDesignFile records for each design file
//             const newOrderDesignFiles = [];
//             for (const designFile of availableDesignFiles) {
//                 const orderDesignFile = new OrderDesignFile({
//                     orderId: orderId,
//                     designFileId: designFile._id,
//                     status: 'available',
//                     downloadUrl: null,
//                     downloadUrlExpiresAt: null,
//                     createdAt: new Date(),
//                     updatedAt: new Date()
//                 });

//                 await orderDesignFile.save();
//                 newOrderDesignFiles.push(orderDesignFile);
//                 console.log(`✅ Created OrderDesignFile for: ${designFile.fileName}`);
//             }

//             // Re-fetch the orderDesignFiles with populated data for email generation
//             const updatedOrderDesignFiles = await OrderDesignFile.find({ orderId })
//                 .populate<{ designFileId: { _id: string; fileName: string; fileUrl: string; fileSize: number; fileType: string; productId: string; description: string; createdAt: Date } }>('designFileId')
//                 .lean();

//             // Update the orderDesignFiles variable for download link generation
//             orderDesignFiles.push(...updatedOrderDesignFiles);
//             console.log('🎉 OrderDesignFile records created successfully:', newOrderDesignFiles.length);
//         }

//         // Generate download links for email (if design files exist)
//         const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
//         const downloadLinks = orderDesignFiles.map(odf => ({
//             fileName: odf.designFileId.fileName,
//             fileUrl: `${baseUrl}/api/design-files/${odf.designFileId._id}/download`,
//             fileSize: odf.designFileId.fileSize,
//             fileType: odf.designFileId.fileType
//         }));

//         console.log('📧 Download links generated:', downloadLinks.length);

//         // Send completion email to customer
//         try {
//             const { EmailService } = await import('@/lib/services/emailService');

//             if (isFreeOrder) {
//                 // For free orders, use the dedicated free order email template
//                 console.log('📧 Sending free order completion email...');

//                 const emailResult = await EmailService.sendFreeOrderCompletedEmail(
//                     order.customerEmail,
//                     {
//                         orderNumber: order.orderNumber,
//                         customerName: order.customerName,
//                         downloadLinks: downloadLinks.length > 0 ? downloadLinks : undefined
//                     }
//                 );

//                 if (emailResult.success) {
//                     console.log('✅ Free order confirmation email sent successfully');
//                 } else {
//                     console.log('⚠️ Failed to send free order confirmation email:', emailResult.error);
//                 }
//             } else {
//                 // Regular completion email with download links
//                 const emailResult = await EmailService.sendOrderCompletedEmail(
//                     order.customerEmail,
//                     {
//                         orderNumber: order.orderNumber,
//                         customerName: order.customerName,
//                         downloadLinks: downloadLinks,
//                         downloadExpiry: order.downloadExpiry
//                     }
//                 );

//                 if (emailResult.success) {
//                     console.log('✅ Completion email sent successfully');
//                 } else {
//                     console.log('⚠️ Failed to send completion email:', emailResult.error);
//                 }
//             }

//             // Add email sent to order history
//             await Order.findByIdAndUpdate(
//                 orderId,
//                 {
//                     $push: {
//                         orderHistory: {
//                             status: 'email_sent',
//                             timestamp: new Date(),
//                             note: isFreeOrder && downloadLinks.length === 0
//                                 ? 'تم إرسال بريد إلكتروني تأكيد الطلب المجاني إلى العميل'
//                                 : 'تم إرسال بريد إلكتروني إكمال الطلب إلى العميل',
//                             changedBy: session.user.name || 'admin'
//                         }
//                     }
//                 }
//             );

//         } catch (emailError) {
//             console.error('❌ Error sending completion email:', emailError);
//         }

//         console.log('🎉 Order completion process finished!');

//         return NextResponse.json({
//             message: 'Order marked as complete successfully',
//             orderStatus: order.orderStatus,
//             customizationStatus: order.customizationStatus,
//             downloadLinks: downloadLinks,
//             downloadExpiry: order.downloadExpiry
//         });

//     } catch (error) {
//         console.error('Error completing order:', error);
//         return NextResponse.json(
//             { error: 'Internal server error' },
//             { status: 500 }
//         );
//     }
// } 
/**
 * Complete Order API Route
 *
 * This endpoint allows admins to manually mark an order as complete.
 * It now also updates the delivery status of each individual item in the order.
 *
 * Route: POST /api/admin/orders/[id]/complete
 */


import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order, OrderDesignFile, DesignFile } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const { id: orderId } = params;
        const order = await Order.findById(orderId);

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.orderStatus === 'completed') {
            return NextResponse.json({ error: 'Order is already completed' }, { status: 400 });
        }

        const orderDesignFiles = await OrderDesignFile.find({ orderId })
            .populate<{ designFileId: { _id: string; fileName: string; fileUrl: string; fileSize: number; fileType: string; } }>('designFileId')
            .lean();

        if (orderDesignFiles.length === 0) {
            // This check is important for paid orders. For free orders, this might be handled differently,
            // but for a manual admin completion, it's a good safeguard.
            return NextResponse.json({ error: 'Cannot complete an order that has no design files attached.' }, { status: 400 });
        }

        // --- CORE FIX: Update the delivery status for each item ---
        order.items.forEach((item: any) => {
            // Only update items that are not already in a final delivered state
            if (item.deliveryStatus !== 'auto_delivered' && item.deliveryStatus !== 'custom_delivered') {
                item.deliveryStatus = 'custom_delivered';
                item.deliveredAt = new Date();
                item.deliveryNotes = 'تم التسليم يدوياً بواسطة المدير';
            }
        });
        
        // Update the main order status and related fields
        order.orderStatus = 'completed';
        order.customizationStatus = 'completed';
        order.processedAt = new Date();
        order.processedBy = session.user.id || 'admin';
        order.actualDelivery = new Date();
        order.downloadExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days expiry

        // Add a detailed history note
        const historyNote = `تم تحديد الطلب ${order.orderNumber} كمكتمل من قبل المدير`;
        order.orderHistory.push({
            status: 'completed',
            timestamp: new Date(),
            note: historyNote,
            changedBy: session.user.name || 'admin'
        });

        await order.save();
        console.log('✅ Order and all its items have been marked as completed.');

        // Generate download links for the email notification
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const downloadLinks = orderDesignFiles.map(odf => ({
            fileName: odf.designFileId.fileName,
            fileUrl: `${baseUrl}/api/design-files/${odf.designFileId._id}/download`,
            fileSize: odf.designFileId.fileSize,
            fileType: odf.designFileId.fileType
        }));

        // Send completion email to the customer
        try {
            const { EmailService } = await import('@/lib/services/emailService');
            await EmailService.sendOrderCompletedEmail(
                order.customerEmail,
                {
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    downloadLinks: downloadLinks,
                    downloadExpiry: order.downloadExpiry
                }
            );

            // Log the email event in the order history
            order.orderHistory.push({
                status: 'email_sent',
                timestamp: new Date(),
                note: 'تم إرسال بريد إلكتروني لإكمال الطلب إلى العميل',
                changedBy: session.user.name || 'admin'
            });
            await order.save();
        } catch (emailError) {
            console.error('❌ Error sending completion email:', emailError);
            // Don't fail the entire request if the email fails, just log it.
        }

        return NextResponse.json({
            message: 'Order marked as complete successfully',
            order: order,
        });

    } catch (error) {
        console.error('Error completing order:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}