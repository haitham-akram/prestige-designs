/**
 * PayPal Webhook API Route
 * 
 * Handles PayPal webhook events for payment status updates.
 * This is crucial for handling cases where PayPal holds payments for review
 * and later approves them.
 * 
 * Route: POST /api/paypal/webhook
 * 
 * Key Events Handled:
 * - PAYMENT.CAPTURE.COMPLETED: Payment was successfully captured
 * - PAYMENT.CAPTURE.PENDING: Payment is pending (held for review)
 * - PAYMENT.CAPTURE.DENIED: Payment was denied
 * - CHECKOUT.ORDER.APPROVED: Order was approved by customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { PayPalService } from '@/lib/paypal/service';
import { headers } from 'next/headers';
import crypto from 'crypto';

// PayPal Webhook Event Types
export const PAYPAL_WEBHOOK_EVENTS = {
    PAYMENT_CAPTURE_COMPLETED: 'PAYMENT.CAPTURE.COMPLETED',
    PAYMENT_CAPTURE_PENDING: 'PAYMENT.CAPTURE.PENDING',
    PAYMENT_CAPTURE_DENIED: 'PAYMENT.CAPTURE.DENIED',
    CHECKOUT_ORDER_APPROVED: 'CHECKOUT.ORDER.APPROVED',
    CHECKOUT_ORDER_COMPLETED: 'CHECKOUT.ORDER.COMPLETED',
} as const;

// PayPal Webhook signature verification
async function verifyWebhookSignature(
    rawBody: string,
    signature: string,
    _webhookId: string
): Promise<boolean> {
    try {
        // Get webhook secret from environment
        const webhookSecret = process.env.PAYPAL_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.warn('⚠️ PayPal webhook secret not configured');
            return false;
        }

        // Create expected signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('base64');

        // Compare signatures
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        console.error('❌ Error verifying webhook signature:', error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        console.log('🔔 PayPal webhook received');

        // Get headers
        const headersList = headers();
        const signature = headersList.get('paypal-transmission-sig');
        const webhookId = headersList.get('paypal-transmission-id');
        const timestamp = headersList.get('paypal-transmission-time');

        // Get raw body for signature verification
        const rawBody = await request.text();
        let webhookData;

        try {
            webhookData = JSON.parse(rawBody);
        } catch {
            console.error('❌ Invalid JSON in webhook body');
            return NextResponse.json(
                { error: 'Invalid JSON' },
                { status: 400 }
            );
        }

        console.log('📋 Webhook Event Type:', webhookData.event_type);
        console.log('🆔 Webhook ID:', webhookId);
        console.log('⏰ Timestamp:', timestamp);

        // Verify webhook signature (optional but recommended)
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction && signature && webhookId) {
            const isValid = await verifyWebhookSignature(rawBody, signature, webhookId);
            if (!isValid) {
                console.error('❌ Invalid webhook signature');
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }
            console.log('✅ Webhook signature verified');
        } else if (isProduction) {
            console.warn('⚠️ Missing webhook signature in production');
        }

        // Process the webhook event
        const result = await PayPalService.processWebhookEvent(webhookData);

        if (result.success) {
            console.log('✅ Webhook processed successfully:', result.message);
            return NextResponse.json({
                success: true,
                message: result.message,
                orderId: result.orderId
            });
        } else {
            console.log('⚠️ Webhook processing failed:', result.message);
            return NextResponse.json({
                success: false,
                message: result.message
            }, { status: 400 });
        }

    } catch (error) {
        console.error('❌ Error processing PayPal webhook:', error);

        // Return 200 to acknowledge receipt even on error
        // This prevents PayPal from retrying the webhook
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 200 });
    }
}

// Handle GET requests for webhook verification (if needed)
export async function GET() {
    return NextResponse.json({
        message: 'PayPal Webhook endpoint is active',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
}
