/**
 * Admin New Order Notification API Route
 * 
 * Sends email notifications to admin when new orders are created
 * 
 * POST /api/admin/notify-new-order
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { z } from 'zod';

// Validation schema
const notifySchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    orderNumber: z.string().min(1, 'Order number is required'),
    isFreeOrder: z.boolean().default(false),
    hasCustomizations: z.boolean().default(false),
    autoCompleted: z.boolean().default(false),
    missingCustomization: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
    try {
        console.log('🔔 Processing admin notification request...');

        // Check authentication - allow both user sessions and system internal calls
        const session = await getServerSession(authOptions);
        const authHeader = request.headers.get('Authorization');
        const isSystemCall = authHeader === 'Bearer system-internal-call';

        if (!session?.user && !isSystemCall) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        await connectDB();

        // Parse request body
        const body = await request.json();
        const notificationData = notifySchema.parse(body);

        // Find the order for additional details
        const order = await Order.findById(notificationData.orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Find admin users in database (ignore environment variables for admin emails)
        let adminEmails: string[] = [];
        // Import User model to find admin users
        const { User } = await import('@/lib/db/models');

        try {
            // Find users with admin role who have email notifications enabled

            const adminUsers = await User.find({
                role: 'admin',
                isActive: true,
                isEmailVerified: true,
                'preferences.emailNotifications': true
            }).select('email name preferences').lean();

            if (adminUsers && adminUsers.length > 0) {
                adminEmails = adminUsers.map(admin => admin.email);
                adminUsers.forEach(admin => {
                    console.log(`   - ${admin.name} (${admin.email})`);
                });
            } else {
                // Fallback: try to find any admin users even without notification preferences
                const fallbackAdmins = await User.find({
                    role: 'admin',
                    isActive: true,
                    isEmailVerified: true
                }).select('email name').lean();

                if (fallbackAdmins && fallbackAdmins.length > 0) {
                    adminEmails = fallbackAdmins.map(admin => admin.email);
                    fallbackAdmins.forEach(admin => {
                        console.log(`   - ${admin.name} (${admin.email})`);
                    });
                } else {
                    console.log('❌ No admin users found in database');
                }
            }
        } catch (dbError) {
            console.error('❌ Error searching for admin users:', dbError);
        }

        if (adminEmails.length === 0) {
            console.log('⚠️ No admin emails available (neither environment variable nor admin users found), skipping notification');
            return NextResponse.json({
                message: 'No admin emails available for notifications',
                skipped: true,
                suggestion: 'Set ADMIN_EMAIL environment variable or ensure at least one user has admin role with verified email'
            });
        }

        // Import email service
        const { EmailService } = await import('@/lib/services/emailService');

        // Check if order has customizations for notification logic
        const hasCustomizations = notificationData.hasCustomizations;

        // Determine email content based on order type
        let emailSubject: string
        let emailMessage: string

        if (hasCustomizations) {
            // Order with customizable products - send customization notification
            const orderType = (order.totalPrice <= 0 || order.paymentStatus === 'free') ? 'مجاني' : 'مدفوع';
            const orderTypeIcon = (order.totalPrice <= 0 || order.paymentStatus === 'free') ? '🆓' : '💰';
            const orderTypeColor = (order.totalPrice <= 0 || order.paymentStatus === 'free') ? '#22c55e' : '#3b82f6';

            emailSubject = `� طلب ${orderType} يحتاج تخصيص - ${order.orderNumber}`;
            emailMessage = `
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>طلب يحتاج تخصيص</title>
                </head>
                <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #202028 0%, #252530 100%); direction: rtl;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.2); margin-top: 20px; margin-bottom: 20px;">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #8261c6 0%, #e260ef 100%); padding: 40px 30px; text-align: center; color: white; position: relative;">
                            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 100\" fill=\"white\" opacity=\"0.1\"><polygon points=\"0,0 1000,0 1000,80 0,100\"/></svg>'); background-size: cover;"></div>
                            <div style="position: relative; z-index: 1;">
                                <h1 style="margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🎨 طلب يحتاج تخصيص</h1>
                                <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">طلب جديد مع منتجات قابلة للتخصيص</p>
                            </div>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 40px 30px;">
                            <div style="background: linear-gradient(135deg, #f3f0ff 0%, #e9e5ff 100%); border: 2px solid #8261c6; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(130, 97, 198, 0.2);">
                                <h3 style="color: #8261c6; margin: 0 0 15px 0; font-size: 20px; display: flex; align-items: center;">
                                    <span style="display: inline-block; width: 8px; height: 8px; background: #8261c6; border-radius: 50%; margin-left: 10px;"></span>
                                    ✨ يتطلب مراجعة التخصيصات
                                </h3>
                                <p style="color: #8261c6; margin: 0; font-size: 16px; line-height: 1.6;">هذا الطلب يحتوي على منتجات قابلة للتخصيص تحتاج لمراجعتك والتواصل مع العميل.</p>
                            </div>
                            
                            <h2 style="color: #202028; border-bottom: 3px solid #8261c6; padding-bottom: 15px; margin-bottom: 25px; font-size: 24px;">تفاصيل الطلب</h2>
                            <div style="background: linear-gradient(135deg, #fcebff 0%, #f3e8ff 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #e260ef;">
                                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">رقم الطلب:</strong> <span style="color: #202028; font-weight: 600;">${order.orderNumber}</span></p>
                                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">نوع الطلب:</strong> <span style="color: ${orderTypeColor}; font-weight: bold;">${orderType} ${orderTypeIcon}</span></p>
                                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">الإجمالي:</strong> <span style="color: ${orderTypeColor}; font-weight: bold;">$${order.totalPrice}</span></p>
                                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">العميل:</strong> <span style="color: #202028;">${order.customerName || order.customerEmail}</span></p>
                                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">التاريخ:</strong> <span style="color: #202028;">${new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                            </div>
                            
                            <div style="text-align: center; margin: 35px 0;">
                                <a href="${process.env.NEXTAUTH_URL}/admin/orders/${order._id}" 
                                   style="display: inline-block; background: linear-gradient(135deg, #8261c6 0%, #e260ef 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 18px; margin: 10px; box-shadow: 0 6px 20px rgba(130, 97, 198, 0.4); transition: all 0.3s ease;">
                                    🎨 مراجعة التخصيصات
                                </a>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: linear-gradient(135deg, #202028 0%, #252530 100%); padding: 25px; text-align: center; border-top: 1px solid #3f3f46;">
                            <p style="margin: 0; color: #a1a1aa; font-size: 16px;">إشعار من <strong style="color: #8261c6;">Prestige Designs</strong></p>
                            <p style="margin: 8px 0 0 0; color: #71717a; font-size: 14px;">تم إرسال هذا الإشعار تلقائياً من نظام إدارة الطلبات</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
        } else if (order.totalPrice <= 0 || order.paymentStatus === 'free') {
            // Direct free order (no customizations)
            emailSubject = `🆓 طلب مجاني جديد - ${order.orderNumber}`;
            emailMessage = `
                <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🆓 طلب مجاني جديد</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">طلب جديد تم استلامه</p>
                    </div>
                    
                    <div style="padding: 30px;">
                        <div style="background: #d1fae5; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                            <h3 style="color: #065f46; margin: 0 0 10px 0; font-size: 18px;">� طلب مجاني</h3>
                            <p style="color: #065f46; margin: 0; font-size: 14px;">تم استلام طلب جديد مجاني من العميل.</p>
                        </div>
                        
                        <h2 style="color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">تفاصيل الطلب</h2>
                        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                            <p style="margin: 8px 0; font-size: 16px;"><strong>رقم الطلب:</strong> ${order.orderNumber}</p>
                            <p style="margin: 8px 0; font-size: 16px;"><strong>نوع الطلب:</strong> <span style="color: #22c55e; font-weight: bold;">مجاني 🆓</span></p>
                            <p style="margin: 8px 0; font-size: 16px;"><strong>الإجمالي:</strong> <span style="color: #22c55e; font-weight: bold;">$0.00</span></p>
                            <p style="margin: 8px 0; font-size: 16px;"><strong>العميل:</strong> ${order.customerName || order.customerEmail}</p>
                            <p style="margin: 8px 0; font-size: 16px;"><strong>التاريخ:</strong> ${new Date(order.createdAt).toLocaleDateString('ar-EG')}</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.NEXTAUTH_URL}/admin/orders/${order._id}" 
                               style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; transition: all 0.3s ease;">
                                📋 عرض الطلب
                            </a>
                        </div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="margin: 0; color: #6c757d; font-size: 14px;">تم إرسال هذا الإشعار تلقائياً من نظام إدارة الطلبات</p>
                    </div>
                </div>
            `;
        } else {
            // Direct paid order (no customizations)
            emailSubject = `💰 طلب مدفوع جديد - ${order.orderNumber}`;
            emailMessage = `
                <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">💰 طلب مدفوع جديد</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">تم تأكيد الدفع</p>
                    </div>
                    
                    <div style="padding: 30px;">
                        <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                            <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 18px;">💳 دفع مؤكد</h3>
                            <p style="color: #1e40af; margin: 0; font-size: 14px;">تم تأكيد الدفع وأصبح الطلب جاهز للمعالجة.</p>
                        </div>
                        
                        <h2 style="color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">تفاصيل الطلب</h2>
                        <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                            <p style="margin: 8px 0; font-size: 16px;"><strong>رقم الطلب:</strong> ${order.orderNumber}</p>
                            <p style="margin: 8px 0; font-size: 16px;"><strong>نوع الطلب:</strong> <span style="color: #3b82f6; font-weight: bold;">مدفوع 💰</span></p>
                            <p style="margin: 8px 0; font-size: 16px;"><strong>الإجمالي:</strong> <span style="color: #3b82f6; font-weight: bold;">$${order.totalPrice}</span></p>
                            <p style="margin: 8px 0; font-size: 16px;"><strong>حالة الدفع:</strong> <span style="color: #22c55e; font-weight: bold;">مدفوع ✅</span></p>
                            <p style="margin: 8px 0; font-size: 16px;"><strong>العميل:</strong> ${order.customerName || order.customerEmail}</p>
                            <p style="margin: 8px 0; font-size: 16px;"><strong>التاريخ:</strong> ${new Date(order.createdAt).toLocaleDateString('ar-EG')}</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.NEXTAUTH_URL}/admin/orders/${order._id}" 
                               style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; transition: all 0.3s ease;">
                                🚀 عرض الطلب
                            </a>
                        </div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="margin: 0; color: #6c757d; font-size: 14px;">تم إرسال هذا الإشعار تلقائياً من نظام إدارة الطلبات</p>
                    </div>
                </div>
            `;
        }

        // Send admin notification email to all admin users
        // let emailsSent = 0;
        // const emailErrors: string[] = [];

        // for (const adminEmail of adminEmails) {
        //     try {
        //         const emailResult = await EmailService.sendCustomMessage(
        //             adminEmail,
        //             {
        //                 orderNumber: notificationData.orderNumber,
        //                 customerName: order.customerName,
        //                 subject: emailSubject,
        //                 message: emailMessage
        //             }
        //         );

        //         if (emailResult.success) {
        //             emailsSent++;
        //             console.log(`✅ Admin notification sent successfully to: ${adminEmail}`);
        //         } else {
        //             emailErrors.push(`${adminEmail}: ${emailResult.error}`);
        //             console.log(`⚠️ Failed to send admin notification to ${adminEmail}:`, emailResult.error);
        //         }
        //     } catch (emailError) {
        //         emailErrors.push(`${adminEmail}: ${emailError}`);
        //         console.error(`❌ Error sending admin notification to ${adminEmail}:`, emailError);
        //     }
        // }
        let emailsSent = 0;
        const emailErrors: string[] = [];
        const admin_email = process.env.ADMIN_EMAIL as string;
        try {


            const emailResult = await EmailService.sendCustomMessage(
                admin_email,
                {
                    orderNumber: notificationData.orderNumber,
                    customerName: order.customerName,
                    subject: emailSubject,
                    message: emailMessage
                }
            );

            if (emailResult.success) {
                 emailsSent++
                console.log(`✅ Admin notification sent successfully to: ${admin_email}`);
            } else {
                emailErrors.push(`${admin_email}: ${emailResult.error}`);
                console.log(`⚠️ Failed to send admin notification to ${admin_email}:`, emailResult.error);
            }
        } catch (emailError) {
            emailErrors.push(`${admin_email}: ${emailError}`);
            console.error(`❌ Error sending admin notification to ${admin_email}:`, emailError);
        }

        // // Log notification in order history
        const notificationNote = emailsSent > 0
            ? `تم إرسال إشعار للمدراء (${emailsSent}/${adminEmails.length}): ${emailSubject}`
            : `فشل في إرسال إشعار للمدراء: ${emailSubject}`;

        order.orderHistory.push({
            status: 'admin_notified',
            timestamp: new Date(),
            note: notificationNote,
            changedBy: 'system'
        });
        await order.save();

        // Discord webhook for free orders (paid handled in PayPal service)
        try {
            if (notificationData.isFreeOrder) {
                const { DiscordWebhookService } = await import('@/lib/services/discordWebhookService');
                await DiscordWebhookService.sendPaidOrderNotification({
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    customerEmail: order.customerEmail,
                    totalPrice: 0,
                    currency: 'USD',
                    items: order.items.map(item => ({
                        productName: item.productName || 'Unknown Product',
                        quantity: item.quantity || 1,
                        price: item.unitPrice || item.totalPrice || 0
                    })),
                    paymentMethod: 'Free',
                    orderStatus: order.orderStatus,
                    hasCustomizations: notificationData.hasCustomizations,
                    paidAt: order.createdAt || new Date()
                });
            }
        } catch (discordError) {
            console.error('❌ Error sending Discord webhook for free order:', discordError);
        }

        return NextResponse.json({
            message: emailsSent > 0 ? 'Admin notifications sent successfully' : 'Failed to send admin notifications',
            emailsSent,
            totalAdmins: adminEmails.length,
            emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
            orderType: notificationData.isFreeOrder ? 'free' : 'paid'
        });
    } catch (error) {
        console.error('❌ Error sending admin notification:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to send admin notification' },
            { status: 500 }
        );
    }
}
