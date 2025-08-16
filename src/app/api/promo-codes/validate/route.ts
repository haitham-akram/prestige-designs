/**
 * Public Promo Code Validation API
 * 
 * Validates promo codes for customers during checkout
 * 
 * Route: POST /api/promo-codes/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import PromoCode from '@/lib/db/models/PromoCode';
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

        // Check if promo code is still valid (date range)
        const now = new Date();
        if (promoCode.validFrom && now < promoCode.validFrom) {
            return NextResponse.json(
                { error: 'كود الخصم لم يصبح ساري المفعول بعد' },
                { status: 400 }
            );
        }

        if (promoCode.validUntil && now > promoCode.validUntil) {
            return NextResponse.json(
                { error: 'انتهت صلاحية كود الخصم' },
                { status: 400 }
            );
        }

        // Check minimum order amount
        if (promoCode.minimumOrderAmount && orderValue < promoCode.minimumOrderAmount) {
            return NextResponse.json(
                { error: `الحد الأدنى لقيمة الطلب هو $${promoCode.minimumOrderAmount}` },
                { status: 400 }
            );
        }

        // Check usage limits
        if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
            return NextResponse.json(
                { error: 'تم استنفاد عدد مرات الاستخدام لهذا الكود' },
                { status: 400 }
            );
        }

        // Calculate discount
        let discountAmount = 0;
        if (promoCode.discountType === 'percentage') {
            discountAmount = (calculationBase * promoCode.discountValue) / 100;
        } else if (promoCode.discountType === 'fixed_amount') {
            discountAmount = promoCode.discountValue;
        }

        // Ensure discount doesn't exceed calculation base (current total)
        discountAmount = Math.min(discountAmount, calculationBase);

        console.log('✅ Promo code validated successfully:', {
            code: promoCode.code,
            discountType: promoCode.discountType,
            discountValue: promoCode.discountValue,
            calculatedDiscount: discountAmount
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
