# 📧 Email Service Setup Guide

## 🎯 Overview

The email service has been implemented with beautiful HTML templates using our brand colors and favicon as logo. It automatically sends emails when orders are completed or cancelled.

## ✨ Features

- **🎨 Beautiful Templates**: RTL Arabic design with our brand colors
- **📱 Responsive**: Works on all devices
- **🔗 Download Links**: Direct file download links for completed orders
- **⏰ Expiry Notices**: 30-day download link expiry warnings
- **📊 Order History**: Email events are logged in order history
- **🧪 Test Interface**: Admin test page for email functionality

## 🚀 Setup Instructions

### 1. Environment Variables

Add these variables to your `.env.local` file:

**Required:**

- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username/email
- `SMTP_PASS` - SMTP password/app password

**Optional:**

- `SMTP_FROM` - Custom "from" email address (defaults to SMTP_USER)

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@prestige-designs.com
```

### 2. Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Use the generated password** as `SMTP_PASS`

### 3. Alternative SMTP Providers

#### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@prestige-designs.com
```

#### AWS SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=noreply@prestige-designs.com
```

#### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=noreply@prestige-designs.com
```

## 📧 Email Templates

### 1. Order Completed Email

- **Subject**: `تم إكمال الطلب - [Order Number]`
- **Content**:
  - ✅ Order number and customer name
  - ✅ Download links for all design files
  - ✅ File sizes and types
  - ✅ 30-day expiry notice
  - ✅ Contact information

### 2. Order Cancelled Email

- **Subject**: `تم إلغاء الطلب - [Order Number]`
- **Content**:
  - ✅ Order number and customer name
  - ✅ Cancellation reason (if provided)
  - ✅ Apology message
  - ✅ Contact information

## 🎨 Design Features

### Email Sender

- **From Name**: "Prestige Designs"
- **From Email**: `noreply@prestige-designs.com` (configurable via `SMTP_FROM`)
- **Fallback**: Uses `SMTP_USER` if `SMTP_FROM` not set

### Color Scheme

- **Primary Purple**: `#8261c6`
- **Secondary Pink**: `#e260ef`
- **Success Green**: `#d8e864`
- **Dark Background**: `#202028`
- **Light Text**: `#fcebff`

### Logo

- **PD** initials in a circular design
- **Gradient background** matching our brand
- **Responsive design** for all screen sizes

## 🧪 Testing

### 1. Test Page

Visit `/admin/test-email` to:

- Test SMTP connection
- Send test emails
- Preview email templates

### 2. API Endpoints

- `GET /api/test-email` - Test connection
- `POST /api/test-email` - Send test email

### 3. Manual Testing

```bash
# Test connection
curl -X GET http://localhost:3000/api/test-email

# Send test email
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"emailType": "completed", "testEmail": "test@example.com"}'
```

## 🔄 Automatic Email Triggers

### Order Completion

When admin marks order as complete:

1. ✅ Order status updated to "completed"
2. ✅ Download links generated
3. ✅ Completion email sent automatically
4. ✅ Email event logged in order history

### Order Cancellation

When admin cancels order:

1. ✅ Order status updated to "cancelled"
2. ✅ Cancellation email sent automatically
3. ✅ Email event logged in order history

## 📁 File Structure

```
src/
├── lib/services/
│   └── emailService.ts          # Email service with templates
├── app/api/
│   └── test-email/
│       └── route.ts             # Test API endpoints
└── app/admin/
    └── test-email/
        └── page.tsx             # Test interface
```

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Failed**

   - Check SMTP credentials
   - Ensure 2FA is enabled for Gmail
   - Use app password, not regular password

2. **Connection Timeout**

   - Check firewall settings
   - Verify SMTP host and port
   - Try different SMTP provider

3. **Emails Not Sending**
   - Check console logs for errors
   - Verify environment variables
   - Test with `/admin/test-email`

### Debug Mode

Add to `.env.local`:

```env
DEBUG_EMAIL=true
```

This will log detailed email information to console.

## 📊 Email Tracking

All email events are logged in order history:

- `email_sent` status
- Timestamp
- Email type
- Admin who triggered it

## 🔒 Security

- **Admin-only access** to email functions
- **Environment variables** for sensitive data
- **Input validation** for email addresses
- **Error handling** for failed sends

## 🎯 Next Steps

1. **Configure SMTP** with your email provider
2. **Test connection** using `/admin/test-email`
3. **Send test emails** to verify templates
4. **Monitor email delivery** in order history

## 📞 Support

If you encounter issues:

1. Check the test page for connection status
2. Review console logs for error messages
3. Verify SMTP configuration
4. Test with different email providers

---

**Happy emailing! 🎉**
