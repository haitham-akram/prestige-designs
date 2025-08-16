import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Test promo code validation
        const { code, cartValue } = await request.json();

        console.log('🧪 Testing promo code:', code, 'for cart value:', cartValue);

        // Test validation API
        const validationResponse = await fetch(`${request.nextUrl.origin}/api/promo-codes/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: code,
                orderValue: cartValue
            })
        });

        const validationData = await validationResponse.json();

        console.log('🧪 Validation response:', validationData);

        return NextResponse.json({
            success: true,
            promoCodeTest: {
                inputCode: code,
                inputCartValue: cartValue,
                validationResponse: validationData,
                validationStatus: validationResponse.status
            }
        });

    } catch (error) {
        console.error('Error testing promo code:', error);
        return NextResponse.json({
            error: 'Promo code test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
