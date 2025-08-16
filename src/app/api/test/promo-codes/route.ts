import { NextResponse } from 'next/server';
import { PromoCode } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';

export async function GET() {
    try {
        await connectDB();

        const promoCodes = await PromoCode.find({
            isActive: true
        }).lean();

        return NextResponse.json({
            success: true,
            promoCodes: promoCodes.map(code => ({
                code: code.code,
                discountType: code.discountType,
                discountValue: code.discountValue,
                isActive: code.isActive,
                maxUses: code.maxUses,
                usedCount: code.usedCount,
                validFrom: code.validFrom,
                validUntil: code.validUntil,
                minimumOrderAmount: code.minimumOrderAmount
            }))
        });

    } catch (error) {
        console.error('Error fetching promo codes:', error);
        return NextResponse.json({
            error: 'Failed to fetch promo codes',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
