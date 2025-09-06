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
            console.log('💰 Total amount (after discounts):', orderRequest.totalAmount);
            console.log('🔍 PayPal Service DEBUG - Full orderRequest:', JSON.stringify(orderRequest, null, 2));

            // Calculate totals and ensure proper formatting
            const totalAmount = parseFloat(orderRequest.totalAmount);
            const itemsTotal = orderRequest.items.reduce((sum, item) => {
                return sum + (parseFloat(item.unitAmount.value) * parseInt(item.quantity));
            }, 0);

            console.log('📊 Items total:', itemsTotal.toFixed(2));
            console.log('📊 Final total:', totalAmount.toFixed(2));

            // Check if there's a discount applied
            const hasDiscount = Math.abs(itemsTotal - totalAmount) > 0.01; // Account for floating point precision
            const discountAmount = hasDiscount ? itemsTotal - totalAmount : 0;
            console.log('🎫 Has discount:', hasDiscount);
            console.log('💸 Discount amount:', discountAmount.toFixed(2));

            // Create amount object with proper breakdown
            // PayPal requires item_total in breakdown when items are specified
            const amountObject: any = {
                currencyCode: PAYPAL_CONFIG.currency,
                value: totalAmount.toFixed(2),
                breakdown: {
                    itemTotal: {
                        currencyCode: PAYPAL_CONFIG.currency,
                        value: itemsTotal.toFixed(2),
                    }
                }
            };

            // If there's a discount, add it to the breakdown
            if (hasDiscount && discountAmount > 0) {
                amountObject.breakdown.discount = {
                    currencyCode: PAYPAL_CONFIG.currency,
                    value: discountAmount.toFixed(2),
                };
                console.log('💰 Added discount to PayPal breakdown:', discountAmount.toFixed(2));
            }

            // Create order body
            const orderBody = {
                intent: CheckoutPaymentIntent.Capture,
                purchaseUnits: [
                    {
                        referenceId: orderRequest.orderId,
                        description: `Prestige Designs Order - ${orderRequest.orderId}`,
                        customId: orderRequest.orderId,
                        softDescriptor: 'PRESTIGE DESIGNS',
                        amount: amountObject,
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

            // Check if order is already completed to prevent duplicate processing
            if (order.paymentStatus === 'paid') {
                console.log('⚠️ Order already completed, skipping duplicate processing');
                return order;
            }

            // Preserve promo code data - ensure they remain intact after payment
            // The promo codes and discounts were already calculated and saved during order creation
            // We need to ensure they are not lost during payment completion
            const preservedPromoDiscount = order.totalPromoDiscount;
            const preservedAppliedPromoCodes = [...(order.appliedPromoCodes || [])];

            if (preservedAppliedPromoCodes.length > 0) {
                console.log('💰 PROMO CODE FIX - Preserving promo code data during payment completion:', {
                    appliedPromoCodes: preservedAppliedPromoCodes,
                    totalPromoDiscount: preservedPromoDiscount,
                    originalTotalPrice: order.totalPrice
                });
            }

            // Update order with payment info
            order.paymentStatus = 'paid';
            order.paypalTransactionId = paypalData.transactionId;
            order.paypalOrderId = paypalData.id;
            order.paidAt = new Date();
            order.orderStatus = 'processing';

            // Explicitly preserve promo code data after payment status updates
            // Now that we've removed the problematic pre-save middleware,
            // the promo code data should be preserved automatically
            if (preservedAppliedPromoCodes.length > 0) {
                order.totalPromoDiscount = preservedPromoDiscount;
                order.appliedPromoCodes = preservedAppliedPromoCodes;
                console.log('💰 Promo code data preserved after payment status update');
            }

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

            if (preservedAppliedPromoCodes.length > 0) {
                if (order.totalPromoDiscount === preservedPromoDiscount) {
                    console.log('✅ PROMO CODE FIX SUCCESS - Promo code data preserved correctly!');
                } else {
                    console.log('❌ PROMO CODE FIX FAILED - Promo code data was lost:', {
                        expected: preservedPromoDiscount,
                        actual: order.totalPromoDiscount
                    });
                }
            }

            // Process item-level delivery using the new service
            const { ItemDeliveryService } = await import('@/lib/services/itemDeliveryService');

            const deliveryResult = await ItemDeliveryService.processOrderDelivery(order);

            // Send delivery notifications
            await ItemDeliveryService.sendDeliveryNotifications(order, deliveryResult);

            // Send admin notification about new paid order
            try {
                console.log('🔔 Sending admin notification about new paid order...');
                const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';

                const response = await fetch(`${baseUrl}/api/admin/notify-new-order`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Use a system token or admin session for internal API calls
                        'Authorization': 'Bearer system-internal-call'
                    },
                    body: JSON.stringify({
                        orderId: order._id.toString(),
                        orderNumber: order.orderNumber,
                        isFreeOrder: false,
                        hasCustomizations: deliveryResult.requiresCustomWork,
                        autoCompleted: deliveryResult.deliveryType === 'auto_delivery' && !deliveryResult.requiresCustomWork,
                    }),
                });

                if (response.ok) {
                    console.log('✅ Admin notification sent successfully for paid order');
                } else {
                    console.log('⚠️ Failed to send admin notification:', await response.text());
                }
            } catch (notificationError) {
                console.error('⚠️ Error sending admin notification (non-critical):', notificationError);
                // Don't throw error here - notification failure shouldn't break order completion
            }

            // Send Discord webhook notification
            try {
                console.log('🔔 Sending Discord webhook notification for paid order...');
                const { DiscordWebhookService } = await import('@/lib/services/discordWebhookService');

                const discordResult = await DiscordWebhookService.sendPaidOrderNotification({
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    customerEmail: order.customerEmail,
                    totalPrice: order.totalPrice,
                    currency: 'USD', // You can make this dynamic if needed
                    items: order.items.map(item => ({
                        productName: item.productName || 'Unknown Product',
                        quantity: item.quantity || 1,
                        price: item.unitPrice || item.totalPrice || 0
                    })),
                    paymentMethod: 'PayPal',
                    orderStatus: order.orderStatus,
                    hasCustomizations: deliveryResult.requiresCustomWork,
                    paidAt: new Date()
                });

                if (discordResult.success) {
                    console.log('✅ Discord webhook notification sent successfully');
                } else {
                    console.log('⚠️ Discord webhook failed (non-critical):', discordResult.error);
                }
            } catch (discordError) {
                console.error('⚠️ Error sending Discord webhook (non-critical):', discordError);
                // Don't throw error here - Discord notification failure shouldn't break order completion
            }

            console.log('✅ Order completion process finished');
            return order;
        } catch (error) {
            console.error('❌ Error completing order:', error);
            throw new Error(`Order completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check delivery type based on color variant availability (PUBLIC FOR TESTING)
     */
    static async checkDeliveryType(order: IOrder): Promise<{
        deliveryType: 'auto_delivery' | 'custom_work',
        requiresCustomWork: boolean,
        availableFiles: any[],
        customWorkItems: any[]
    }> {
        try {
            console.log('🔍 Checking delivery type for order:', order.orderNumber);
            console.log('📦 Order items:', JSON.stringify(order.items, null, 2));

            const DesignFile = (await import('@/lib/db/models')).DesignFile;

            const availableFiles = [];
            const customWorkItems = [];

            for (const item of order.items) {
                console.log('🔍 Checking item:', item.productName, 'hasCustomizations:', item.hasCustomizations, 'EnableCustomizations:', item.EnableCustomizations);

                // First check if the product supports customization at all
                if (item.EnableCustomizations === false) {
                    // Product doesn't support customization - check for general files
                    console.log('🔍 Product does not support customization, checking general files');

                    // Convert productId to ObjectId if it's a string
                    const { Types } = await import('mongoose');
                    const productObjectId = typeof item.productId === 'string' ?
                        new Types.ObjectId(item.productId) : item.productId;

                    const generalFiles = await DesignFile.find({
                        productId: productObjectId,
                        isColorVariant: false,
                        isActive: true
                    }).lean();

                    if (generalFiles.length > 0) {
                        console.log('✅ Found general files for non-customizable product');
                        availableFiles.push({
                            ...item,
                            files: generalFiles
                        });
                    } else {
                        console.log('❌ No general files found for non-customizable product');
                        customWorkItems.push(item);
                    }
                    continue;
                }

                // Check if item has REAL customizations (text, uploads, notes)
                // Color selections are NOT customizations - they are product variants
                const hasRealCustomizations = item.hasCustomizations || (
                    item.customizations && (
                        (item.customizations.textChanges && item.customizations.textChanges.length > 0) ||
                        (item.customizations.uploadedImages && item.customizations.uploadedImages.length > 0) ||
                        (item.customizations.uploadedLogo && item.customizations.uploadedLogo.url && item.customizations.uploadedLogo.url.trim().length > 0) ||
                        (item.customizations.customizationNotes && item.customizations.customizationNotes.trim().length > 0)
                    )
                );

                if (!hasRealCustomizations) {
                    // Check for predefined color variants OR no colors at all
                    const colorCustomizations = item.customizations?.colors;
                    console.log('🎨 Color selections (predefined variants):', JSON.stringify(colorCustomizations, null, 2));

                    if (!colorCustomizations || colorCustomizations.length === 0) {
                        // No color selection - check for general files
                        console.log('🔍 No color selections, checking general files');

                        // Convert productId to ObjectId if it's a string
                        const { Types } = await import('mongoose');
                        const productObjectId = typeof item.productId === 'string' ?
                            new Types.ObjectId(item.productId) : item.productId;

                        const generalFiles = await DesignFile.find({
                            productId: productObjectId,
                            isColorVariant: false,
                            isActive: true
                        }).lean();

                        if (generalFiles.length > 0) {
                            console.log('✅ Found general files for immediate delivery');
                            availableFiles.push({
                                ...item,
                                files: generalFiles
                            });
                        } else {
                            console.log('❌ No general files found, requires custom work');
                            customWorkItems.push(item);
                        }
                    } else {
                        // Has color selections - check if predefined color variant files exist
                        console.log('🔍 Checking predefined color variant files');
                        let hasAllColorFiles = true;
                        const itemFiles = [];

                        for (const color of colorCustomizations) {
                            console.log('🔍 Checking predefined color variant files for:', color.name, color.hex);
                            console.log('🔍 Query params:', {
                                productId: item.productId,
                                colorVariantHex: color.hex,
                                isColorVariant: true,
                                isActive: true
                            });

                            // Convert productId to ObjectId if it's a string
                            const { Types } = await import('mongoose');
                            const productObjectId = typeof item.productId === 'string' ?
                                new Types.ObjectId(item.productId) : item.productId;

                            const colorFiles = await DesignFile.find({
                                productId: productObjectId, // Use converted ObjectId
                                colorVariantHex: color.hex,
                                isColorVariant: true,
                                isActive: true
                            }).lean();

                            console.log(`📁 Found ${colorFiles.length} files for color ${color.name} (${color.hex})`);
                            console.log('📁 Files found:', colorFiles.map(f => ({ fileName: f.fileName, productId: f.productId, colorVariantHex: f.colorVariantHex })));

                            if (colorFiles.length === 0) {
                                hasAllColorFiles = false;
                                break;
                            }
                            itemFiles.push(...colorFiles);
                        }

                        if (hasAllColorFiles) {
                            console.log('✅ All predefined color variant files available for immediate delivery');
                            availableFiles.push({
                                ...item,
                                files: itemFiles
                            });
                        } else {
                            console.log('❌ Some predefined color variant files missing, requires custom work');
                            customWorkItems.push(item);
                        }
                    }
                    continue;
                }

                // Item has REAL customizations (text, uploads, notes) - requires custom work
                console.log('❌ Item has real customizations, requires custom work');
                customWorkItems.push(item);
            }

            // Determine delivery type
            console.log(`📊 Delivery analysis: ${availableFiles.length} auto-delivery items, ${customWorkItems.length} custom work items`);

            if (availableFiles.length > 0 && customWorkItems.length === 0) {
                console.log('🚀 Full auto-delivery');
                return {
                    deliveryType: 'auto_delivery',
                    requiresCustomWork: false,
                    availableFiles,
                    customWorkItems
                };
            } else if (availableFiles.length > 0 && customWorkItems.length > 0) {
                console.log('🔄 Mixed delivery - some auto, some custom work');
                return {
                    deliveryType: 'auto_delivery',
                    requiresCustomWork: true,
                    availableFiles,
                    customWorkItems
                };
            } else {
                console.log('🛠️ All items require custom work');
                return {
                    deliveryType: 'custom_work',
                    requiresCustomWork: true,
                    availableFiles: [],
                    customWorkItems
                };
            }
        } catch (error) {
            console.error('❌ Error checking delivery type:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Stack trace:', error.stack);
            }
            // Default to custom work if there's an error
            return {
                deliveryType: 'custom_work',
                requiresCustomWork: true,
                availableFiles: [],
                customWorkItems: order.items
            };
        }
    }

    /**
     * Send immediate files for items with available color variants
     */
    static async sendImmediateFiles(order: IOrder, availableFiles: any[]): Promise<void> {
        try {
            const { OrderDesignFile } = await import('@/lib/db/models');

            console.log('📁 Creating OrderDesignFile records for immediate delivery...');

            // Create OrderDesignFile records for immediate delivery
            for (const item of availableFiles) {
                console.log(`📁 Processing ${item.files.length} files for item: ${item.productName}`);
                for (const file of item.files) {
                    console.log(`📁 Creating record for file: ${file.fileName}`);
                    await OrderDesignFile.create({
                        orderId: order._id,
                        designFileId: file._id,
                        downloadCount: 0,
                        lastDownloadedAt: null,
                        isActive: true
                    });
                }
            }

            console.log('✅ OrderDesignFile records created successfully');

            // Update order status to reflect that some files are available
            order.orderStatus = 'processing';
            order.customizationStatus = 'pending';

            // Add to order history
            order.orderHistory.push({
                status: 'partial_delivery',
                timestamp: new Date(),
                note: `تم إرسال ${availableFiles.length} منتج متاح للتحميل فوراً`,
                changedBy: 'system'
            });

            await order.save();

            // Send immediate delivery email
            const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
            const downloadLinks = availableFiles.flatMap(item =>
                item.files.map((file: any) => ({
                    fileName: file.fileName,
                    downloadUrl: `${baseUrl}/api/design-files/${file._id}/download`
                }))
            );

            // Create email content
            const itemsList = availableFiles.map(item =>
                `• ${item.productName} (${item.quantity}x) - ${item.files.length} ملف`
            ).join('\n');

            const customMessage = `
                <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #22c55e; margin-bottom: 15px;">✅ ملفاتك جاهزة للتحميل</h3>
                    <p style="color: #495057; line-height: 1.6; margin-bottom: 15px;">
                        تم تجهيز الملفات التالية وهي متاحة للتحميل فورا:
                    </p>
                    <pre style="background: #e9ecef; padding: 10px; border-radius: 4px; font-size: 14px;">
${itemsList}
                    </pre>
                    <p style="color: #495057; line-height: 1.6; margin: 15px 0;">
                        يمكنك تحميل الملفات من الروابط أدناه. الروابط صالحة لمدة 30 يوما.
                    </p>
                    ${downloadLinks.map(link =>
                `<p><a href="${link.downloadUrl}" style="color: #8261c6; text-decoration: none;">📥 تحميل ${link.fileName}</a></p>`
            ).join('')}
                </div>
            `;

            // Send email (using the existing email sending logic)
            const transporter = await import('nodemailer').then(nm => {
                return nm.default.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: false,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });
            });

            const mailOptions = {
                from: process.env.SMTP_FROM || 'noreply@prestigedesigns.com',
                to: order.customerEmail,
                subject: `ملفاتك جاهزة - ${order.orderNumber}`,
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #8261c6; margin: 0;">Prestige Designs</h1>
                        </div>
                        
                        <h2 style="color: #495057; text-align: center;">مرحبا ${order.customerName}</h2>
                        <p style="color: #6c757d; text-align: center; margin-bottom: 30px;">
                            رقم الطلب: <strong>${order.orderNumber}</strong>
                        </p>
                        
                        ${customMessage}
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center;">
                            <p style="color: #6c757d; font-size: 14px; margin: 0;">
                                شكرا لثقتك بنا | Prestige Designs
                            </p>
                        </div>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log('✅ Immediate files email sent');

        } catch (error) {
            console.error('❌ Error sending immediate files:', error);
            // Don't throw error to avoid breaking the order completion process
        }
    }

    /**
     * Send customization processing email
     */
    static async sendCustomizationEmail(order: IOrder, customWorkItems?: any[]): Promise<void> {
        try {
            // Import email service
            const { EmailService } = await import('@/lib/services/emailService');

            // Convert customWorkItems to proper format
            const formattedCustomWorkItems = customWorkItems?.map(item => ({
                productName: item.productName,
                quantity: item.quantity
            }));

            // Use the consistent email service
            const result = await EmailService.sendCustomizationProcessingEmail(
                order.customerEmail,
                {
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    customWorkItems: formattedCustomWorkItems,
                }
            );

            if (result.success) {
                // Add email to order history
                order.orderHistory.push({
                    status: 'email_sent',
                    timestamp: new Date(),
                    note: 'تم إرسال بريد إلكتروني بخصوص معالجة التخصيصات',
                    changedBy: 'system',
                });
                await order.save();

                console.log('✅ Customization processing email sent successfully');
            } else {
                console.error('❌ Error sending customization email:', result.error);
            }
        } catch (error) {
            console.error('❌ Error sending customization email:', error);
        }
    }

    /**
     * Process PayPal refund for a transaction using REST API
     */
    static async processRefund(
        transactionId: string,
        amount?: { currency_code: string; value: string },
        reason?: string
    ): Promise<{
        success: boolean;
        refundId?: string;
        status?: string;
        error?: string;
    }> {
        try {
            console.log('🔄 Processing PayPal refund for transaction:', transactionId);
            console.log('💰 Refund amount:', amount || 'Full refund');
            console.log('📝 Reason:', reason || 'Admin cancellation');

            // Get PayPal access token
            const accessToken = await this.getAccessToken();
            if (!accessToken) {
                throw new Error('Failed to get PayPal access token');
            }

            // PayPal API endpoint for refunds
            const isProduction = process.env.NODE_ENV === 'production';
            const baseUrl = isProduction
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com';

            const refundUrl = `${baseUrl}/v2/payments/captures/${transactionId}/refund`;

            // Prepare refund request body
            const refundRequestBody: Record<string, unknown> = {
                note_to_payer: reason || 'تم إلغاء طلبك وسيتم استرداد المبلغ'
            };

            // Include amount if specified (otherwise PayPal will refund full amount)
            if (amount) {
                refundRequestBody.amount = amount;
            }

            // Process the refund
            console.log('💳 Sending refund request to PayPal...');
            const refundResponse = await fetch(refundUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'PayPal-Request-Id': `refund-${Date.now()}` // Unique request ID
                },
                body: JSON.stringify(refundRequestBody)
            });

            if (!refundResponse.ok) {
                const errorData = await refundResponse.json();
                console.error('❌ PayPal refund API error:', errorData);
                throw new Error(
                    errorData.details?.map((detail: { description: string }) => detail.description).join(', ')
                    || errorData.message
                    || 'Failed to process refund'
                );
            }

            const refundData = await refundResponse.json();
            console.log('✅ PayPal refund response:', refundData);

            return {
                success: true,
                refundId: refundData.id,
                status: refundData.status
            };

        } catch (error: unknown) {
            console.error('❌ PayPal refund error:', error);

            let errorMessage = 'Failed to process PayPal refund';
            if (error instanceof Error) {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Get PayPal access token
     */
    private static async getAccessToken(): Promise<string | null> {
        try {
            const clientId = process.env.PAYPAL_CLIENT_ID;
            const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

            if (!clientId || !clientSecret) {
                throw new Error('Missing PayPal credentials');
            }

            // PayPal API endpoint for access token
            const isProduction = process.env.NODE_ENV === 'production';
            const baseUrl = isProduction
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com';

            const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });

            if (!tokenResponse.ok) {
                throw new Error('Failed to get access token');
            }

            const tokenData = await tokenResponse.json();
            return tokenData.access_token;

        } catch (error) {
            console.error('❌ Error getting PayPal access token:', error);
            return null;
        }
    }

    /**
     * Auto-complete order without customizations
     */
    static async autoCompleteOrder(order: IOrder): Promise<void> {
        try {
            console.log('🚀 Auto-completing order with immediate delivery...');

            // First, check delivery type and create OrderDesignFiles records
            const deliveryResult = await this.checkDeliveryType(order);

            if (deliveryResult.deliveryType !== 'auto_delivery' || deliveryResult.requiresCustomWork) {
                throw new Error('Order is not eligible for auto-completion');
            }

            console.log('📁 Creating OrderDesignFiles records...');
            const { OrderDesignFile } = await import('@/lib/db/models');

            // Create OrderDesignFiles records for all available files
            for (const item of deliveryResult.availableFiles) {
                console.log(`📁 Processing files for item: ${item.productName}`);
                for (const file of item.files) {
                    console.log(`📁 Creating record for file: ${file.fileName}`);
                    await OrderDesignFile.create({
                        orderId: order._id,
                        designFileId: file._id,
                        downloadCount: 0,
                        lastDownloadedAt: null,
                        isActive: true
                    });
                }
            }

            console.log('✅ OrderDesignFiles records created successfully');

            // Now complete the order and send files
            await completeOrderAndSendFiles(order._id.toString());
            console.log('🎉 Order auto-completed successfully');

        } catch (error) {
            console.error('❌ Error auto-completing order:', error);
            // If auto-completion fails, just mark as processing
            order.orderStatus = 'processing';
            order.customizationStatus = 'pending';
            await order.save();
            console.log('⚠️ Auto-completion failed, order marked as processing for manual handling');
        }
    }

    /**
     * Process PayPal webhook events
     * Handles payment status updates from PayPal webhooks
     */
    static async processWebhookEvent(webhookData: any): Promise<{
        success: boolean;
        message: string;
        orderId?: string;
    }> {
        try {
            console.log('🔔 Processing PayPal webhook event:', webhookData.event_type);

            // Use the dedicated webhook service for better error handling
            const { PayPalWebhookService } = await import('@/lib/services/paypalWebhookService');

            const webhookEventData = {
                eventType: webhookData.event_type,
                eventId: webhookData.id,
                paypalOrderId: this.extractPayPalOrderId(webhookData),
                captureId: this.extractCaptureId(webhookData),
                resource: webhookData.resource,
                timestamp: new Date(webhookData.create_time || Date.now())
            };

            const result = await PayPalWebhookService.processWebhookEvent(webhookEventData);

            return {
                success: result.success,
                message: result.message,
                orderId: result.orderId
            };

        } catch (error) {
            console.error('❌ Error processing webhook event:', error);
            return {
                success: false,
                message: `Error processing webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Extract PayPal Order ID from webhook data
     */
    private static extractPayPalOrderId(webhookData: any): string | undefined {
        // Try different paths where the order ID might be located
        return webhookData.resource?.supplementary_data?.related_ids?.order_id ||
            webhookData.resource?.id ||
            webhookData.resource?.order_id;
    }

    /**
     * Extract Capture ID from webhook data  
     */
    private static extractCaptureId(webhookData: any): string | undefined {
        return webhookData.resource?.id;
    }
}

export { paypalClient };
