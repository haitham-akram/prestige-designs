/**
 * PayPal Webhook Order Status Update Service
 * 
 * This service handles order status updates triggered by PayPal webhooks.
 * It includes proper error handling, duplicate prevention, and audit trail.
 * 
 * Key Features:
 * - Idempotent webhook processing (prevents duplicate processing)
 * - Proper error handling and recovery
 * - Audit trail for all webhook events
 * - Order status synchronization with PayPal
 */

import { Order } from '@/lib/db/models';
import { IOrder } from '@/lib/db/models/Order';
import connectDB from '@/lib/db/connection';
import { PayPalService } from '@/lib/paypal/service';

export interface WebhookEventData {
    eventType: string;
    eventId: string;
    paypalOrderId?: string;
    captureId?: string;
    resource: any;
    timestamp: Date;
}

export interface OrderUpdateResult {
    success: boolean;
    message: string;
    orderId?: string;
    orderNumber?: string;
    action?: 'updated' | 'completed' | 'failed' | 'duplicate';
}

export class PayPalWebhookService {

    /**
     * Process webhook event and update order status
     * Includes duplicate prevention and error handling
     */
    static async processWebhookEvent(webhookData: WebhookEventData): Promise<OrderUpdateResult> {
        try {
            console.log('🔔 Processing webhook event:', webhookData.eventType);

            await connectDB();

            // Check if this webhook event has already been processed
            const existingOrder = await Order.findOne({
                'webhookEvents.eventId': webhookData.eventId
            });

            if (existingOrder) {
                console.log('⚠️ Webhook event already processed:', webhookData.eventId);
                return {
                    success: true,
                    message: 'Webhook event already processed (duplicate)',
                    orderId: existingOrder._id.toString(),
                    orderNumber: existingOrder.orderNumber,
                    action: 'duplicate'
                };
            }

            // Find the order by PayPal order ID
            let order: IOrder | null = null;

            if (webhookData.paypalOrderId) {
                order = await Order.findOne({ paypalOrderId: webhookData.paypalOrderId });
            } else if (webhookData.captureId) {
                // Try to find by transaction ID if no order ID is available
                order = await Order.findOne({ paypalTransactionId: webhookData.captureId });
            }

            if (!order) {
                console.warn('⚠️ Order not found for webhook event');
                return {
                    success: false,
                    message: 'Order not found for webhook event'
                };
            }

            // Log the webhook event
            await this.logWebhookEvent(order, webhookData);

            // Process based on event type
            const result = await this.handleWebhookByType(order, webhookData);

            console.log('✅ Webhook processed successfully:', result.message);
            return result;

        } catch (error) {
            console.error('❌ Error processing webhook event:', error);
            return {
                success: false,
                message: `Error processing webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Log webhook event to order for audit trail
     */
    private static async logWebhookEvent(order: IOrder, webhookData: WebhookEventData): Promise<void> {
        try {
            order.webhookEvents = order.webhookEvents || [];
            order.webhookEvents.push({
                eventType: webhookData.eventType,
                eventId: webhookData.eventId,
                timestamp: webhookData.timestamp,
                processed: false,
                data: webhookData.resource
            });

            await order.save();
            console.log('📝 Webhook event logged to order:', order.orderNumber);
        } catch (error) {
            console.error('❌ Error logging webhook event:', error);
            // Don't throw error, as this is just for audit trail
        }
    }

    /**
     * Handle webhook based on event type
     */
    private static async handleWebhookByType(order: IOrder, webhookData: WebhookEventData): Promise<OrderUpdateResult> {
        switch (webhookData.eventType) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                return await this.handlePaymentCompleted(order, webhookData);

            case 'PAYMENT.CAPTURE.PENDING':
                return await this.handlePaymentPending(order, webhookData);

            case 'PAYMENT.CAPTURE.DENIED':
                return await this.handlePaymentDenied(order, webhookData);

            default:
                return await this.handleGenericEvent(order, webhookData);
        }
    }

    /**
     * Handle payment completion from webhook
     * This is the main case we're solving - when PayPal approves a held payment
     */
    private static async handlePaymentCompleted(order: IOrder, webhookData: WebhookEventData): Promise<OrderUpdateResult> {
        try {
            // Check if order is already paid to prevent duplicate processing
            if (order.paymentStatus === 'paid') {
                console.log('⚠️ Order already paid, skipping duplicate processing');
                await this.markWebhookProcessed(order, webhookData.eventId);
                return {
                    success: true,
                    message: 'Order already paid (duplicate prevented)',
                    orderId: order._id.toString(),
                    orderNumber: order.orderNumber,
                    action: 'duplicate'
                };
            }

            console.log('💰 Payment completed for order:', order.orderNumber);

            // Extract payment details from webhook
            const captureData = {
                id: webhookData.resource.id,
                status: webhookData.resource.status,
                amount: {
                    currencyCode: webhookData.resource.amount.currency_code,
                    value: webhookData.resource.amount.value,
                },
                transactionId: webhookData.resource.id,
                payer: {
                    emailAddress: webhookData.resource.payer?.email_address || order.customerEmail,
                    name: webhookData.resource.payer?.name ? {
                        givenName: webhookData.resource.payer.name.given_name,
                        surname: webhookData.resource.payer.name.surname,
                    } : undefined,
                }
            };

            // Use existing PayPal service to complete the order
            const updatedOrder = await PayPalService.completeOrder(order._id.toString(), captureData);

            // Mark webhook as processed
            await this.markWebhookProcessed(updatedOrder, webhookData.eventId);

            // Add specific history entry for webhook completion
            updatedOrder.orderHistory.push({
                status: 'webhook_payment_completed',
                timestamp: new Date(),
                note: `Payment completed automatically via PayPal webhook (Event: ${webhookData.eventId})`,
                changedBy: 'system'
            });
            await updatedOrder.save();

            return {
                success: true,
                message: `Order ${order.orderNumber} payment completed via webhook`,
                orderId: updatedOrder._id.toString(),
                orderNumber: updatedOrder.orderNumber,
                action: 'completed'
            };

        } catch (error) {
            console.error('❌ Error handling payment completed webhook:', error);
            await this.markWebhookFailed(order, webhookData.eventId, error);
            throw error;
        }
    }

    /**
     * Handle payment pending from webhook
     */
    private static async handlePaymentPending(order: IOrder, webhookData: WebhookEventData): Promise<OrderUpdateResult> {
        try {
            console.log('⏳ Payment pending for order:', order.orderNumber);

            // Update order status to pending
            order.paymentStatus = 'pending';
            order.orderHistory.push({
                status: 'payment_pending_webhook',
                timestamp: new Date(),
                note: `Payment held for review by PayPal (Webhook: ${webhookData.eventId}). Reason: ${webhookData.resource.status_details?.reason || 'Unknown'}`,
                changedBy: 'system'
            });

            await order.save();
            await this.markWebhookProcessed(order, webhookData.eventId);

            return {
                success: true,
                message: `Order ${order.orderNumber} payment is pending review`,
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                action: 'updated'
            };

        } catch (error) {
            console.error('❌ Error handling payment pending webhook:', error);
            await this.markWebhookFailed(order, webhookData.eventId, error);
            throw error;
        }
    }

    /**
     * Handle payment denied from webhook
     */
    private static async handlePaymentDenied(order: IOrder, webhookData: WebhookEventData): Promise<OrderUpdateResult> {
        try {
            console.log('❌ Payment denied for order:', order.orderNumber);

            // Update order status to failed
            order.paymentStatus = 'failed';
            order.orderStatus = 'cancelled';
            order.orderHistory.push({
                status: 'payment_denied_webhook',
                timestamp: new Date(),
                note: `Payment denied by PayPal (Webhook: ${webhookData.eventId}). Reason: ${webhookData.resource.status_details?.reason || 'Unknown'}`,
                changedBy: 'system'
            });

            await order.save();
            await this.markWebhookProcessed(order, webhookData.eventId);

            return {
                success: true,
                message: `Order ${order.orderNumber} payment was denied`,
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                action: 'failed'
            };

        } catch (error) {
            console.error('❌ Error handling payment denied webhook:', error);
            await this.markWebhookFailed(order, webhookData.eventId, error);
            throw error;
        }
    }

    /**
     * Handle generic webhook events
     */
    private static async handleGenericEvent(order: IOrder, webhookData: WebhookEventData): Promise<OrderUpdateResult> {
        try {
            console.log('📋 Generic webhook event for order:', order.orderNumber, 'Event:', webhookData.eventType);

            // Just log the event without major changes
            order.orderHistory.push({
                status: 'webhook_event',
                timestamp: new Date(),
                note: `PayPal webhook event received: ${webhookData.eventType} (${webhookData.eventId})`,
                changedBy: 'system'
            });

            await order.save();
            await this.markWebhookProcessed(order, webhookData.eventId);

            return {
                success: true,
                message: `Webhook event ${webhookData.eventType} processed for order ${order.orderNumber}`,
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                action: 'updated'
            };

        } catch (error) {
            console.error('❌ Error handling generic webhook:', error);
            await this.markWebhookFailed(order, webhookData.eventId, error);
            throw error;
        }
    }

    /**
     * Mark webhook as successfully processed
     */
    private static async markWebhookProcessed(order: IOrder, eventId: string): Promise<void> {
        try {
            const webhookEvent = order.webhookEvents?.find(event => event.eventId === eventId);
            if (webhookEvent) {
                webhookEvent.processed = true;
                await order.save();
            }
        } catch (error) {
            console.error('❌ Error marking webhook as processed:', error);
            // Don't throw, as this is not critical
        }
    }

    /**
     * Mark webhook as failed
     */
    private static async markWebhookFailed(order: IOrder, eventId: string, error: any): Promise<void> {
        try {
            order.orderHistory.push({
                status: 'webhook_error',
                timestamp: new Date(),
                note: `Webhook processing failed for event ${eventId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                changedBy: 'system'
            });
            await order.save();
        } catch (saveError) {
            console.error('❌ Error marking webhook as failed:', saveError);
        }
    }

    /**
     * Get webhook processing status for an order
     */
    static async getWebhookStatus(orderId: string): Promise<{
        totalEvents: number;
        processedEvents: number;
        failedEvents: number;
        lastEvent?: {
            eventType: string;
            timestamp: Date;
            processed: boolean;
        };
    }> {
        try {
            await connectDB();

            const order = await Order.findById(orderId);
            if (!order || !order.webhookEvents) {
                return {
                    totalEvents: 0,
                    processedEvents: 0,
                    failedEvents: 0
                };
            }

            const events = order.webhookEvents;
            const processedEvents = events.filter(event => event.processed).length;
            const failedEvents = events.length - processedEvents;
            const lastEvent = events.length > 0 ? events[events.length - 1] : undefined;

            return {
                totalEvents: events.length,
                processedEvents,
                failedEvents,
                lastEvent: lastEvent ? {
                    eventType: lastEvent.eventType,
                    timestamp: lastEvent.timestamp,
                    processed: lastEvent.processed
                } : undefined
            };

        } catch (error) {
            console.error('❌ Error getting webhook status:', error);
            return {
                totalEvents: 0,
                processedEvents: 0,
                failedEvents: 0
            };
        }
    }
}
