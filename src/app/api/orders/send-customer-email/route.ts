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

        // Prepare email content
        const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';

        let emailSubject: string = '';
        let emailMessage: string = '';

        if (isFreeOrder) {
            if (missingCustomization) {
                // Free order with missing customization data
                emailSubject = `⚠️ طلبك المجاني يحتاج تفاصيل إضافية - ${order.orderNumber}`;
                emailMessage = `
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>تفاصيل إضافية مطلوبة</title>
                    </head>
                    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #202028 0%, #252530 100%); direction: rtl;">
                        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.2); margin-top: 20px; margin-bottom: 20px;">
                            <!-- Header -->
                            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; color: white; position: relative;">
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 100\" fill=\"white\" opacity=\"0.1\"><polygon points=\"0,0 1000,0 1000,80 0,100\"/></svg>'); background-size: cover;"></div>
                                <div style="position: relative; z-index: 1;">
                                    <div style="margin-bottom: 20px;">
                                        <img src="${baseUrl}/site/logo.png" alt="Prestige Designs" style="max-height: 60px; width: auto; background: transparent;">
                                    </div>
                                    <h1 style="margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">⚠️ تفاصيل إضافية مطلوبة</h1>
                                    <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">نحتاج منك إضافة تفاصيل التخصيص</p>
                                </div>
                            </div>
                            
                            <!-- Content -->
                            <div style="padding: 40px 30px;">
                                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);">
                                    <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 20px; display: flex; align-items: center;">
                                        <span style="display: inline-block; width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; margin-left: 10px;"></span>
                                        تفاصيل التخصيص مطلوبة
                                    </h3>
                                    <p style="color: #92400e; margin: 0; font-size: 16px; line-height: 1.6;">طلبك يحتوي على منتجات قابلة للتخصيص، لكن لم يتم إضافة تفاصيل التخصيص المطلوبة. يرجى إضافة التفاصيل أو سيتواصل معك فريقنا لاستلام المتطلبات.</p>
                                </div>
                                
                                <h2 style="color: #202028; border-bottom: 3px solid #8261c6; padding-bottom: 15px; margin-bottom: 25px; font-size: 24px;">تفاصيل الطلب</h2>
                                <div style="background: linear-gradient(135deg, #fcebff 0%, #f3e8ff 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #e260ef;">
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">رقم الطلب:</strong> <span style="color: #202028; font-weight: 600;">${order.orderNumber}</span></p>
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">نوع الطلب:</strong> <span style="background: linear-gradient(135deg, #22c55e, #16a34a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold; font-size: 16px;">مجاني 🆓</span></p>
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">حالة الطلب:</strong> <span style="color: #f59e0b; font-weight: bold;">في انتظار التخصيصات ⚠️</span></p>
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">التاريخ:</strong> <span style="color: #202028;">${new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                                </div>
                                
                                <div style="text-align: center; margin: 35px 0;">
                                    <a href="${baseUrl}/customer/orders/${order._id}" 
                                       style="display: inline-block; background: linear-gradient(135deg, #8261c6 0%, #e260ef 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 18px; margin: 10px; box-shadow: 0 6px 20px rgba(130, 97, 198, 0.4); transition: all 0.3s ease;">
                                        📝 إضافة تفاصيل التخصيص
                                    </a>
                                </div>
                            </div>
                            
                            <!-- Footer -->
                            <div style="background: linear-gradient(135deg, #202028 0%, #252530 100%); padding: 25px; text-align: center; border-top: 1px solid #3f3f46;">
                                <p style="margin: 0; color: #a1a1aa; font-size: 16px;">شكراً لاختيارك <strong style="color: #8261c6;">Prestige Designs</strong></p>
                                <p style="margin: 8px 0 0 0; color: #71717a; font-size: 14px;">نحن هنا لخدمتك دائماً</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
            } else if (order.orderStatus === 'completed') {
            } else if (order.orderStatus === 'completed') {
                // Free order completed
                emailSubject = `✅ طلبك المجاني مكتمل - ${order.orderNumber}`;
                emailMessage = `
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>طلبك مكتمل</title>
                    </head>
                    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #202028 0%, #252530 100%); direction: rtl;">
                        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.2); margin-top: 20px; margin-bottom: 20px;">
                            <!-- Header -->
                            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; text-align: center; color: white; position: relative;">
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 100\" fill=\"white\" opacity=\"0.1\"><polygon points=\"0,0 1000,0 1000,80 0,100\"/></svg>'); background-size: cover;"></div>
                                <div style="position: relative; z-index: 1;">
                                    <div style="margin-bottom: 20px;">
                                        <img src="${baseUrl}/site/logo.png" alt="Prestige Designs" style="max-height: 60px; width: auto; background: transparent; border-radius: 8px;">
                                    </div>
                                    <h1 style="margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🎉 طلبك مكتمل!</h1>
                                    <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">جاهز للتحميل الآن</p>
                                </div>
                            </div>
                            
                            <!-- Content -->
                            <div style="padding: 40px 30px;">
                                <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border: 2px solid #22c55e; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.2);">
                                    <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 20px; display: flex; align-items: center;">
                                        <span style="display: inline-block; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; margin-left: 10px;"></span>
                                        تم إكمال طلبك المجاني
                                    </h3>
                                    <p style="color: #065f46; margin: 0; font-size: 16px; line-height: 1.6;">ملفاتك جاهزة الآن للتحميل من لوحة التحكم الخاصة بك. يمكنك تحميلها في أي وقت خلال الـ 30 يوماً القادمة.</p>
                                </div>
                                
                                <h2 style="color: #202028; border-bottom: 3px solid #8261c6; padding-bottom: 15px; margin-bottom: 25px; font-size: 24px;">تفاصيل الطلب</h2>
                                <div style="background: linear-gradient(135deg, #fcebff 0%, #f3e8ff 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #e260ef;">
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">رقم الطلب:</strong> <span style="color: #202028; font-weight: 600;">${order.orderNumber}</span></p>
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">نوع الطلب:</strong> <span style="background: linear-gradient(135deg, #22c55e, #16a34a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold; font-size: 16px;">مجاني 🆓</span></p>
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">حالة الطلب:</strong> <span style="color: #22c55e; font-weight: bold;">مكتمل ✅</span></p>
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">التاريخ:</strong> <span style="color: #202028;">${new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                                </div>
                                
                                <div style="text-align: center; margin: 35px 0;">
                                    <a href="${baseUrl}/customer/orders/${order._id}" 
                                       style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 18px; margin: 10px; box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4); transition: all 0.3s ease;">
                                        📥 تحميل الملفات
                                    </a>
                                </div>
                            </div>
                            
                            <!-- Footer -->
                            <div style="background: linear-gradient(135deg, #202028 0%, #252530 100%); padding: 25px; text-align: center; border-top: 1px solid #3f3f46;">
                                <p style="margin: 0; color: #a1a1aa; font-size: 16px;">شكراً لاختيارك <strong style="color: #8261c6;">Prestige Designs</strong></p>
                                <p style="margin: 8px 0 0 0; color: #71717a; font-size: 14px;">نحن هنا لخدمتك دائماً</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
            } else {
                emailSubject = `📋 طلبك المجاني قيد المراجعة - ${order.orderNumber}`;
                emailMessage = `
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>طلبك قيد المراجعة</title>
                    </head>
                    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #202028 0%, #252530 100%); direction: rtl;">
                        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.2); margin-top: 20px; margin-bottom: 20px;">
                            <!-- Header -->
                            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; color: white; position: relative;">
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 100\" fill=\"white\" opacity=\"0.1\"><polygon points=\"0,0 1000,0 1000,80 0,100\"/></svg>'); background-size: cover;"></div>
                                <div style="position: relative; z-index: 1;">
                                    <div style="margin-bottom: 20px;">
                                        <img src="${baseUrl}/site/logo.png" alt="Prestige Designs" style="max-height: 60px; width: auto; background: transparent; border-radius: 8px;">
                                    </div>
                                    <h1 style="margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">📋 طلبك قيد المراجعة</h1>
                                    <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">سنتواصل معك قريباً</p>
                                </div>
                            </div>
                        
                            <div style="padding: 40px 30px;">
                                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);">
                                    <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 20px; display: flex; align-items: center;">
                                        <span style="display: inline-block; width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; margin-left: 10px;"></span>
                                        🔍 قيد المراجعة
                                    </h3>
                                    <p style="color: #92400e; margin: 0; font-size: 16px; line-height: 1.6;">طلبك يحتوي على تخصيصات تحتاج لمراجعة فريقنا. سنتواصل معك قريباً بالتفاصيل.</p>
                                </div>
                            
                                <h2 style="color: #202028; border-bottom: 3px solid #8261c6; padding-bottom: 15px; margin-bottom: 25px; font-size: 24px;">تفاصيل الطلب</h2>
                                <div style="background: linear-gradient(135deg, #fcebff 0%, #f3e8ff 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #e260ef;">
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">رقم الطلب:</strong> <span style="color: #202028; font-weight: 600;">${order.orderNumber}</span></p>
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">نوع الطلب:</strong> <span style="background: linear-gradient(135deg, #22c55e, #16a34a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold; font-size: 16px;">مجاني 🆓</span></p>
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">حالة الطلب:</strong> <span style="color: #f59e0b; font-weight: bold;">قيد المراجعة 📋</span></p>
                                    <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">التاريخ:</strong> <span style="color: #202028;">${new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                                </div>
                            
                                <div style="text-align: center; margin: 35px 0;">
                                    <a href="${baseUrl}/customer/orders" 
                                       style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 18px; margin: 10px; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); transition: all 0.3s ease;">
                                        📋 متابعة طلباتي
                                    </a>
                                </div>
                            </div>
                        
                            <!-- Footer -->
                            <div style="background: linear-gradient(135deg, #202028 0%, #252530 100%); padding: 25px; text-align: center; border-top: 1px solid #3f3f46;">
                                <p style="margin: 0; color: #a1a1aa; font-size: 16px;">شكراً لاختيارك <strong style="color: #8261c6;">Prestige Designs</strong></p>
                                <p style="margin: 8px 0 0 0; color: #71717a; font-size: 14px;">نحن هنا لخدمتك دائماً</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
            }
        } else {
            // Paid order
            emailSubject = `✅ تأكيد طلبك - ${order.orderNumber}`;
            emailMessage = `
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>تأكيد طلبك</title>
                </head>
                <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #202028 0%, #252530 100%); direction: rtl;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.2); margin-top: 20px; margin-bottom: 20px;">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: white; position: relative;">
                            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 100\" fill=\"white\" opacity=\"0.1\"><polygon points=\"0,0 1000,0 1000,80 0,100\"/></svg>'); background-size: cover;"></div>
                            <div style="position: relative; z-index: 1;">
                                <div style="margin-bottom: 20px;">
                                    <img src="${baseUrl}/site/logo.png" alt="Prestige Designs" style="max-height: 60px; width: auto; background: transparent; border-radius: 8px;">
                                </div>
                                <h1 style="margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">✅ تم تأكيد طلبك!</h1>
                                <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">تم استلام الدفع</p>
                            </div>
                        </div>
                    
                        <div style="padding: 40px 30px;">
                            <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);">
                                <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 20px; display: flex; align-items: center;">
                                    <span style="display: inline-block; width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; margin-left: 10px;"></span>
                                    💳 تم تأكيد الدفع
                                </h3>
                                <p style="color: #1e40af; margin: 0; font-size: 16px; line-height: 1.6;">تم استلام دفعتك بنجاح وسنبدأ في معالجة طلبك فوراً.</p>
                            </div>
                        
                            <h2 style="color: #202028; border-bottom: 3px solid #8261c6; padding-bottom: 15px; margin-bottom: 25px; font-size: 24px;">تفاصيل الطلب</h2>
                            <div style="background: linear-gradient(135deg, #fcebff 0%, #f3e8ff 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #e260ef;">
                                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">رقم الطلب:</strong> <span style="color: #202028; font-weight: 600;">${order.orderNumber}</span></p>
                                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">المبلغ المدفوع:</strong> <span style="color: #3b82f6; font-weight: bold;">$${order.totalPrice}</span></p>
                                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">حالة الدفع:</strong> <span style="color: #22c55e; font-weight: bold;">مدفوع ✅</span></p>
                                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #8261c6;">التاريخ:</strong> <span style="color: #202028;">${new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                            </div>
                        
                            <div style="text-align: center; margin: 35px 0;">
                                <a href="${baseUrl}/customer/orders/${order._id}" 
                                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 18px; margin: 10px; box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); transition: all 0.3s ease;">
                                    📋 متابعة الطلب
                                </a>
                            </div>
                        </div>
                    
                        <!-- Footer -->
                        <div style="background: linear-gradient(135deg, #202028 0%, #252530 100%); padding: 25px; text-align: center; border-top: 1px solid #3f3f46;">
                            <p style="margin: 0; color: #a1a1aa; font-size: 16px;">شكراً لاختيارك <strong style="color: #8261c6;">Prestige Designs</strong></p>
                            <p style="margin: 8px 0 0 0; color: #71717a; font-size: 14px;">نحن هنا لخدمتك دائماً</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
        }

        // Send email
        const emailResult = await EmailService.sendCustomMessage(
            order.customerEmail,
            {
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                subject: emailSubject,
                message: emailMessage
            }
        );

        if (emailResult.success) {
            console.log('✅ Customer email sent successfully');

            // Log email in order history
            order.orderHistory.push({
                status: 'email_sent',
                timestamp: new Date(),
                note: `تم إرسال بريد إلكتروني للعميل: ${emailSubject}`,
                changedBy: 'system'
            });
            await order.save();

            return NextResponse.json({
                success: true,
                message: 'Customer email sent successfully'
            });
        } else {
            console.error('❌ Failed to send customer email:', emailResult.error);
            return NextResponse.json(
                { error: 'Failed to send customer email', details: emailResult.error },
                { status: 500 }
            );
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
