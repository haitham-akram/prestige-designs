# Discord Webhook Setup for Prestige Designs

## 🎯 What This Does

The Discord webhook integration sends real-time notifications to your Discord channel whenever a paid order is completed. This helps your admin team stay informed about new sales instantly.

## 📋 Setup Steps

### 1. Create Discord Webhook

1. Open your Discord server
2. Go to the channel where you want notifications
3. Right-click the channel → **Edit Channel**
4. Go to **Integrations** → **Webhooks**
5. Click **Create Webhook**
6. Choose a name (e.g., "Order Notifications")
7. Copy the **Webhook URL**

### 2. Add Environment Variable

Add this to your `.env.local` file:

```env
# Discord Webhook for paid order notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

Replace `YOUR_WEBHOOK_ID` and `YOUR_WEBHOOK_TOKEN` with your actual webhook URL.

### 3. Test the Integration

1. Start your development server: `npm run dev`
2. Login as admin
3. Go to: `http://localhost:3000/api/admin/test-discord-webhook` (POST request)
4. Or create a test button in your admin dashboard

## 🔔 What Gets Sent

When a paid order is completed, Discord will receive:

- ✅ **Order Number** (e.g., PD-2025-005)
- 👤 **Customer Name & Email**
- 💰 **Total Amount Paid**
- 📦 **Order Status** (Processing/Completed)
- 🛍️ **Products Ordered** with quantities and prices
- 🎨 **Customization Status** (needs custom work or ready to deliver)
- 📅 **Order Date & Time**

## 🎨 Message Format

The Discord message will appear as a beautiful embed with:

- 💰 Green color for paid orders
- 📊 Organized fields for easy reading
- 🕐 Timestamp of when the order was paid
- 🏷️ Footer with "Prestige Designs" branding

## 🔧 Technical Details

- Notifications are sent automatically when PayPal payments are processed
- Non-critical: If Discord is down, orders still complete normally
- Supports both immediate delivery and custom work orders
- Includes full order details for admin reference

## ⚠️ Security Note

Keep your webhook URL secure:

- Don't commit it to version control
- Use environment variables only
- Consider regenerating if compromised

## 🧪 Testing

You can test the webhook by:

1. Making a test purchase
2. Using the admin test endpoint
3. Checking Discord channel for notifications

The integration is now ready and will automatically notify your Discord channel of all paid orders! 🎉
