/**
 * Discord Webhook Service
 * 
 * Sends notifications to Discord when paid orders are completed
 */

interface DiscordWebhookPayload {
    content?: string;
    embeds?: DiscordEmbed[];
}

interface DiscordEmbed {
    title: string;
    description?: string;
    color: number;
    fields: DiscordEmbedField[];
    timestamp: string;
    footer?: {
        text: string;
    };
}

interface DiscordEmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

interface OrderNotificationData {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    totalPrice: number;
    currency: string;
    items: Array<{
        productName: string;
        quantity: number;
        price: number;
    }>;
    paymentMethod: string;
    orderStatus: string;
    hasCustomizations: boolean;
    paidAt: Date;
}

export class DiscordWebhookService {
    private static webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    /**
     * Send paid order notification to Discord
     */
    static async sendPaidOrderNotification(orderData: OrderNotificationData): Promise<{ success: boolean; error?: string }> {
        try {
            if (!this.webhookUrl) {
                console.log('⚠️ Discord webhook URL not configured, skipping notification');
                return { success: false, error: 'Webhook URL not configured' };
            }

            console.log('🔔 Sending Discord notification for paid order:', orderData.orderNumber);

            // Format total price
            const formattedPrice = `$${orderData.totalPrice.toFixed(2)} ${orderData.currency}`;

            // Create embed
            const embed: DiscordEmbed = {
                title: '💰 طلب مدفوع جديد',
                description: `تم تأكيد طلب جديد برقم: **${orderData.orderNumber}**`,
                color: 0x00FF00, // Green color for paid orders
                fields: [
                    {
                        name: '👤 العميل',
                        value: `**${orderData.customerName}**\n${orderData.customerEmail}`,
                        inline: true
                    },
                    {
                        name: '💳 المبلغ المدفوع',
                        value: formattedPrice,
                        inline: true
                    },
                    {
                        name: '📦 حالة الطلب',
                        value: orderData.orderStatus === 'processing' ? '🔄 قيد المعالجة' :
                            orderData.orderStatus === 'completed' ? '✅ مكتمل' : orderData.orderStatus,
                        inline: true
                    },
                    {
                        name: '🛍️ المنتجات',
                        value: orderData.items.map(item =>
                            `• ${item.productName || 'منتج غير محدد'} (${item.quantity || 1}x) - $${(item.price || 0).toFixed(2)}`
                        ).join('\n') || 'لا توجد تفاصيل',
                        inline: false
                    },
                    {
                        name: '🎨 تخصيصات',
                        value: orderData.hasCustomizations ? '✅ يحتاج تخصيصات' : '❌ جاهز للتسليم',
                        inline: true
                    },
                    {
                        name: '💳 طريقة الدفع',
                        value: orderData.paymentMethod || 'PayPal',
                        inline: true
                    }
                ],
                timestamp: orderData.paidAt.toISOString(),
                footer: {
                    text: 'Prestige Designs - نظام إدارة الطلبات'
                }
            };

            const payload: DiscordWebhookPayload = {
                embeds: [embed]
            };

            // Send to Discord
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                console.log('✅ Discord notification sent successfully');
                return { success: true };
            } else {
                const errorText = await response.text();
                console.error('❌ Discord webhook failed:', response.status, errorText);
                return { success: false, error: `HTTP ${response.status}: ${errorText}` };
            }

        } catch (error) {
            console.error('❌ Error sending Discord notification:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Test Discord webhook connection
     */
    static async testWebhook(): Promise<{ success: boolean; error?: string }> {
        try {
            if (!this.webhookUrl) {
                return { success: false, error: 'Webhook URL not configured' };
            }

            const testEmbed: DiscordEmbed = {
                title: '🧪 اختبار الاتصال',
                description: 'هذه رسالة اختبار من نظام Prestige Designs',
                color: 0x0099FF, // Blue color for test
                fields: [
                    {
                        name: '✅ الحالة',
                        value: 'الاتصال يعمل بشكل صحيح',
                        inline: false
                    }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'اختبار Discord Webhook'
                }
            };

            const payload: DiscordWebhookPayload = {
                embeds: [testEmbed]
            };

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                return { success: true };
            } else {
                const errorText = await response.text();
                return { success: false, error: `HTTP ${response.status}: ${errorText}` };
            }

        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}
