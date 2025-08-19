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
        const { code, orderValue, currentTotal } = body;

        if (!code || typeof orderValue !== 'number') {
            return NextResponse.json(
                { error: 'كود الخصم وقيمة الطلب مطلوبة' },
                { status: 400 }
            );
        }

        // Use currentTotal (after existing discounts) for promo calculation, fallback to orderValue
        const calculationBase = typeof currentTotal === 'number' ? currentTotal : orderValue;

        console.log('🔍 Validating promo code:', code, 'for order value:', orderValue, 'calculation base:', calculationBase);

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

        // Calculate discount using the promo code's built-in method
        // This ensures proper calculation based on the current total (after existing discounts)
        const discountAmount = promoCode.calculateDiscount(calculationBase);

        console.log('✅ Promo code validated successfully:', {
            code: promoCode.code,
            discountType: promoCode.discountType,
            discountValue: promoCode.discountValue,
            calculatedDiscount: discountAmount,
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
            totalQualifyingItems: 1, // For single item orders
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
