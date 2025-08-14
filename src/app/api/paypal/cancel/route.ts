/**
 * PayPal Cancel Callback Route
 * 
 * Handles PayPal payment cancellation callback
 * 
 * Route: GET /api/paypal/cancel
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token'); // PayPal order ID

    // Redirect to checkout cancel page
    const cancelUrl = new URL('/checkout/cancel', request.url);
    if (token) {
        cancelUrl.searchParams.set('paypalOrderId', token);
    }

    return NextResponse.redirect(cancelUrl);
}
