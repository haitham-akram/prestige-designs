/**
 * PayPal Service
 * 
 * This service handles PayPal payment operations including:
 * - Creating payment orders
 * - Capturing payments
 * - Handling order completion
 * - Processing refunds
 */

import { paypalClient, ordersController, PAYPAL_CONFIG } from './config';
import {
    CheckoutPaymentIntent,
    ItemCategory,
    OrderApplicationContextLandingPage,
    OrderApplicationContextShippingPreference,
    OrderApplicationContextUserAction,
} from '@paypal/paypal-server-sdk';
import { Order } from '@/lib/db/models';
import { IOrder } from '@/lib/db/models/Order';
import { completeOrderAndSendFiles } from '@/lib/services/orderCompletionService';
import connectDB from '@/lib/db/connection';

export interface PayPalOrderItem {
    name: string;
    description?: string;
    quantity: string;
    unitAmount: {
        currencyCode: string;
        value: string;
    };
    category?: ItemCategory;
}

export interface PayPalCreateOrderRequest {
    items: PayPalOrderItem[];
    totalAmount: string;
    orderId: string;
    customerEmail: string;
    customerName: string;
}

export interface PayPalOrderResponse {
    id: string;
    status: string;
    links: Array<{
        href: string;
        rel: string;
        method: string;
    }>;
}

export interface PayPalCaptureResponse {
    id: string;
    status: string;
    amount: {
        currencyCode: string;
        value: string;
    };
    transactionId: string;
    payer: {
        name?: {
            givenName: string;
            surname: string;
        };
        emailAddress: string;
        address?: {
            addressLine1?: string;
            adminArea2?: string;
            adminArea1?: string;
            postalCode?: string;
            countryCode: string;
        };
    };
}

export class PayPalService {
    /**
     * Create a PayPal order
     */
    static async createOrder(orderRequest: PayPalCreateOrderRequest): Promise<PayPalOrderResponse> {
        try {
            console.log('🔄 Creating PayPal order...', orderRequest.orderId);

            // Calculate totals and ensure proper formatting
            const totalAmount = orderRequest.totalAmount;
            const itemsTotal = orderRequest.items.reduce((sum, item) => {
                return sum + (parseFloat(item.unitAmount.value) * parseInt(item.quantity));
            }, 0).toFixed(2);

            // Create order body
            const orderBody = {
                intent: CheckoutPaymentIntent.Capture,
                purchaseUnits: [
                    {
                        referenceId: orderRequest.orderId,
                        description: `Prestige Designs Order - ${orderRequest.orderId}`,
                        customId: orderRequest.orderId,
                        softDescriptor: 'PRESTIGE DESIGNS',
                        amount: {
                            currencyCode: PAYPAL_CONFIG.currency,
                            value: totalAmount,
                            breakdown: {
                                itemTotal: {
                                    currencyCode: PAYPAL_CONFIG.currency,
                                    value: itemsTotal,
                                }
                            }
                        },
                        items: orderRequest.items.map(item => ({
                            name: item.name,
                            description: item.description || item.name,
                            quantity: item.quantity,
                            category: item.category || ItemCategory.DigitalGoods,
                            unitAmount: item.unitAmount,
                        })),
                    }
                ],
                applicationContext: {
                    brandName: PAYPAL_CONFIG.applicationContext.brandName,
                    locale: PAYPAL_CONFIG.applicationContext.locale,
                    landingPage: OrderApplicationContextLandingPage.Billing,
                    shippingPreference: OrderApplicationContextShippingPreference.NoShipping,
                    userAction: OrderApplicationContextUserAction.PayNow,
                    returnUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/checkout/success`,
                    cancelUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/checkout/cancel`,
                },
            };

            console.log('Using OrdersController to create PayPal order...');

            // Create the order using the orders controller
            const response = await (ordersController as any).createOrder({
                body: orderBody
            });

            // Extract order from response - the actual data is in response.result
            const order = response.result;

            if (!order || !order.id) {
                console.error('Invalid PayPal response - no order ID found');
                console.error('Response:', response);
                throw new Error('PayPal order creation failed - no order ID returned');
            }

            console.log('✅ PayPal order created:', order.id);

            return {
                id: order.id!,
                status: order.status!,
                links: order.links?.map((link: any) => ({
                    href: link.href!,
                    rel: link.rel!,
                    method: link.method!,
                })) || [],
            };
        } catch (error) {
            console.error('❌ Error creating PayPal order:', error);
            throw new Error(`PayPal order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Capture a PayPal payment
     */
    static async capturePayment(paypalOrderId: string): Promise<any> {
        try {
            console.log('🔄 Capturing PayPal payment...', paypalOrderId);

            const { ordersController } = await import('../paypal/config');
            const response = await (ordersController as any).captureOrder({
                id: paypalOrderId,
                body: {
                    payment_source: {
                        paypal: {}
                    }
                }
            });

            const capturedOrder = response.result;

            console.log('PayPal capture response:', capturedOrder);
            console.log('Purchase units:', capturedOrder.purchaseUnits);
            console.log('Payments object:', capturedOrder.purchaseUnits?.[0]?.payments);

            // Enhanced debugging: Full payments object inspection
            const purchaseUnit = capturedOrder.purchaseUnits?.[0];
            const payments = purchaseUnit?.payments;

            if (payments) {
                console.log('Full payments object:', JSON.stringify(payments, null, 2));
                console.log('Available payment methods:', Object.keys(payments));
            }

            // Check if payment was captured successfully
            if (!payments?.captures?.[0]) {
                console.error('No capture found in payments object');
                console.error('Available payment methods:', Object.keys(payments || {}));
                throw new Error('No payment capture found');
            }

            const capture = payments.captures[0];
            const payer = capturedOrder.payer;

            console.log('✅ PayPal payment captured:', capture.id);

            return {
                id: capture.id!,
                status: capture.status!,
                amount: {
                    currencyCode: capture.amount?.currencyCode!,
                    value: capture.amount?.value!,
                },
                transactionId: capture.id!,
                payer: {
                    name: payer?.name ? {
                        givenName: payer.name.givenName!,
                        surname: payer.name.surname!,
                    } : undefined,
                    emailAddress: payer?.emailAddress!,
                    address: payer?.address ? {
                        addressLine1: payer.address.addressLine1,
                        adminArea2: payer.address.adminArea2,
                        adminArea1: payer.address.adminArea1,
                        postalCode: payer.address.postalCode,
                        countryCode: payer.address.countryCode!,
                    } : undefined,
                },
            };
        } catch (error) {
            console.error('❌ Error capturing PayPal payment:', error);
            throw new Error(`PayPal payment capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get PayPal order details
     */
    static async getOrderDetails(paypalOrderId: string): Promise<any> {
        try {
            console.log('🔄 Getting PayPal order details...', paypalOrderId);

            const { ordersController } = await import('../paypal/config');
            const response = await (ordersController as any).getOrder({
                id: paypalOrderId
            });

            console.log('✅ PayPal order details retrieved');
            return response.result;
        } catch (error) {
            console.error('❌ Error getting PayPal order details:', error);
            throw new Error(`Failed to get PayPal order details: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Complete order after successful payment
     */
    static async completeOrder(orderId: string, paypalData: PayPalCaptureResponse): Promise<IOrder> {
        try {
            console.log('🔄 Completing order after PayPal payment...', orderId);

            await connectDB();

            // Find and update the order
            const order = await Order.findById(orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            // Update order with payment info
            order.paymentStatus = 'paid';
            order.paypalTransactionId = paypalData.transactionId;
            order.paypalOrderId = paypalData.id;
            order.paidAt = new Date();
            order.orderStatus = 'processing';

            // Store PayPal address if provided
            if (paypalData.payer.address) {
                order.paypalAddress = {
                    fullName: paypalData.payer.name ?
                        `${paypalData.payer.name.givenName} ${paypalData.payer.name.surname}` :
                        undefined,
                    email: paypalData.payer.emailAddress,
                    country: paypalData.payer.address.countryCode,
                    city: paypalData.payer.address.adminArea2,
                    postalCode: paypalData.payer.address.postalCode,
                    address: paypalData.payer.address.addressLine1,
                };
            }

            // Add to order history
            order.orderHistory.push({
                status: 'paid',
                timestamp: new Date(),
                note: `تم إكمال الدفع عبر PayPal: ${paypalData.transactionId}`,
                changedBy: 'system'
            });

            await order.save();

            // Check if order has customizable products
            const hasCustomizations = order.hasCustomizableProducts;

            if (hasCustomizations) {
                // Send email about customization processing
                await this.sendCustomizationEmail(order);
                console.log('📧 Customization email sent');
            } else {
                // Auto-complete the order and send files
                await this.autoCompleteOrder(order);
                console.log('🎉 Order auto-completed and files sent');
            }

            console.log('✅ Order completion process finished');
            return order;
        } catch (error) {
            console.error('❌ Error completing order:', error);
            throw new Error(`Order completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Send customization processing email
     */
    private static async sendCustomizationEmail(order: IOrder): Promise<void> {
        try {
            const { EmailService } = await import('@/lib/services/emailService');

            // Create a custom HTML message for customization processing
            const customMessage = `
                <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #8261c6; margin-bottom: 15px;">🎨 طلبك قيد المعالجة</h3>
                    <p style="color: #495057; line-height: 1.6; margin-bottom: 15px;">
                        تم استلام طلبك بنجاح وتأكيد الدفع. سيتم العمل على تخصيص التصاميم حسب متطلباتك وإرسالها إليك في أقرب وقت ممكن.
                    </p>
                    <p style="color: #6c757d; font-size: 14px;">
                        شكراً لثقتك بنا. سنتواصل معك في حال احتجنا لأي توضيحات إضافية.
                    </p>
                </div>
            `;

            // Use a simple email sending method
            const transporter = await import('nodemailer').then(nm => {
                return nm.default.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: false,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });
            });

            const mailOptions = {
                from: `"Prestige Designs" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: order.customerEmail,
                subject: `معالجة طلبك - ${order.orderNumber}`,
                html: `
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>معالجة طلبك</title>
                    </head>
                    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
                            <h1 style="color: #8261c6; text-align: center; margin-bottom: 30px;">Prestige Designs</h1>
                            <h2 style="color: #333; margin-bottom: 20px;">مرحباً ${order.customerName}</h2>
                            ${customMessage}
                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <strong>رقم الطلب:</strong> ${order.orderNumber}
                            </div>
                            <p style="color: #666; text-align: center; margin-top: 30px; font-size: 14px;">
                                شكراً لاختيارك Prestige Designs
                            </p>
                        </div>
                    </body>
                    </html>
                `,
            };

            await transporter.sendMail(mailOptions);

            // Add email to order history
            order.orderHistory.push({
                status: 'email_sent',
                timestamp: new Date(),
                note: 'تم إرسال بريد إلكتروني بخصوص معالجة التخصيصات',
                changedBy: 'system',
            });
            await order.save();

            console.log('✅ Customization processing email sent successfully');
        } catch (error) {
            console.error('❌ Error sending customization email:', error);
        }
    }

    /**
     * Auto-complete order without customizations
     */
    private static async autoCompleteOrder(order: IOrder): Promise<void> {
        try {
            // Complete the order and send files
            await completeOrderAndSendFiles(order._id.toString());
        } catch (error) {
            console.error('❌ Error auto-completing order:', error);
            // If auto-completion fails, just mark as processing
            order.orderStatus = 'processing';
            order.customizationStatus = 'pending';
            await order.save();
            console.log('⚠️ Auto-completion failed, order marked as processing for manual handling');
        }
    }
}

export { paypalClient };
