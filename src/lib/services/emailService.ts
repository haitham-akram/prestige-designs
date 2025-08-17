import nodemailer from 'nodemailer';

// Email configuration
const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};

// Email sender configuration
const emailSender = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@prestige-designs.com',
    name: 'Prestige Designs'
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Color scheme from our CSS
const colors = {
    primary: '#8261c6',      // Purple primary
    secondary: '#e260ef',    // Pink accent
    success: '#d8e864',      // Lime green
    dark: '#202028',         // Dark primary
    light: '#fcebff',        // Light primary
    text: '#a1a1aa',         // Text secondary
    border: '#3f3f46',       // Border color
};

// Helper function to get branding settings
const getBrandingSettings = async () => {
    try {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // Try to fetch from API
        const response = await fetch(`${baseUrl}/api/settings/branding`, {
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const data = await response.json();
            // Ensure we have a valid branding response with logo
            if (data && (data.siteName || data.logoUrl)) {
                return {
                    siteName: data.siteName || 'Prestige Designs',
                    logoUrl: data.logoUrl || `${baseUrl}/site/logo.png`,
                    faviconUrl: data.faviconUrl
                };
            }
        }
    } catch (error) {
        console.error('Error fetching branding settings:', error);
    }

    // Return default branding with logo if fetch fails
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return {
        siteName: 'Prestige Designs',
        logoUrl: `${baseUrl}/site/logo.png`, // Always include our logo
        faviconUrl: null
    };
};

// Base email template with our branding
const createBaseTemplate = async (content: string, title: string) => {
    const branding = await getBrandingSettings();

    // Always include logo - either from branding settings or default
    const logoUrl = branding.logoUrl || `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/site/logo.png`;
    const logoHtml = `<img src="${logoUrl}" alt="${branding.siteName || 'Prestige Designs'}" class="logo" onerror="this.style.display='none'" />`;

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, ${colors.dark} 0%, #252530 100%);
            color: ${colors.light};
            line-height: 1.6;
            direction: rtl;
            text-align: right !important;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: ${colors.dark};
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .header {
            background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
            padding: 30px;
            text-align: center;
            position: relative;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            display: block;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(130, 97, 198, 0.3);
        }
        
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
        }
        
        .tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
        }
        
        .content {
            padding: 40px 30px;
            background: ${colors.dark};
        }
        
        .title {
            font-size: 24px;
            font-weight: bold;
            color: ${colors.light};
            margin-bottom: 20px;
            text-align: right !important;
        }
        
        .message {
            font-size: 16px;
            color: ${colors.text};
            margin-bottom: 30px;
            line-height: 1.8;
            text-align: right !important;
        }
        
        .order-info {
            background: rgba(130, 97, 198, 0.1);
            border: 1px solid rgba(130, 97, 198, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .order-number {
            font-size: 18px;
            font-weight: bold;
            color: ${colors.primary};
            margin-bottom: 10px;
            text-align: right !important;
            direction: rtl !important;
           
        }
        
        .download-section {
            background: rgba(216, 232, 100, 0.1);
            border: 1px solid rgba(216, 232, 100, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .download-title {
            font-size: 18px;
            font-weight: bold;
            color: ${colors.success};
            margin-bottom: 15px;
            text-align: right !important;
        }
        
        .download-link {
            display: inline-block;
            background: linear-gradient(135deg, ${colors.success} 0%, #c4d84a 100%);
            color: ${colors.dark};
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            margin: 10px 5px;
            transition: all 0.3s ease;
        }
        
        .download-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(216, 232, 100, 0.4);
        }
        
        .file-info {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid ${colors.primary};
            text-align: right !important;
            direction: rtl !important;
        }
        
        .file-name {
            font-weight: bold;
            color: ${colors.light};
            margin-bottom: 5px;
            text-align: right !important;
        }
        
        .file-size {
            color: ${colors.text};
            font-size: 14px;
            text-align: right !important;
        }
        
        .expiry-notice {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: right !important;
        }
        
        .expiry-text {
            color: #fca5a5;
            font-size: 14px;
            text-align: right !important;
        }
        
        .refund-notice {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: right !important;
        }
        
        .refund-title {
            font-size: 18px;
            font-weight: bold;
            color: #22c55e;
            margin-bottom: 10px;
        }
        
        .refund-text {
            color: ${colors.text};
            font-size: 14px;
            line-height: 1.6;
        }
        
        .footer {
            background: ${colors.dark};
            padding: 30px;
            text-align: right !important;
            border-top: 1px solid ${colors.border};
        }
        
        .footer-text {
            color: ${colors.text};
            font-size: 14px;
            margin-bottom: 15px;
            text-align: right !important;
        }
        
        .contact-info {
            color: ${colors.primary};
            font-size: 16px;
            margin-bottom: 15px;
            text-align: right !important;
        }
        
        .whatsapp-contact {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #25D366;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin: 10px 0;
            transition: all 0.3s ease;
        }
        
        .whatsapp-contact:hover {
            background: #128C7E;
            transform: translateY(-2px);
        }
        
        .social-links {
            margin-top: 20px;
        }
        
        .social-link {
            display: inline-block;
            margin: 0 10px;
            color: ${colors.primary};
            text-decoration: none;
            font-size: 16px;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 10px;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .title {
                font-size: 20px;
            }
            
            .company-name {
                font-size: 24px;
            }
        }

        .order-reason {
            text-align: right !important;
            direction: rtl !important;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            ${logoHtml}
            <div class="company-name">${branding.siteName || 'Prestige Designs'}</div>
            <div class="tagline">تصاميم فاخرة ومميزة</div>
        </div>
        
        <div class="content">
            ${content}
        </div>
        
        <div class="footer">
            <div class="footer-text">
                شكراً لثقتكم في خدماتنا
            </div>
            <div class="contact-info">
                للتواصل معنا:
            </div>
            <a href="https://wa.me/972597607959" class="whatsapp-contact">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                واتساب: +972 59-760-7959
            </a>
            <div class="social-links">
                <a href="https://www.facebook.com/prestigedesigns" class="social-link">فيسبوك</a>
                <a href="https://x.com/prestigedesigns" class="social-link">تويتر</a>
                <a href="https://www.instagram.com/prestigedesigns" class="social-link">إنستغرام</a>
            </div>
        </div>
    </div>
</body>
</html>
`;
};

// Free order completion email template
const createFreeOrderCompletedTemplate = async (orderData: {
    orderNumber: string;
    customerName: string;
    downloadLinks?: Array<{
        fileName: string;
        fileUrl: string;
        fileSize: number;
        fileType: string;
    }>;
}) => {
    const hasFiles = orderData.downloadLinks && orderData.downloadLinks.length > 0;

    const fileList = hasFiles ? orderData.downloadLinks!.map(file => `
    <div class="file-info">
      <div class="file-name">${file.fileName}</div>
      <div class="file-size">${(file.fileSize / 1024 / 1024).toFixed(2)} MB</div>
      <a href="${file.fileUrl}" class="download-link">تحميل الملف</a>
    </div>
  `).join('') : '';

    const content = `
    <div class="title">تم قبول طلبك المجاني بنجاح! 🎉</div>
    
    <div class="message">
      مرحباً ${orderData.customerName}،
      <br><br>
      يسعدنا إعلامك بأن طلبك المجاني قد تم قبوله بنجاح. ${hasFiles ? 'يمكنك الآن تحميل ملفات التصميم الخاصة بك.' : 'سيتم إضافة ملفات التصميم قريباً وإرسال إشعار لك.'}
    </div>
    
    <div class="order-info">
      <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
      <div style="margin-top: 10px; color: #22c55e; font-weight: bold; font-size: 16px;">
        💚 طلب مجاني - $0.00
      </div>
    </div>
    
    ${hasFiles ? `
    <div class="download-section">
      <div class="download-title">📁 ملفات التصميم الجاهزة للتحميل</div>
      ${fileList}
    </div>
    ` : `
    <div class="order-info">
      <div style="color: ${colors.success}; font-size: 16px; margin-top: 15px; padding: 15px; background: rgba(216, 232, 100, 0.1); border-radius: 8px; border: 1px solid rgba(216, 232, 100, 0.3);">
        🕒 ملفات التصميم ستكون جاهزة قريباً وسيتم إرسال رابط التحميل لك على هذا البريد الإلكتروني.
      </div>
    </div>
    `}
    
    <div class="message">
      شكراً لثقتكم في خدماتنا المجانية! إذا كان لديك أي استفسار، لا تتردد في التواصل معنا.
      <br><br>
      فريق Prestige Designs ❤️
    </div>
  `;

    return await createBaseTemplate(content, `تم قبول الطلب المجاني - ${orderData.orderNumber}`);
};

// Order completed email template
const createOrderCompletedTemplate = async (orderData: {
    orderNumber: string;
    customerName: string;
    downloadLinks: Array<{
        fileName: string;
        fileUrl: string;
        fileSize: number;
        fileType: string;
    }>;
    downloadExpiry: Date;
}) => {
    const fileList = orderData.downloadLinks.map(file => `
    <div class="file-info">
      <div class="file-name">${file.fileName}</div>
      <div class="file-size">${(file.fileSize / 1024 / 1024).toFixed(2)} MB</div>
      <a href="${file.fileUrl}" class="download-link">تحميل الملف</a>
    </div>
  `).join('');

    const content = `
    <div class="title">تم إكمال طلبك بنجاح! 🎉</div>
    
    <div class="message">
      مرحباً ${orderData.customerName}،
      <br><br>
      يسعدنا إعلامك بأن طلبك قد تم إكماله بنجاح. يمكنك الآن تحميل ملفات التصميم الخاصة بك.
    </div>
    
    <div class="order-info">
      <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
    </div>
    
    <div class="download-section">
      <div class="download-title">📁 ملفات التصميم الجاهزة للتحميل</div>
      ${fileList}
    </div>
    
    <div class="expiry-notice">
      <div class="expiry-text">
        ⏰ تنبيه: روابط التحميل صالحة لمدة 30 يوماً فقط
        <br>
        تاريخ انتهاء الصلاحية: ${orderData.downloadExpiry.toLocaleDateString('ar-SA')}
      </div>
    </div>
    
    <div class="message">
      إذا واجهت أي مشكلة في التحميل، لا تتردد في التواصل معنا.
      <br><br>
      شكراً لثقتكم في خدماتنا!
    </div>
  `;

    return await createBaseTemplate(content, `تم إكمال الطلب - ${orderData.orderNumber}`);
};

// Order cancelled email template
const createOrderCancelledTemplate = async (orderData: {
    orderNumber: string;
    customerName: string;
    reason?: string;
}) => {
    const content = `
        <div class="title">تم إلغاء طلبك</div>
        
        <div class="message">
            مرحباً ${orderData.customerName}،
            <br><br>
            نعتذر لإعلامك بأن طلبك قد تم إلغاؤه.
        </div>
        
        <div class="order-info">
            <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
            ${orderData.reason ? `<div class="order-reason" style="margin-top: 10px; color: ${colors.text};">السبب: ${orderData.reason}</div>` : ''}
        </div>
        
        <div class="refund-notice">
            <div class="refund-title">💰 استرداد المبلغ</div>
            <div class="refund-text">
               .الخاص بك خلال 3-5 أيام عمل PayPal سيتم إرسال المبلغ المدفوع إلى حساب
            </div>
        </div>
        
        <div class="message">
            إذا كان لديك أي استفسار حول هذا الإلغاء أو الاسترداد، يرجى التواصل معنا.
            <br><br>
            نعتذر عن أي إزعاج قد تسببنا به.
        </div>
    `;

    return await createBaseTemplate(content, `تم إلغاء الطلب - ${orderData.orderNumber}`);
};

// Email service class
export class EmailService {
    /**
     * Send free order completed email
     */
    static async sendFreeOrderCompletedEmail(
        to: string,
        orderData: {
            orderNumber: string;
            customerName: string;
            downloadLinks?: Array<{
                fileName: string;
                fileUrl: string;
                fileSize: number;
                fileType: string;
            }>;
        }
    ) {
        try {
            const html = await createFreeOrderCompletedTemplate(orderData);

            const mailOptions = {
                from: `"${emailSender.name}" <${emailSender.from}>`,
                to: to,
                subject: `تم قبول الطلب المجاني - ${orderData.orderNumber}`,
                html: html,
            };

            const result = await transporter.sendMail(mailOptions) as { messageId: string };
            console.log('✅ Free order completed email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Error sending free order completed email:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Send order completed email
     */
    static async sendOrderCompletedEmail(
        to: string,
        orderData: {
            orderNumber: string;
            customerName: string;
            downloadLinks: Array<{
                fileName: string;
                fileUrl: string;
                fileSize: number;
                fileType: string;
            }>;
            downloadExpiry: Date;
        }
    ) {
        try {
            const html = await createOrderCompletedTemplate(orderData);

            const mailOptions = {
                from: `"${emailSender.name}" <${emailSender.from}>`,
                to: to,
                subject: `تم إكمال الطلب - ${orderData.orderNumber}`,
                html: html,
            };

            const result = await transporter.sendMail(mailOptions) as { messageId: string };
            console.log('✅ Order completed email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Error sending order completed email:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Send order cancelled email
     */
    static async sendOrderCancelledEmail(
        to: string,
        orderData: {
            orderNumber: string;
            customerName: string;
            reason?: string;
        }
    ) {
        try {
            const html = await createOrderCancelledTemplate(orderData);

            const mailOptions = {
                from: `"${emailSender.name}" <${emailSender.from}>`,
                to: to,
                subject: `تم إلغاء الطلب - ${orderData.orderNumber}`,
                html: html,
            };

            const result = await transporter.sendMail(mailOptions) as { messageId: string };
            console.log('✅ Order cancelled email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Error sending order cancelled email:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Send custom message email
     */
    static async sendCustomMessage(
        to: string,
        messageData: {
            orderNumber: string;
            customerName: string;
            subject: string;
            message: string;
        }
    ) {
        try {
            const content = `
                <div class="order-info">
                    <div class="order-number">رقم الطلب: ${messageData.orderNumber}</div>
                    <div class="customer-name">عزيزي ${messageData.customerName}</div>
                </div>
                
                <div class="message">
                    ${messageData.message}
                </div>
                
                <div class="message">
                    شكراً لثقتك في خدماتنا!
                    <br><br>
                    فريق Prestige Designs
                </div>
            `;

            const html = await createBaseTemplate(content, messageData.subject);

            const mailOptions = {
                from: `"${emailSender.name}" <${emailSender.from}>`,
                to: to,
                subject: messageData.subject,
                html: html,
            };

            const result = await transporter.sendMail(mailOptions) as { messageId: string };
            console.log('✅ Custom message email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Error sending custom message email:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Test email configuration
     */
    static async testConnection() {
        try {
            await transporter.verify();
            console.log('✅ Email service is ready');
            return { success: true };
        } catch (error) {
            console.error('❌ Email service connection failed:', error);
            return { success: false, error: (error as Error).message };
        }
    }
} 