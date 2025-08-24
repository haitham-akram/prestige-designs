import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order } from '@/lib/db/models';
import PromoCode from '@/lib/db/models/PromoCode';
import PromoCodeUsage from '@/lib/db/models/PromoCodeUsage';
import connectDB from '@/lib/db/connection';
import { z } from 'zod';
import { ItemDeliveryService } from '@/lib/services/itemDeliveryService';

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
    EnableCustomizations: z.boolean().optional(),
    customizations: customizationSchema.optional(),
});

const createOrderSchema = z.object({
    customerName: z.string().min(1, 'Customer name is required'),
    customerEmail: z.string().email('Valid email is required'),
    customerPhone: z.string().optional(),
    items: z.array(orderItemSchema).min(1, 'At least one item is required'),
    subtotal: z.number().min(0, 'Subtotal must be non-negative'),
    totalPromoDiscount: z.number().min(0, 'Total promo discount must be non-negative'),
    totalPrice: z.number().min(0, 'Total price must be non-negative'),
    appliedPromoCodes: z.array(z.string()).default([]),
    customerNotes: z.string().optional(),
});


export async function POST(request: NextRequest) {
    let order;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        await connectDB();

        const body = await request.json();
        const orderData = createOrderSchema.parse(body);

        const Product = (await import('@/lib/db/models')).Product;
        const products = await Product.find({ _id: { $in: orderData.items.map(item => item.productId) } });

        const enrichedItems = orderData.items.map(item => {
            const product = products.find(p => p._id.toString() === item.productId);
            return {
                ...item,
                EnableCustomizations: item.EnableCustomizations ?? product?.EnableCustomizations ?? false,
            };
        });

        const hasCustomizableProducts = enrichedItems.some(item => item.EnableCustomizations === true);

        // --- START OF FIX: EXPLICIT ORDER NUMBER GENERATION ---
        let orderNumber;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 5) {
            const year = new Date().getFullYear();
            // Generate a unique number based on the count of orders this year
            const count = await Order.countDocuments({
                createdAt: {
                    $gte: new Date(year, 0, 1),
                    $lt: new Date(year + 1, 0, 1)
                }
            });

            orderNumber = `PD-${year}-${String(count + 1 + attempts).padStart(3, '0')}`;

            const existingOrderCheck = await Order.findOne({ orderNumber });
            if (!existingOrderCheck) {
                isUnique = true;
            } else {
                attempts++;
            }
        }

        if (!isUnique) {
            throw new Error('Failed to generate a unique order number after multiple attempts.');
        }
        // --- END OF FIX ---

        order = new Order({
            orderNumber, // Pass the generated number here
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
            requiresCustomWork: hasCustomizableProducts,
            customizationStatus: hasCustomizableProducts ? 'pending' : 'none',
            customerNotes: orderData.customerNotes,
            orderHistory: [{
                status: 'pending',
                timestamp: new Date(),
                note: 'تم إنشاء الطلب وهو في انتظار الدفع',
                changedBy: 'system'
            }]
        });

        await order.save();
        console.log('✅ Order created successfully:', order.orderNumber);

        if (order.totalPrice === 0) {
            console.log('🎉 Detected free order. Processing immediately...', order.orderNumber);

            try {
                order.paymentStatus = 'free';
                order.paidAt = new Date();
                order.orderStatus = 'processing';
                order.orderHistory.push({
                    status: 'processing',
                    timestamp: new Date(),
                    note: 'تم بدء معالجة الطلب المجاني تلقائياً',
                    changedBy: 'system'
                });
                await order.save();

                const deliveryResult = await ItemDeliveryService.processOrderDelivery(order);
                await ItemDeliveryService.sendDeliveryNotifications(order, deliveryResult);

                console.log('✅ Free order processed successfully within create route.');

            } catch (processingError) {
                console.error('❌ Error processing free order during creation:', processingError);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Order created successfully',
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            totalPrice: order.totalPrice
        });

    } catch (error) {
        console.error('❌ Error creating order:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
