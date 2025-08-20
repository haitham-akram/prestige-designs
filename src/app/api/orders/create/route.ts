/**
 * Create Order API Route
 * 
 * Creates a new order in the database
 * 
 * Route: POST /api/orders/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order } from '@/lib/db/models';
import PromoCode from '@/lib/db/models/PromoCode';
import PromoCodeUsage from '@/lib/db/models/PromoCodeUsage';
import connectDB from '@/lib/db/connection';
import { z } from 'zod';

// Validation schemas
const customizationSchema = z.object({
    colors: z.array(z.object({
        name: z.string(),
        hex: z.string(),
    })).optional(),
    textChanges: z.array(z.object({
        field: z.string(),
        value: z.string(),
    })).optional(),
    uploadedImages: z.array(z.object({
        url: z.string(),
        publicId: z.string(),
    })).optional(),
    uploadedLogo: z.object({
        url: z.string(),
        publicId: z.string(),
    }).optional(),
    customizationNotes: z.string().optional(),
});

const orderItemSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    productName: z.string().min(1, 'Product name is required'),
    productSlug: z.string().min(1, 'Product slug is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    originalPrice: z.number().min(0, 'Original price must be non-negative'),
    discountAmount: z.number().min(0, 'Discount amount must be non-negative'),
    unitPrice: z.number().min(0, 'Unit price must be non-negative'),
    totalPrice: z.number().min(0, 'Total price must be non-negative'),
    promoCode: z.string().optional(),
    promoDiscount: z.number().min(0, 'Promo discount must be non-negative').optional(),
    hasCustomizations: z.boolean(),
    EnableCustomizations: z.boolean().optional(), // Add EnableCustomizations field
    customizations: customizationSchema.optional(),
});

const createOrderSchema = z.object({
    customerName: z.string().min(1, 'Customer name is required'),
    customerEmail: z.string().email('Valid email is required'),
    customerPhone: z.string().optional(),
    customerAddress: z.object({
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        zipCode: z.string().optional(),
    }).optional(),
    items: z.array(orderItemSchema).min(1, 'At least one item is required'),
    subtotal: z.number().min(0, 'Subtotal must be non-negative'),
    totalPromoDiscount: z.number().min(0, 'Total promo discount must be non-negative'),
    totalPrice: z.number().min(0, 'Total price must be non-negative'),
    appliedPromoCodes: z.array(z.string()).default([]),
    customerNotes: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        console.log('🔍 Order request body:', JSON.stringify(body, null, 2));

        // Fix any double-stringified customization data
        if (body.items) {
            interface CartItemCustomizations {
                uploadedImages?: string | string[];
                uploadedLogo?: string | string[];
                selectedColor?: string;
                textContent?: string;
                logoImages?: string[];
            }
            interface CartItem {
                productId: string;
                productName: string;
                price: number;
                quantity: number;
                customizations?: CartItemCustomizations;
                hasCustomizations?: boolean;
            }
            body.items = body.items.map((item: CartItem) => {
                if (item.customizations) {
                    // Check if uploadedImages is a string instead of array
                    if (typeof item.customizations.uploadedImages === 'string') {
                        try {
                            item.customizations.uploadedImages = JSON.parse(item.customizations.uploadedImages);
                            console.log('🔧 Fixed stringified uploadedImages for item:', item.productName);
                        } catch (e) {
                            console.error('Failed to parse uploadedImages string:', e);
                        }
                    }
                    // Check if uploadedLogo is a string instead of object
                    if (typeof item.customizations.uploadedLogo === 'string') {
                        try {
                            item.customizations.uploadedLogo = JSON.parse(item.customizations.uploadedLogo);
                            console.log('🔧 Fixed stringified uploadedLogo for item:', item.productName);
                        } catch (e) {
                            console.error('Failed to parse uploadedLogo string:', e);
                        }
                    }
                }
                return item;
            });
        }

        const orderData = createOrderSchema.parse(body);
        console.log('✅ Order data validated successfully');

        console.log('🔄 Creating order for user:', session.user.id);

        await connectDB();

        // Check if any items have customizations and if products support customizations
        const Product = (await import('@/lib/db/models')).Product;
        const productIds = orderData.items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });

        // Enrich order items with EnableCustomizations field from cart or database FIRST
        const enrichedItems = orderData.items.map(item => {
            const product = products.find(p => p._id.toString() === item.productId);
            return {
                ...item,
                EnableCustomizations: item.EnableCustomizations ?? product?.EnableCustomizations ?? false
            };
        });

        // Then check hasCustomizableProducts based on enriched items
        const hasCustomizableProducts = enrichedItems.some(item => {
            return item.EnableCustomizations === true;
        });

        console.log('🔍 Customization analysis:', {
            hasCustomizableProducts,
            itemAnalysis: enrichedItems.map(item => ({
                productName: item.productName,
                EnableCustomizations: item.EnableCustomizations,
                hasCustomizations: item.hasCustomizations,
            }))
        });

        // Check for existing pending orders to avoid duplicates
        // Look for orders with same user, same items (by productId), and pending payment status
        const existingOrder = await Order.findOne({
            customerId: session.user.id,
            paymentStatus: 'pending',
            orderStatus: 'pending',
            'items.productId': { $all: productIds },
            // Only consider recent orders (within last 30 minutes) to avoid updating very old orders
            createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
        }).sort({ createdAt: -1 }); // Get the most recent one

        let order;
        let orderNumber;

        if (existingOrder) {
            // Update existing order instead of creating a new one
            console.log('🔄 Updating existing pending order:', existingOrder.orderNumber);

            existingOrder.items = enrichedItems;
            existingOrder.subtotal = orderData.subtotal;
            existingOrder.totalPromoDiscount = orderData.totalPromoDiscount;
            existingOrder.totalPrice = orderData.totalPrice;
            existingOrder.appliedPromoCodes = orderData.appliedPromoCodes;
            existingOrder.customerNotes = orderData.customerNotes;
            existingOrder.hasCustomizableProducts = hasCustomizableProducts;
            existingOrder.requiresCustomWork = hasCustomizableProducts; // Fix: set requiresCustomWork
            existingOrder.customizationStatus = existingOrder.hasCustomizableProducts ? 'pending' : 'none';
            existingOrder.updatedAt = new Date();

            // Add to order history
            existingOrder.orderHistory.push({
                status: 'updated',
                timestamp: new Date(),
                note: 'تم تحديث تفاصيل الطلب',
                changedBy: 'system'
            });

            await existingOrder.save();
            order = existingOrder;
            orderNumber = existingOrder.orderNumber;

            console.log('✅ Order updated successfully:', orderNumber);

            // Handle promo code usage for updated orders
            if (orderData.appliedPromoCodes && orderData.appliedPromoCodes.length > 0) {
                // Check if any new promo codes were added that weren't previously recorded
                for (const promoCodeString of orderData.appliedPromoCodes) {
                    const existingUsage = await PromoCodeUsage.findOne({
                        userId: session.user.id,
                        promoCode: promoCodeString.toUpperCase(),
                        orderId: existingOrder._id.toString(),
                        isActive: true
                    });

                    if (!existingUsage) {
                        // This is a new promo code for this order, record it
                        try {
                            const promoCodeDoc = await PromoCode.findOne({
                                code: promoCodeString.toUpperCase(),
                                isActive: true
                            });

                            if (promoCodeDoc) {
                                await PromoCodeUsage.create({
                                    userId: session.user.id,
                                    promoCodeId: promoCodeDoc._id.toString(),
                                    promoCode: promoCodeString.toUpperCase(),
                                    orderId: existingOrder._id.toString(),
                                    orderNumber: existingOrder.orderNumber,
                                    discountAmount: orderData.totalPromoDiscount,
                                    orderTotal: orderData.totalPrice + orderData.totalPromoDiscount,
                                    usedAt: new Date()
                                });

                                await promoCodeDoc.incrementUsage();

                                console.log('✅ Recorded new promo code usage for updated order:', promoCodeString);
                            }
                        } catch (promoError) {
                            console.error('❌ Failed to record promo code usage for updated order:', promoError);
                        }
                    }
                }
            }
        } else {
            // Create new order - generate order number first
            let isUnique = false;
            let attempts = 0;

            while (!isUnique && attempts < 5) {
                const orderCount = await Order.countDocuments();
                orderNumber = `PD-${new Date().getFullYear()}-${String(orderCount + 1 + attempts).padStart(3, '0')}`;

                // Check if this order number already exists
                const existingOrderCheck = await Order.findOne({ orderNumber });
                if (!existingOrderCheck) {
                    isUnique = true;
                } else {
                    attempts++;
                }
            }

            if (!isUnique) {
                throw new Error('Failed to generate unique order number');
            }

            // Create new order
            order = new Order({
                orderNumber,
                customerId: session.user.id,
                customerEmail: orderData.customerEmail,
                customerName: orderData.customerName,
                customerPhone: orderData.customerPhone,
                items: enrichedItems,
                subtotal: orderData.subtotal,
                totalPromoDiscount: orderData.totalPromoDiscount,
                totalPrice: orderData.totalPrice,
                appliedPromoCodes: orderData.appliedPromoCodes,
                paymentMethod: 'paypal',
                paymentStatus: 'pending',
                orderStatus: 'pending',
                deliveryMethod: 'digital_download',
                hasCustomizableProducts,
                requiresCustomWork: hasCustomizableProducts, // This should be true if any product is customizable
                customizationStatus: hasCustomizableProducts ? 'pending' : 'none',
                emailSent: false,
                customerNotes: orderData.customerNotes,
                orderHistory: [
                    {
                        status: 'pending',
                        timestamp: new Date(),
                        note: 'تم إنشاء الطلب وهو في انتظار الدفع',
                        changedBy: 'system'
                    }
                ]
            });

            await order.save();

            console.log('✅ Order created successfully:', orderNumber);

            // Record promo code usage for new orders with promo codes
            if (orderData.appliedPromoCodes && orderData.appliedPromoCodes.length > 0) {
                for (const promoCodeString of orderData.appliedPromoCodes) {
                    try {
                        // Find the promo code document to get its ID
                        const promoCodeDoc = await PromoCode.findOne({
                            code: promoCodeString.toUpperCase(),
                            isActive: true
                        });

                        if (promoCodeDoc) {
                            // Record the usage
                            await PromoCodeUsage.create({
                                userId: session.user.id,
                                promoCodeId: promoCodeDoc._id.toString(),
                                promoCode: promoCodeString.toUpperCase(),
                                orderId: order._id.toString(),
                                orderNumber: order.orderNumber,
                                discountAmount: orderData.totalPromoDiscount,
                                orderTotal: orderData.totalPrice + orderData.totalPromoDiscount, // Pre-discount total
                                usedAt: new Date()
                            });

                            // Increment the promo code usage count
                            await promoCodeDoc.incrementUsage();

                            console.log('✅ Recorded promo code usage:', promoCodeString);
                        }
                    } catch (promoError) {
                        console.error('❌ Failed to record promo code usage:', promoError);
                        // Don't fail the order creation if promo recording fails
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Order created successfully',
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            hasCustomizableProducts,
            totalPrice: order.totalPrice
        });

    } catch (error) {
        console.error('❌ Error creating order:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create order' },
            { status: 500 }
        );
    }
}
