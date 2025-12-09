/**
 * Public Promo Code Validation API
 * 
 * Validates promo codes for customers during checkout with usage tracking
 * 
 * Route: POST /api/promo-codes/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import PromoCode from '@/lib/db/models/PromoCode';
import PromoCodeUsage from '@/lib/db/models/PromoCodeUsage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function POST(request: NextRequest) {
    try {
        // Check authentication - customers need to be logged in to use promo codes
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { code, orderValue, currentTotal, cartItems } = body;

        if (!code || typeof orderValue !== 'number') {
            return NextResponse.json(
                { error: 'كود الخصم وقيمة الطلب مطلوبة' },
                { status: 400 }
            );
        }

        // Use currentTotal (after existing discounts) for promo calculation, fallback to orderValue
        const calculationBase = typeof currentTotal === 'number' ? currentTotal : orderValue;

        console.log('🔍 Validating promo code:', code, 'for order value:', orderValue, 'calculation base:', calculationBase, 'cart items:', cartItems?.length || 0);

        await connectDB();

        // Find the promo code (case insensitive)
        const promoCode = await PromoCode.findOne({
            code: code.toUpperCase(),
            isActive: true
        });

        if (!promoCode) {
            return NextResponse.json(
                { error: 'كود الخصم غير صحيح أو منتهي الصلاحية' },
                { status: 400 }
            );
        }

        // Check if promo code is currently valid using model method
        if (!promoCode.isCurrentlyValid()) {
            if (promoCode.startDate && new Date() < promoCode.startDate) {
                return NextResponse.json(
                    { error: 'كود الخصم لم يصبح ساري المفعول بعد' },
                    { status: 400 }
                );
            }
            if (promoCode.endDate && new Date() > promoCode.endDate) {
                return NextResponse.json(
                    { error: 'انتهت صلاحية كود الخصم' },
                    { status: 400 }
                );
            }
            if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
                return NextResponse.json(
                    { error: 'تم استنفاد عدد مرات الاستخدام لهذا الكود' },
                    { status: 400 }
                );
            }
        }

        // Check user-specific usage limits
        const userUsageCount = await PromoCodeUsage.countDocuments({
            userId: session.user.id,
            promoCodeId: promoCode._id.toString(),
            isActive: true
        });

        if (!promoCode.canUserUse(userUsageCount)) {
            if (promoCode.userUsageLimit && userUsageCount >= promoCode.userUsageLimit) {
                return NextResponse.json(
                    { error: `لقد استخدمت هذا الكود بالفعل. الحد الأقصى ${promoCode.userUsageLimit} مرة لكل عميل` },
                    { status: 400 }
                );
            }
        }

        // Check minimum order amount
        if (promoCode.minimumOrderAmount && calculationBase < promoCode.minimumOrderAmount) {
            return NextResponse.json(
                { error: `الحد الأدنى لقيمة الطلب هو $${promoCode.minimumOrderAmount}` },
                { status: 400 }
            );
        }

        // Check if promo code applies to products in cart
        let totalQualifyingItems = 0;
        let applicableItemsTotal = calculationBase; // Default to full cart total

        if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
            console.log('🔍 Checking cart items for promo code applicability');
            console.log('🔍 Raw cart items received:', JSON.stringify(cartItems, null, 2));

            // Debug each cart item structure
            cartItems.forEach((item, index) => {
                console.log(`🔍 Cart item ${index + 1}:`, {
                    name: item.name,
                    id: item.id,
                    _id: item._id,
                    productId: item.productId,
                    cartItemId: item.cartItemId,
                    allKeys: Object.keys(item)
                });
            });

            if (promoCode.applyToAllProducts) {
                // Applies to all products - use full cart total
                totalQualifyingItems = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
                applicableItemsTotal = calculationBase; // Use full cart total for all-products promo
                console.log('✅ Promo applies to ALL products:', {
                    totalQualifyingItems,
                    applicableItemsTotal,
                    promoType: 'ALL_PRODUCTS'
                });
            } else if ((promoCode.productIds && Array.isArray(promoCode.productIds) && promoCode.productIds.length > 0) ||
                (promoCode.products && Array.isArray(promoCode.products) && promoCode.products.length > 0)) {
                // Check specific products - support both productIds and products fields
                const productList = promoCode.productIds || promoCode.products || [];
                const promoProductIds = productList.map(p => p.toString());

                const qualifyingItems = cartItems.filter(item => {
                    // Handle different possible ID fields in cart items - check multiple possible locations
                    const itemProductId = item.productId || item._id || item.id ||
                        (item.product && item.product._id) ||
                        (item.product && item.product.id);
                    const isMatch = promoProductIds.includes(itemProductId);
                    console.log('🔍 Checking item:', {
                        itemName: item.name,
                        itemProductId,
                        originalItem: item,
                        promoProductIds: promoProductIds,
                        isMatch
                    });
                    return isMatch;
                });

                totalQualifyingItems = qualifyingItems.reduce((total, item) => total + (item.quantity || 1), 0);

                // Calculate total price of qualifying items only
                applicableItemsTotal = qualifyingItems.reduce((total, item) => {
                    const itemPrice = item.totalPrice || (item.price * (item.quantity || 1));
                    return total + itemPrice;
                }, 0);

                console.log('🔍 Product-specific promo:', {
                    promoProductIds: promoProductIds,
                    cartItems: cartItems.map(item => ({
                        name: item.name,
                        productId: item.productId || item._id || item.id,
                        quantity: item.quantity
                    })),
                    qualifyingItems: qualifyingItems.map(item => ({
                        name: item.name,
                        productId: item.productId || item._id || item.id
                    })),
                    totalQualifyingItems,
                    applicableItemsTotal,
                    promoType: 'PRODUCT_SPECIFIC'
                });

                if (totalQualifyingItems === 0) {
                    return NextResponse.json(
                        { error: 'هذا الكود لا ينطبق على المنتجات المحددة في سلة التسوق' },
                        { status: 400 }
                    );
                }
            } else if (promoCode.productId) {
                // Legacy single product ID support
                console.log('🔍 Checking legacy single product ID:', promoCode.productId);
                const qualifyingItems = cartItems.filter(item => {
                    const itemProductId = item.productId || item._id || item.id;
                    const isMatch = itemProductId === promoCode.productId;
                    console.log('🔍 Legacy check - item:', {
                        itemName: item.name,
                        itemProductId,
                        promoProductId: promoCode.productId,
                        isMatch
                    });
                    return isMatch;
                });

                totalQualifyingItems = qualifyingItems.reduce((total, item) => total + (item.quantity || 1), 0);

                // Calculate total price of qualifying items only
                applicableItemsTotal = qualifyingItems.reduce((total, item) => {
                    const itemPrice = item.totalPrice || (item.price * (item.quantity || 1));
                    return total + itemPrice;
                }, 0);

                console.log('🔍 Legacy single product promo:', {
                    promoProductId: promoCode.productId,
                    qualifyingItems: qualifyingItems.length,
                    totalQualifyingItems,
                    applicableItemsTotal
                });

                if (totalQualifyingItems === 0) {
                    return NextResponse.json(
                        { error: 'هذا الكود لا ينطبق على المنتجات المحددة في سلة التسوق' },
                        { status: 400 }
                    );
                }
            } else {
                // No product restrictions - applies to all
                totalQualifyingItems = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
                console.log('✅ No product restrictions, applies to all:', totalQualifyingItems, 'items');
            }
        } else {
            // No cart items provided - fallback to simple validation
            totalQualifyingItems = 1;
            console.log('⚠️ No cart items provided, using fallback logic');
        }

        // Calculate discount using the appropriate total
        let discountAmount;
        if (promoCode.discountType === 'percentage') {
            discountAmount = (applicableItemsTotal * promoCode.discountValue) / 100;

            // Apply max discount cap if set
            if (promoCode.maxDiscountAmount && discountAmount > promoCode.maxDiscountAmount) {
                discountAmount = promoCode.maxDiscountAmount;
            }
        } else {
            // Fixed amount - apply per qualifying item or as single discount
            discountAmount = promoCode.discountValue * totalQualifyingItems;

            // Apply max discount cap if set
            if (promoCode.maxDiscountAmount && discountAmount > promoCode.maxDiscountAmount) {
                discountAmount = promoCode.maxDiscountAmount;
            }
        }

        // Ensure discount doesn't exceed applicable items total
        discountAmount = Math.min(discountAmount, applicableItemsTotal);

        console.log('✅ Promo code validated successfully:', {
            code: promoCode.code,
            discountType: promoCode.discountType,
            discountValue: promoCode.discountValue,
            calculatedDiscount: discountAmount,
            totalQualifyingItems,
            applicableItemsTotal,
            userUsageCount: userUsageCount,
            userUsageLimit: promoCode.userUsageLimit
        });

        return NextResponse.json({
            success: true,
            valid: true,
            // Frontend expects these fields at root level
            code: promoCode.code,
            type: promoCode.discountType,
            discount: promoCode.discountValue,
            discountAmount: discountAmount,
            totalQualifyingItems, // Now correctly calculated based on cart items
            message: `تم تطبيق كود الخصم! وفرت $${discountAmount.toFixed(2)}`
        });

    } catch (error) {
        console.error('❌ Error validating promo code:', error);
        return NextResponse.json(
            { error: 'Failed to validate promo code' },
            { status: 500 }
        );
    }
}
