/**
 * PayPal Success Callback Route
 * 
 * Handles PayPal payment success callback
 * 
 * Route: GET /api/paypal/success
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token'); // PayPal order ID
    const PayerID = searchParams.get('PayerID');

    if (!token) {
        return NextResponse.redirect(new URL('/checkout/error?error=missing_token', request.url));
    }

    // Redirect to checkout success page with PayPal order ID
    const successUrl = new URL('/checkout/success', request.url);
    successUrl.searchParams.set('paypalOrderId', token);
    if (PayerID) {
        successUrl.searchParams.set('payerID', PayerID);
    }

    return NextResponse.redirect(successUrl);
}
