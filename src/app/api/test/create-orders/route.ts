/**
 * Create Test Orders API Route
 * 
 * Creates sample orders for testing PayPal integration
 * 
 * Route: POST /api/test/create-orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { z } from 'zod';

// Validation schema
const createTestOrdersSchema = z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    customerEmail: z.string().email('Valid email is required'),
    customerName: z.string().min(1, 'Customer name is required'),
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
        const { customerId, customerEmail, customerName } = createTestOrdersSchema.parse(body);

        console.log('🔄 Creating test orders...');

        await connectDB();

        // Clear existing test orders for this user
        await Order.deleteMany({
            customerId,
            orderNumber: { $regex: /^TEST-/ }
        });

        const testOrders = [];
        const baseDate = new Date();

        // Test Order 1: Without customizations (auto-complete)
        const order1 = new Order({
            orderNumber: `TEST-${Date.now()}-1`,
            customerId,
            customerEmail,
            customerName,
            items: [
                {
                    productId: '6759e7d2e123456789abcde1',
                    productName: 'Logo Design Template',
                    productSlug: 'logo-design-template',
                    quantity: 1,
                    originalPrice: 29.99,
                    discountAmount: 0,
                    unitPrice: 29.99,
                    totalPrice: 29.99,
                    hasCustomizations: false,
                    customizations: {}
                }
            ],
            subtotal: 29.99,
            totalPromoDiscount: 0,
            totalPrice: 29.99,
            appliedPromoCodes: [],
            paymentMethod: 'paypal',
            paymentStatus: 'pending',
            orderStatus: 'pending',
            deliveryMethod: 'digital_download',
            hasCustomizableProducts: false,
            customizationStatus: 'none',
            emailSent: false,
            orderHistory: [
                {
                    status: 'pending',
                    timestamp: baseDate,
                    note: 'Test order created',
                    changedBy: 'system'
                }
            ],
            createdAt: baseDate,
            updatedAt: baseDate
        });

        // Test Order 2: With customizations (manual processing)
        const order2 = new Order({
            orderNumber: `TEST-${Date.now()}-2`,
            customerId,
            customerEmail,
            customerName,
            items: [
                {
                    productId: '6759e7d2e123456789abcde2',
                    productName: 'Custom Business Card Design',
                    productSlug: 'custom-business-card-design',
                    quantity: 2,
                    originalPrice: 49.99,
                    discountAmount: 0,
                    unitPrice: 49.99,
                    totalPrice: 99.98,
                    hasCustomizations: true,
                    customizations: {
                        colors: [
                            { name: 'Primary', hex: '#8261c6' },
                            { name: 'Secondary', hex: '#e260ef' }
                        ],
                        textChanges: [
                            { field: 'company_name', value: 'Test Company LLC' },
                            { field: 'contact_email', value: customerEmail }
                        ],
                        customizationNotes: 'Please make the logo more modern and add gradient effects.'
                    }
                }
            ],
            subtotal: 99.98,
            totalPromoDiscount: 0,
            totalPrice: 99.98,
            appliedPromoCodes: [],
            paymentMethod: 'paypal',
            paymentStatus: 'pending',
            orderStatus: 'pending',
            deliveryMethod: 'digital_download',
            hasCustomizableProducts: true,
            customizationStatus: 'pending',
            emailSent: false,
            orderHistory: [
                {
                    status: 'pending',
                    timestamp: baseDate,
                    note: 'Test order with customizations created',
                    changedBy: 'system'
                }
            ],
            createdAt: baseDate,
            updatedAt: baseDate
        });

        // Test Order 3: Mixed order (some items with customizations)
        const order3 = new Order({
            orderNumber: `TEST-${Date.now()}-3`,
            customerId,
            customerEmail,
            customerName,
            items: [
                {
                    productId: '6759e7d2e123456789abcde3',
                    productName: 'Website Template',
                    productSlug: 'website-template',
                    quantity: 1,
                    originalPrice: 79.99,
                    discountAmount: 10.00,
                    unitPrice: 69.99,
                    totalPrice: 69.99,
                    hasCustomizations: false,
                    customizations: {}
                },
                {
                    productId: '6759e7d2e123456789abcde4',
                    productName: 'Custom Header Design',
                    productSlug: 'custom-header-design',
                    quantity: 1,
                    originalPrice: 39.99,
                    discountAmount: 0,
                    unitPrice: 39.99,
                    totalPrice: 39.99,
                    hasCustomizations: true,
                    customizations: {
                        colors: [
                            { name: 'Brand Color', hex: '#ff6b35' }
                        ],
                        textChanges: [
                            { field: 'header_text', value: 'Welcome to Our Store' }
                        ]
                    }
                }
            ],
            subtotal: 119.98,
            totalPromoDiscount: 10.00,
            totalPrice: 109.98,
            appliedPromoCodes: ['SAVE10'],
            paymentMethod: 'paypal',
            paymentStatus: 'pending',
            orderStatus: 'pending',
            deliveryMethod: 'digital_download',
            hasCustomizableProducts: true,
            customizationStatus: 'pending',
            emailSent: false,
            orderHistory: [
                {
                    status: 'pending',
                    timestamp: baseDate,
                    note: 'Mixed test order created',
                    changedBy: 'system'
                }
            ],
            createdAt: baseDate,
            updatedAt: baseDate
        });

        // Save all test orders
        const savedOrders = await Promise.all([
            order1.save(),
            order2.save(),
            order3.save()
        ]);

        testOrders.push(...savedOrders);

        console.log('✅ Test orders created successfully:', testOrders.length);

        return NextResponse.json({
            success: true,
            message: `Created ${testOrders.length} test orders`,
            orders: testOrders.map(order => ({
                _id: order._id.toString(),
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                totalPrice: order.totalPrice,
                hasCustomizableProducts: order.hasCustomizableProducts,
                paymentStatus: order.paymentStatus,
                orderStatus: order.orderStatus,
                items: order.items
            }))
        });

    } catch (error) {
        console.error('❌ Error creating test orders:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create test orders' },
            { status: 500 }
        );
    }
}
