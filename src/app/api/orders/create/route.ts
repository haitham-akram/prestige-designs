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
    hasCustomizations: z.boolean(),
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
            body.items = body.items.map((item: any) => {
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

        // Generate order number - ensure uniqueness
        let orderNumber;
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 5) {
            const orderCount = await Order.countDocuments();
            orderNumber = `PD-${new Date().getFullYear()}-${String(orderCount + 1 + attempts).padStart(3, '0')}`;
            
            // Check if this order number already exists
            const existingOrder = await Order.findOne({ orderNumber });
            if (!existingOrder) {
                isUnique = true;
            } else {
                attempts++;
            }
        }
        
        if (!isUnique) {
            throw new Error('Failed to generate unique order number');
        }

        // Check if any items have customizations
        const hasCustomizableProducts = orderData.items.some(item => item.hasCustomizations);

        // Create new order
        const order = new Order({
            orderNumber,
            customerId: session.user.id,
            customerEmail: orderData.customerEmail,
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone,
            customerAddress: orderData.customerAddress,
            items: orderData.items,
            subtotal: orderData.subtotal,
            totalPromoDiscount: orderData.totalPromoDiscount,
            totalPrice: orderData.totalPrice,
            appliedPromoCodes: orderData.appliedPromoCodes,
            paymentMethod: 'paypal',
            paymentStatus: 'pending',
            orderStatus: 'pending',
            deliveryMethod: 'digital_download',
            hasCustomizableProducts,
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
