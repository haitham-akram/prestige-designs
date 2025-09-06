# PayPal Webhook Integration Setup

This document explains how to set up and configure PayPal webhooks to automatically handle payment status updates, specifically for cases where PayPal holds payments for review and later approves them.

## Problem Solved

**Issue**: When customers pay via PayPal, sometimes PayPal holds transactions for security review. During this period, your system shows the payment as "waiting" or "pending". When PayPal later approves the payment and transfers money to your account, your system doesn't automatically update the payment status.

**Solution**: PayPal webhooks automatically notify your system when payment statuses change, allowing for real-time order updates.

## How It Works

1. **Customer pays** → PayPal creates order and may hold payment for review
2. **PayPal sends webhook** → Your system receives `PAYMENT.CAPTURE.PENDING` event
3. **PayPal approves payment** → Your system receives `PAYMENT.CAPTURE.COMPLETED` event
4. **Order automatically completed** → Files sent to customer, status updated

## Files Created/Modified

### New Files:

- `src/app/api/paypal/webhook/route.ts` - Webhook endpoint
- `src/lib/services/paypalWebhookService.ts` - Webhook processing logic

### Modified Files:

- `src/lib/paypal/service.ts` - Added webhook processing methods
- `src/lib/paypal/config.ts` - Added webhook configuration
- `src/lib/db/models/Order.ts` - Added webhook event tracking

## Environment Variables Required

Add these to your `.env.local` file:

```env
# PayPal Webhook Configuration
PAYPAL_WEBHOOK_SECRET=your_webhook_secret_from_paypal_dashboard

# Existing PayPal variables (should already be set)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
NEXTAUTH_URL=https://yourdomain.com
```

## PayPal Dashboard Setup

### 1. Create Webhook in PayPal Dashboard

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Select your app
3. Go to "Webhooks" section
4. Click "Add Webhook"

### 2. Webhook Configuration

**Webhook URL**: `https://yourdomain.com/api/paypal/webhook`

**Events to Subscribe To**:

- ✅ `PAYMENT.CAPTURE.COMPLETED` - Payment successfully captured
- ✅ `PAYMENT.CAPTURE.PENDING` - Payment held for review
- ✅ `PAYMENT.CAPTURE.DENIED` - Payment denied/failed
- ✅ `CHECKOUT.ORDER.APPROVED` - Customer approved order
- ✅ `CHECKOUT.ORDER.COMPLETED` - Order completed

### 3. Get Webhook Secret

1. After creating the webhook, PayPal will generate a webhook ID and secret
2. Copy the webhook secret and add it to your environment variables
3. The secret is used to verify webhook authenticity

## Testing the Integration

### 1. Test Webhook Endpoint

```bash
# Test that webhook endpoint is accessible
curl https://yourdomain.com/api/paypal/webhook

# Expected response:
{
  "message": "PayPal Webhook endpoint is active",
  "timestamp": "2025-01-XX...",
  "environment": "production"
}
```

### 2. Test with PayPal Sandbox

1. Use PayPal sandbox for testing
2. Create test orders that will be held for review
3. Check webhook events in PayPal dashboard
4. Verify order status updates in your database

### 3. Check Logs

Monitor your application logs for webhook events:

```
🔔 PayPal webhook received
📋 Webhook Event Type: PAYMENT.CAPTURE.COMPLETED
🆔 Webhook ID: WH-xxx
⏰ Timestamp: xxx
✅ Webhook signature verified
💰 Payment completed for order: PD-2025-XXX
🎉 Order updated from webhook - Payment completed: PD-2025-XXX
✅ Webhook processed successfully
```

## Webhook Event Types Handled

### PAYMENT.CAPTURE.COMPLETED

- **When**: Payment successfully captured (held payment is approved)
- **Action**: Completes order, sends files, updates status to "paid"
- **This solves your main problem**: Held payments are automatically processed when approved

### PAYMENT.CAPTURE.PENDING

- **When**: Payment is held for review
- **Action**: Updates order status to "pending", adds note about review

### PAYMENT.CAPTURE.DENIED

- **When**: Payment is denied by PayPal
- **Action**: Updates order status to "failed", cancels order

### CHECKOUT.ORDER.APPROVED

- **When**: Customer approves payment in PayPal
- **Action**: Logs approval event for tracking

### CHECKOUT.ORDER.COMPLETED

- **When**: Order completion notification from PayPal
- **Action**: Logs completion event for tracking

## Order Status Flow

```
Customer Pays → PayPal Review → PayPal Approves → Order Completed
     ↓              ↓              ↓               ↓
   pending     → pending     → paid          → completed
                 (webhook)     (webhook)       (automatic)
```

## Database Changes

### New Order Fields:

```typescript
// Webhook events tracking
webhookEvents?: {
    eventType: string;      // e.g., "PAYMENT.CAPTURE.COMPLETED"
    eventId: string;        // PayPal event ID (prevents duplicates)
    timestamp: Date;        // When webhook was received
    processed: boolean;     // Whether successfully processed
    data?: any;            // Raw webhook data for debugging
}[]
```

## Error Handling & Recovery

### Duplicate Prevention

- Each webhook event has a unique ID
- System checks if event was already processed
- Prevents duplicate order completion

### Failed Webhooks

- Failed webhooks are logged with error details
- Order history includes failure information
- Manual intervention possible via admin panel

### Webhook Retry

- PayPal automatically retries failed webhooks
- System returns 200 status even on errors to prevent infinite retries
- Check logs and order history for debugging

## Manual Recovery Options

If webhooks fail, you have these recovery options:

### 1. Admin Panel Integration

You can add an admin interface to:

- View webhook events for orders
- Manually trigger order completion
- Check PayPal payment status

### 2. Payment Status Check API

Create an endpoint to manually check PayPal payment status:

```typescript
// Future enhancement: Manual status check
GET /api/admin/orders/:orderId/check-payment-status
```

### 3. Bulk Processing Script

Create a script to check pending orders:

```typescript
// Future enhancement: Bulk status update
POST / api / admin / orders / bulk - check - payments
```

## Monitoring & Debugging

### Check Webhook Status

```typescript
import { PayPalWebhookService } from '@/lib/services/paypalWebhookService'

const status = await PayPalWebhookService.getWebhookStatus(orderId)
console.log({
  totalEvents: status.totalEvents,
  processedEvents: status.processedEvents,
  failedEvents: status.failedEvents,
  lastEvent: status.lastEvent,
})
```

### Order History

Every webhook event creates an order history entry:

- `webhook_payment_completed` - Payment completed via webhook
- `payment_pending_webhook` - Payment held for review
- `payment_denied_webhook` - Payment denied
- `webhook_error` - Webhook processing failed

## Security Notes

1. **Webhook Signature Verification**: Optional but recommended for production
2. **HTTPS Required**: PayPal requires HTTPS for webhook URLs
3. **Environment Isolation**: Use sandbox for testing, production for live
4. **Secret Management**: Keep webhook secrets secure

## Production Checklist

- [ ] Webhook URL is HTTPS and accessible
- [ ] Environment variables are set
- [ ] Webhook created in PayPal dashboard
- [ ] Correct events subscribed
- [ ] Webhook secret configured
- [ ] Testing completed in sandbox
- [ ] Monitoring and logging in place
- [ ] Error handling tested

## Support

If you encounter issues:

1. Check application logs for webhook events
2. Verify webhook configuration in PayPal dashboard
3. Test webhook endpoint accessibility
4. Check order history for webhook events
5. Verify environment variables are set correctly

The webhook system provides automatic handling of held payments, solving the main issue where PayPal holds transactions for review and later approves them without notifying your system.
