// import nodemailer from 'nodemailer';

// // Email configuration
// const emailConfig = {
//     host: process.env.SMTP_HOST || 'smtp.gmail.com',
//     port: parseInt(process.env.SMTP_PORT || '587'),
//     secure: false, // true for 465, false for other ports
//     auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//     },
// };

// // Email sender configuration
// const emailSender = {
//     from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@prestige-designs.com',
//     name: 'Prestige Designs'
// };

// // Create transporter
// const transporter = nodemailer.createTransport(emailConfig);

// // Color scheme from our CSS - Updated for better dark theme
// const colors = {
//     primary: '#8261c6',      // Purple primary
//     secondary: '#e260ef',    // Pink accent
//     success: '#d8e864',      // Lime green
//     dark: '#1a1a1f',         // Darker primary for better contrast
//     cardDark: '#202028',     // Card background
//     light: '#fcebff',        // Light primary
//     text: '#d1d5db',         // Better text readability
//     textSecondary: '#9ca3af', // Secondary text
//     border: '#374151',       // Better border color
//     gradient: 'linear-gradient(135deg, #1a1a1f 0%, #202028 100%)', // Dark gradient
// };

// // Helper function to get branding settings
// const getBrandingSettings = async () => {
//     try {
//         const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

//         // Try to fetch from API
//         const response = await fetch(`${baseUrl}/api/settings`, {
//             cache: 'no-store',
//             headers: {
//                 'Accept': 'application/json',
//                 'Content-Type': 'application/json',
//             }
//         });

//         if (response.ok) {
//             const data = await response.json();
//             // Ensure we have valid settings response
//             if (data?.data) {
//                 return {
//                     siteName: data.data.branding?.siteName || 'Prestige Designs',
//                     logoUrl: data.data.branding?.logoUrl || `${baseUrl}/site/logo.png`,
//                     faviconUrl: data.data.branding?.faviconUrl,
//                     whatsappNumber: data.data.social?.whatsapp || 'https://wa.me/972597607959',
//                     tiktokUrl: data.data.social?.tiktok,
//                     discordUrl: data.data.social?.discord,
//                     telegramUrl: data.data.social?.telegram
//                 };
//             }
//         }
//     } catch (error) {
//         console.error('Error fetching settings:', error);
//     }

//     // Return default settings with logo if fetch fails
//     const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
//     return {
//         siteName: 'Prestige Designs',
//         logoUrl: `${baseUrl}/site/logo.png`, // Always include our logo
//         faviconUrl: null,
//         whatsappNumber: 'https://wa.me/972597607959', // Default fallback
//         tiktokUrl: null,
//         discordUrl: null,
//         telegramUrl: null
//     };
// };

// // Base email template with our branding
// const createBaseTemplate = async (content: string, title: string) => {
//     const branding = await getBrandingSettings();

//     // Always include logo - either from branding settings or default
//     const logoUrl = branding.logoUrl || `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/site/logo.png`;

//     // Create logo HTML with better email client compatibility
//     const logoHtml = `
//         <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
//             <tr>
//                 <td align="center" valign="middle">
//                     <img src="${logoUrl}" 
//                          alt="${branding.siteName || 'Prestige Designs'}" 
//                          class="logo" 
//                          style="width: 80px !important; height: 80px !important; display: block !important; margin: 0 auto !important; border-radius: 12px !important; padding: 8px !important; object-fit: contain !important; box-shadow: 0 2px 10px rgba(130, 97, 198, 0.3) !important; max-width: 80px !important; max-height: 80px !important;" 
//                          width="80" 
//                          height="80"
//                          border="0"
//                          onerror="this.style.display='none'" />
//                 </td>
//             </tr>
//         </table>
//     `;

//     return `
// <!DOCTYPE html>
// <html dir="rtl" lang="ar">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <meta http-equiv="X-UA-Compatible" content="IE=edge">
//     <title>${title}</title>
//     <style>
//         /* Reset */
//         * {
//             margin: 0 !important;
//             padding: 0 !important;
//             box-sizing: border-box !important;
//         }

//         /* Prevent email client wrapper issues */
//         table, td, th {
//             border-collapse: collapse !important;
//         }

//         body {
//             font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
//             background: ${colors.dark} !important;
//             color: ${colors.light} !important;
//             line-height: 1.6 !important;
//             direction: rtl !important;
//             text-align: right !important;
//             margin: 0 !important;
//             padding: 0 !important;
//             width: 100% !important;
//             min-height: 100vh !important;
//             -webkit-text-size-adjust: 100% !important;
//             -ms-text-size-adjust: 100% !important;
//         }

//         /* Main container */
//         .email-wrapper {
//             width: 100% !important;
//             background: ${colors.dark} !important;
//             margin: 0 !important;
//             padding: 20px 0 !important;
//         }

//         .email-container {
//             max-width: 600px !important;
//             margin: 0 auto !important;
//             background: ${colors.cardDark} !important;
//             border-radius: 12px !important;
//             overflow: hidden !important;
//             box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
//             border: 1px solid ${colors.border} !important;
//         }

//         .header {
//             background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%) !important;
//             padding: 40px 30px !important;
//             text-align: center !important;
//         }

//         .logo-container {
//             text-align: center !important;
//             margin-bottom: 20px !important;
//             display: block !important;
//             width: 100% !important;
//         }

//         .logo {
//             width: 80px !important;
//             height: 80px !important;
//             margin: 0 auto !important;
//             display: block !important;
//             border-radius: 12px !important;
//             box-shadow: 0 2px 10px rgba(130, 97, 198, 0.3) !important;
//             padding: 8px !important;
//             object-fit: contain !important;
//             max-width: 80px !important;
//             max-height: 80px !important;
//             vertical-align: middle !important;
//             /* Prevent download overlay in email clients */
//             -webkit-touch-callout: none !important;
//             -webkit-user-select: none !important;
//             -moz-user-select: none !important;
//             -ms-user-select: none !important;
//             user-select: none !important;
//             pointer-events: none !important;
//         }

//         .company-name {
//             font-size: 32px !important;
//             font-weight: bold !important;
//             color: white !important;
//             margin-bottom: 10px !important;
//             text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
//         }

//         .tagline {
//             color: rgba(255, 255, 255, 0.95) !important;
//             font-size: 18px !important;
//             font-weight: 500 !important;
//         }

//         .content {
//             padding: 40px 30px !important;
//             background: ${colors.cardDark} !important;
//         }

//         .title {
//             font-size: 28px !important;
//             font-weight: bold !important;
//             color: ${colors.light} !important;
//             margin-bottom: 25px !important;
//             text-align: right !important;
//             line-height: 1.3 !important;
//         }

//         .message {
//             font-size: 18px !important;
//             color: ${colors.text} !important;
//             margin-bottom: 30px !important;
//             line-height: 1.7 !important;
//             text-align: right !important;
//         }

//         .order-info {
//             background: rgba(130, 97, 198, 0.15) !important;
//             border: 1px solid rgba(130, 97, 198, 0.4) !important;
//             border-radius: 12px !important;
//             padding: 25px !important;
//             margin: 25px 0 !important;
//         }

//         .order-number {
//             font-size: 20px !important;
//             font-weight: bold !important;
//             color: ${colors.primary} !important;
//             margin-bottom: 15px !important;
//             text-align: right !important;
//             direction: rtl !important;
//         }

//         .order-price {
//             font-size: 18px !important;
//             font-weight: bold !important;
//             text-align: right !important;
//             direction: rtl !important;
//             margin-top: 10px !important;
//         }

//         .download-section {
//             background: rgba(216, 232, 100, 0.15) !important;
//             border: 1px solid rgba(216, 232, 100, 0.4) !important;
//             border-radius: 12px !important;
//             padding: 25px !important;
//             margin: 25px 0 !important;
//         }

//         .download-title {
//             font-size: 20px !important;
//             font-weight: bold !important;
//             color: ${colors.success} !important;
//             margin-bottom: 20px !important;
//             text-align: right !important;
//         }

//         .download-link {
//             display: inline-block !important;
//             background: linear-gradient(135deg, ${colors.success} 0%, #b8d432 100%) !important;
//             color: ${colors.dark} !important;
//             text-decoration: none !important;
//             padding: 14px 28px !important;
//             border-radius: 10px !important;
//             font-weight: bold !important;
//             font-size: 16px !important;
//             margin: 10px 5px !important;
//             transition: all 0.3s ease !important;
//             box-shadow: 0 2px 8px rgba(216, 232, 100, 0.3) !important;
//         }

//         .file-info {
//             background: rgba(255, 255, 255, 0.08) !important;
//             border-radius: 10px !important;
//             padding: 20px !important;
//             margin: 15px 0 !important;
//             border-right: 4px solid ${colors.primary} !important;
//             text-align: right !important;
//             direction: rtl !important;
//         }

//         .file-name {
//             font-weight: bold !important;
//             color: ${colors.light} !important;
//             margin-bottom: 8px !important;
//             font-size: 16px !important;
//             text-align: right !important;
//         }

//         .file-size {
//             color: ${colors.textSecondary} !important;
//             font-size: 14px !important;
//             text-align: right !important;
//         }

//         .expiry-notice {
//             background: rgba(239, 68, 68, 0.15) !important;
//             border: 1px solid rgba(239, 68, 68, 0.4) !important;
//             border-radius: 10px !important;
//             padding: 20px !important;
//             margin: 25px 0 !important;
//             text-align: right !important;
//         }

//         .expiry-text {
//             color: #fca5a5 !important;
//             font-size: 16px !important;
//             text-align: right !important;
//             font-weight: 500 !important;
//         }

//         .refund-notice {
//             background: rgba(34, 197, 94, 0.15) !important;
//             border: 1px solid rgba(34, 197, 94, 0.4) !important;
//             border-radius: 12px !important;
//             padding: 25px !important;
//             margin: 25px 0 !important;
//             text-align: right !important;
//         }

//         .refund-title {
//             font-size: 20px !important;
//             font-weight: bold !important;
//             color: #22c55e !important;
//             margin-bottom: 15px !important;
//         }

//         .refund-text {
//             color: ${colors.text} !important;
//             font-size: 16px !important;
//             line-height: 1.6 !important;
//         }

//         .footer {
//             background: ${colors.dark} !important;
//             padding: 40px 30px !important;
//             text-align: center !important;
//             border-top: 1px solid ${colors.border} !important;
//         }

//         .footer-content {
//             max-width: 500px !important;
//             margin: 0 auto !important;
//         }

//         .footer-text {
//             color: ${colors.text} !important;
//             font-size: 18px !important;
//             margin-bottom: 25px !important;
//             text-align: center !important;
//             font-weight: 500 !important;
//         }

//         .contact-info {
//             color: ${colors.primary} !important;
//             font-size: 16px !important;
//             margin-bottom: 20px !important;
//             text-align: center !important;
//             font-weight: 500 !important;
//         }

//         .contact-methods {
//             margin: 20px 0 !important;
//             text-align: center !important;
//         }

//         .whatsapp-contact {
//             display: inline-flex !important;
//             align-items: center !important;
//             gap: 8px !important;
//             background: #25D366 !important;
//             color: white !important;
//             padding: 12px 20px !important;
//             border-radius: 8px !important;
//             text-decoration: none !important;
//             font-weight: bold !important;
//             font-size: 14px !important;
//             margin: 10px 0 !important;
//             box-shadow: 0 2px 6px rgba(37, 211, 102, 0.3) !important;
//             transition: all 0.3s ease !important;
//         }

//         .social-links {
//             margin: 30px 0 25px 0 !important;
//             text-align: center !important;
//             width: 100% !important;
//             display: flex !important;
//             flex-wrap: wrap !important;
//             justify-content: center !important;
//         }

//         .social-title {
//             color: ${colors.text} !important;
//             font-size: 14px !important;
//             margin-bottom: 20px !important;
//             text-align: center !important;
//             font-weight: 500 !important;
//             direction: rtl !important;
//         }

//         .social-buttons {
//             display: flex !important;
//             justify-content: center !important;
//             align-items: center !important;
//             gap: 20px !important;
//             flex-wrap: wrap !important;
//             margin: 0 auto !important;
//             max-width: 400px !important;
//         }

//         .social-link {
//             display: inline-flex !important;
//             align-items: center !important;
//             justify-content: center !important;
//             gap: 8px !important;
//             padding: 10px 16px !important;
//             border-radius: 8px !important;
//             text-decoration: none !important;
//             font-size: 13px !important;
//             font-weight: 600 !important;
//             transition: all 0.3s ease !important;
//             min-width: 100px !important;
//             text-align: center !important;
//         }

//         .social-link.tiktok {
//             background: #000000 !important;
//             color: white !important;
//         }

//         .social-link.discord {
//             background: #5865F2 !important;
//             color: white !important;
//         }

//         .social-link.telegram {
//             background: #0088cc !important;
//             color: white !important;
//         }

//         .footer-bottom {
//             margin-top: 30px !important;
//             padding-top: 20px !important;
//             border-top: 1px solid ${colors.border} !important;
//             text-align: center !important;
//         }

//         .copyright {
//             color: ${colors.textSecondary} !important;
//             font-size: 12px !important;
//             text-align: center !important;
//         }

//         .order-reason {
//             text-align: right !important;
//             direction: rtl !important;
//             color: ${colors.textSecondary} !important;
//             font-size: 16px !important;
//             margin-top: 10px !important;
//         }

//         .customer-name {
//             color: ${colors.text} !important;
//             font-size: 18px !important;
//             margin-top: 10px !important;
//         }

//         .order-item {
//             background: rgba(255, 255, 255, 0.05) !important;
//             border-radius: 8px !important;
//             padding: 15px !important;
//             margin: 10px !important;
//             border-right: 3px solid ${colors.success} !important;
//         }

//         .item-name {
//             font-weight: bold !important;
//             color: ${colors.light} !important;
//             font-size: 16px !important;
//             margin-bottom: 8px !important;
//             text-align: right !important;
//         }

//         .item-details {
//             color: ${colors.textSecondary} !important;
//             font-size: 14px !important;
//             text-align: right !important;
//             direction: rtl !important;
//         }

//         /* Responsive */
//         @media only screen and (max-width: 600px) {
//             .email-wrapper {
//                 padding: 10px !important;
//             }

//             .email-container {
//                 margin: 0 10px !important;
//                 border-radius: 8px !important;
//             }

//             .header, .content, .footer {
//                 padding: 25px 20px !important;
//             }

//             .title {
//                 font-size: 24px !important;
//             }

//             .company-name {
//                 font-size: 28px !important;
//             }

//             .message {
//                 font-size: 16px !important;
//             }

//             .social-buttons {
//                 flex-direction: row !important;
//                 justify-content: center !important;
//                 gap: 15px !important;
//                 flex-wrap: wrap !important;
//             }

//             .social-link {
//                 margin: 5px 0 !important;
//                 min-width: 90px !important;
//                 font-size: 12px !important;
//                 padding: 8px 12px !important;
//             }

//             .whatsapp-contact {
//                 font-size: 13px !important;
//                 padding: 10px 16px !important;
//             }
//         }
//     </style>
// </head>
// <body>
//     <div class="email-wrapper">
//         <div class="email-container">
//             <div class="header">
//                 ${logoHtml}
//                 <div class="company-name">${branding.siteName || 'Prestige Designs'}</div>
//                 <div class="tagline">تصاميم فاخرة ومميزة</div>
//             </div>

//             <div class="content">
//                 ${content}
//             </div>

//             <div class="footer">
//                 <div class="footer-content">
//                     <div class="footer-text">
//                         شكراً لثقتكم في خدماتنا
//                     </div>
//                     <div class="contact-info">
//                         للتواصل والدعم:
//                     </div>
//                     <div class="contact-methods">
//                         <a href="${branding.whatsappNumber}" class="whatsapp-contact">
//                             <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//                                 <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
//                             </svg>
//                             واتساب للدعم الفوري
//                         </a>
//                     </div>
//                     ${(branding.tiktokUrl || branding.discordUrl || branding.telegramUrl) ? `
//                     <div class="social-links">
//                         <div class="social-title">تابعونا على:</div>
//                         <div class="social-buttons">
//                             ${branding.tiktokUrl ? `
//                             <a href="${branding.tiktokUrl}" class="social-link tiktok">
//                                 تيك توك
//                             </a>
//                             ` : ''}
//                             ${branding.discordUrl ? `
//                             <a href="${branding.discordUrl}" class="social-link discord">
//                                 ديسكورد
//                             </a>
//                             ` : ''}
//                             ${branding.telegramUrl ? `
//                             <a href="${branding.telegramUrl}" class="social-link telegram">
//                                 تيليجرام
//                             </a>
//                             ` : ''}
//                         </div>
//                     </div>
//                     ` : ''}
//                     <div class="footer-bottom">
//                         <div class="copyright">
//                             © ${new Date().getFullYear()} ${branding.siteName || 'Prestige Designs'} - جميع الحقوق محفوظة
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     </div>
// </body>
// </html>
// `;
// };

// // Free order completion email template
// const createFreeOrderCompletedTemplate = async (orderData: {
//     orderNumber: string;
//     customerName: string;
//     downloadLinks?: Array<{
//         fileName: string;
//         fileUrl: string;
//         fileSize: number;
//         fileType: string;
//     }>;
// }) => {
//     const hasFiles = orderData.downloadLinks && orderData.downloadLinks.length > 0;

//     const fileList = hasFiles ? orderData.downloadLinks!.map(file => `
//     <div class="file-info">
//       <div class="file-name">${file.fileName}</div>
//       <div class="file-size">${(file.fileSize / 1024 / 1024).toFixed(2)} MB</div>
//       <a href="${file.fileUrl}" class="download-link">تحميل الملف</a>
//     </div>
//   `).join('') : '';

//     const content = `
//     <div class="title">تم قبول طلبك المجاني بنجاح! 🎉</div>

//     <div class="message">
//       مرحباً ${orderData.customerName}،
//       <br><br>
//       يسعدنا إعلامك بأن طلبك المجاني قد تم قبوله بنجاح. ${hasFiles ? 'يمكنك الآن تحميل ملفات التصميم الخاصة بك.' : 'سيتم إضافة ملفات التصميم قريباً وإرسال إشعار لك.'}
//     </div>

//     <div class="order-info">
//       <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
//       <div style="margin-top: 10px; color: #22c55e; font-weight: bold; font-size: 16px; direction: rtl;">
//         💚 طلب مجاني - $0.00
//       </div>
//     </div>

//     ${hasFiles ? `
//     <div class="download-section">
//       <div class="download-title">📁 ملفات التصميم الجاهزة للتحميل</div>
//       ${fileList}
//     </div>
//     ` : `
//     <div class="order-info">
//       <div style="color: ${colors.success}; font-size: 16px; margin-top: 15px; padding: 15px; background: rgba(216, 232, 100, 0.1); border-radius: 8px; border: 1px solid rgba(216, 232, 100, 0.3);">
//         🕒 ملفات التصميم ستكون جاهزة قريباً وسيتم إرسال رابط التحميل لك على هذا البريد الإلكتروني.
//       </div>
//     </div>
//     `}

//     <div class="message">
//       شكراً لثقتكم في خدماتنا المجانية! إذا كان لديك أي استفسار، لا تتردد في التواصل معنا.
//       <br><br>
//       ❤️ Prestige Designs فريق 
//     </div>
//   `;

//     return await createBaseTemplate(content, `تم قبول الطلب المجاني - ${orderData.orderNumber}`);
// };

// // Order completed email template
// const createOrderCompletedTemplate = async (orderData: {
//     orderNumber: string;
//     customerName: string;
//     downloadLinks: Array<{
//         fileName: string;
//         fileUrl: string;
//         fileSize: number;
//         fileType: string;
//     }>;
//     downloadExpiry: Date;
//     totalPrice?: number;
// }) => {
//     const fileList = orderData.downloadLinks.map(file => `
//     <div class="file-info">
//       <div class="file-name">${file.fileName}</div>
//       <div class="file-size">${(file.fileSize / 1024 / 1024).toFixed(2)} MB</div>
//       <a href="${file.fileUrl}" class="download-link">تحميل الملف</a>
//     </div>
//   `).join('');

//     const content = `
//     <div class="title">تم إكمال طلبك بنجاح! 🎉</div>

//     <div class="message">
//       مرحباً ${orderData.customerName}،
//       <br><br>
//       يسعدنا إعلامك بأن طلبك قد تم إكماله بنجاح. يمكنك الآن تحميل ملفات التصميم الخاصة بك.
//     </div>

//     <div class="order-info">
//       <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
//       ${orderData.totalPrice ? `
//       <div class="order-price" style="margin-top: 10px; color: ${colors.success}; font-weight: bold; font-size: 18px; text-align: right;">
//         💎 المبلغ المدفوع: $${orderData.totalPrice.toFixed(2)}
//       </div>
//       ` : ''}
//     </div>

//     <div class="download-section">
//       <div class="download-title">📁 ملفات التصميم الجاهزة للتحميل</div>
//       ${fileList}
//     </div>

//     <div class="expiry-notice">
//       <div class="expiry-text">
//         ⏰ تنبيه: روابط التحميل صالحة لمدة 30 يوماً فقط
//         <br>
//         تاريخ انتهاء الصلاحية: ${orderData.downloadExpiry.toLocaleDateString('ar-SA')}
//       </div>
//     </div>

//     <div class="message">
//       إذا واجهت أي مشكلة في التحميل، لا تتردد في التواصل معنا.
//       <br><br>
//       شكراً لثقتكم في خدماتنا!
//       <br><br>
//       <strong>فريق Prestige Designs</strong> ❤️
//     </div>
//   `;

//     return await createBaseTemplate(content, `تم إكمال الطلب - ${orderData.orderNumber}`);
// };

// // Order cancelled email template
// const createOrderCancelledTemplate = async (orderData: {
//     orderNumber: string;
//     customerName: string;
//     reason?: string;
//     totalPrice?: number;
// }) => {
//     const content = `
//         <div class="title">تم إلغاء طلبك</div>

//         <div class="message">
//             مرحباً ${orderData.customerName}،
//             <br><br>
//             نعتذر لإعلامك بأن طلبك قد تم إلغاؤه.
//         </div>

//         <div class="order-info">
//             <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
//             ${orderData.totalPrice ? `
//             <div class="order-price" style="margin-top: 10px; color: ${colors.textSecondary}; font-weight: bold; font-size: 16px; text-align: right;">
//                  المبلغ: $${orderData.totalPrice.toFixed(2)}
//             </div>
//             ` : ''}
//             ${orderData.reason ? `<div class="order-reason">السبب: ${orderData.reason}</div>` : ''}
//         </div>

//         ${orderData.totalPrice ? `
//         <div class="refund-notice">
//             <div class="refund-title">استرداد المبلغ</div>
//             <div class="refund-text">
//           .الخاص بك خلال 3-5 أيام عمل PayPal إلى حساب ($${orderData.totalPrice.toFixed(2)}) سيتم إرسال المبلغ المدفوع   
//             </div>
//         </div>
//         ` : ''}

//         <div class="message">
//             إذا كان لديك أي استفسار حول هذا الإلغاء${orderData.totalPrice ? ' أو الاسترداد' : ''}، يرجى التواصل معنا.
//             <br><br>
//             نعتذر عن أي إزعاج قد تسببنا به.
//             <br><br>
//             <strong> Prestige Designs فريق</strong>
//         </div>
//     `;

//     return await createBaseTemplate(content, `تم إلغاء الطلب - ${orderData.orderNumber}`);
// };

// // Admin notification email template
// const createAdminNotificationTemplate = async (orderData: {
//     orderNumber: string;
//     customerName: string;
//     customerEmail: string;
//     customerPhone?: string;
//     totalPrice: number;
//     items: Array<{
//         productName: string;
//         quantity: number;
//         price: number;
//     }>;
//     orderType: string;
// }) => {
//     const itemsList = orderData.items.map(item => `
//     <div class="order-item">
//       <div class="item-name">📦 ${item.productName}</div>
//       <div class="item-details">الكمية: ${item.quantity} × ${item.price.toFixed(2)} USD</div>
//     </div>
//   `).join('');

//     const content = `
//     <div class="title">طلب جديد - ${orderData.orderType === 'free' ? 'مجاني' : 'مدفوع'}</div>

//     <div class="message">
//       تم استلام طلب جديد وهو بحاجة إلى المراجعة والمعالجة.
//     </div>

//     <div class="order-info">
//       <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
//       <div style="margin-top: 10px; color: ${orderData.orderType === 'free' ? '#22c55e' : colors.primary}; font-weight: bold; font-size: 16px; direction: rtl;">
//         ${orderData.orderType === 'free' ? ' طلب مجاني' : ' طلب مدفوع'} - ${orderData.totalPrice.toFixed(2)} USD
//       </div>
//     </div>

//     <div class="customer-info" style="background: rgba(130, 97, 198, 0.1); border: 1px solid rgba(130, 97, 198, 0.3); border-radius: 10px; padding: 10px; margin: 10px; direction: rtl;">
//       <div style="font-size: 20px; font-weight: bold; color: ${colors.primary}; margin-bottom: 20px;">معلومات العميل:</div>
//       <div style="margin-bottom: 15px; margin-right:5px; color: ${colors.light}; font-size: 17px;">👤 الاسم: ${orderData.customerName}</div>
//       <div style="margin-bottom: 15px; margin-right:5px; color: ${colors.light}; font-size: 17px;">📧 البريد الإلكتروني: ${orderData.customerEmail}</div>
//       ${orderData.customerPhone ? `<div style=" margin-right:5px; color: ${colors.light}; font-size: 17px;">📱 الهاتف: ${orderData.customerPhone}</div>` : ''}
//     </div>

//     <div class="order-items" style="background: rgba(216, 232, 100, 0.1); border: 1px solid rgba(216, 232, 100, 0.3); border-radius: 10px; padding: 30px; margin: 30px 0;">
//       <div style="font-size: 20px; font-weight: bold; color: ${colors.success}; margin: 5px; padding: 5px; direction: rtl;">تفاصيل الطلب:</div>
//       ${itemsList}
//     </div>

//     <div class="message">
//       يرجى مراجعة الطلب في لوحة التحكم واتخاذ الإجراء المناسب.
//       <br><br>
//       <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/orders" style="color: ${colors.primary}; text-decoration: none; font-weight: bold;">🔗 الذهاب إلى لوحة التحكم</a>
//     </div>
//   `;

//     return await createBaseTemplate(content, `طلب جديد - ${orderData.orderNumber}`);
// };

// // Free order missing customization email template
// const createFreeOrderMissingCustomizationTemplate = async (orderData: {
//     orderNumber: string;
//     customerName: string;
//     orderId: string;
//     createdAt: Date;
// }) => {
//     const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

//     const content = `
//         <div class="title">⚠️ طلبك المجاني يحتاج تفاصيل إضافية</div>

//         <div class="message">
//             مرحباً ${orderData.customerName}،
//             <br><br>
//             طلبك يحتوي على منتجات قابلة للتخصيص، لكن لم يتم إضافة تفاصيل التخصيص المطلوبة. يرجى إضافة التفاصيل أو سيتواصل معك فريقنا لاستلام المتطلبات.
//         </div>

//         <div class="order-info">
//             <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
//             <div style="margin-top: 10px; color: #22c55e; font-weight: bold; font-size: 16px; direction: rtl;">
//                 💚 طلب مجاني - $0.00
//             </div>
//             <div style="margin-top: 10px; color: #f59e0b; font-weight: bold; font-size: 16px; direction: rtl;">
//                 ⚠️ في انتظار التخصيصات
//             </div>
//             <div style="margin-top: 10px; color: ${colors.textSecondary}; font-size: 16px; direction: rtl;">
//                 📅 التاريخ: ${orderData.createdAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
//             </div>
//         </div>

//         <div style="text-align: center; margin: 30px 0;">
//             <a href="${baseUrl}/customer/orders/${orderData.orderId}" 
//                style="display: inline-block; background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(130, 97, 198, 0.4);">
//                 📝 إضافة تفاصيل التخصيص
//             </a>
//         </div>

//         <div class="message">
//             إذا كان لديك أي استفسار، لا تتردد في التواصل معنا.
//             <br><br>
//             <strong>فريق Prestige Designs</strong> ❤️
//         </div>
//     `;

//     return await createBaseTemplate(content, `تفاصيل إضافية مطلوبة - ${orderData.orderNumber}`);
// };

// // Free order under review email template
// const createFreeOrderUnderReviewTemplate = async (orderData: {
//     orderNumber: string;
//     customerName: string;
//     orderId: string;
//     createdAt: Date;
// }) => {
//     const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

//     const content = `
//         <div class="title">📋 طلبك المجاني قيد المراجعة</div>

//         <div class="message">
//             مرحباً ${orderData.customerName}،
//             <br><br>
//             طلبك يحتوي على تخصيصات تحتاج لمراجعة فريقنا. سنتواصل معك قريباً بالتفاصيل ونبدأ العمل على التصاميم.
//         </div>

//         <div class="order-info">
//             <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
//             <div style="margin-top: 10px; color: #22c55e; font-weight: bold; font-size: 16px; direction: rtl;">
//                 💚 طلب مجاني - $0.00
//             </div>
//             <div style="margin-top: 10px; color: #f59e0b; font-weight: bold; font-size: 16px; direction: rtl;">
//                 📋 قيد المراجعة
//             </div>
//             <div style="margin-top: 10px; color: ${colors.textSecondary}; font-size: 16px; direction: rtl;">
//                 📅 التاريخ: ${orderData.createdAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
//             </div>
//         </div>

//         <div style="text-align: center; margin: 30px 0;">
//             <a href="${baseUrl}/customer/orders" 
//                style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);">
//                 📋 متابعة طلباتي
//             </a>
//         </div>

//         <div class="message">
//             شكراً لثقتكم في خدماتنا! سنقوم بإعلامكم فور الانتهاء من مراجعة طلبكم.
//             <br><br>
//             <strong>فريق Prestige Designs</strong> ❤️
//         </div>
//     `;

//     return await createBaseTemplate(content, `طلبك قيد المراجعة - ${orderData.orderNumber}`);
// };

// // Customization processing email template (for paid orders)
// const createCustomizationProcessingTemplate = async (orderData: {
//     orderNumber: string;
//     customerName: string;
//     customWorkItems?: Array<{
//         productName: string;
//         quantity: number;
//     }>;
// }) => {
//     const itemsList = orderData.customWorkItems && orderData.customWorkItems.length > 0
//         ? orderData.customWorkItems.map(item => `
//         <div class="order-item">
//             <div class="item-name">📦 ${item.productName}</div>
//             <div class="item-details">الكمية: ${item.quantity}</div>
//         </div>
//         `).join('')
//         : '';

//     const content = `
//         <div class="title">🎨 طلبك قيد المعالجة</div>

//         <div class="message">
//             مرحباً ${orderData.customerName}،
//             <br><br>
//             تم استلام طلبك بنجاح وتأكيد الدفع. سيتم العمل على تخصيص التصاميم حسب متطلباتك وإرسالها إليك في أقرب وقت ممكن.
//         </div>

//         <div class="order-info">
//             <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
//             <div style="margin-top: 10px; color: ${colors.primary}; font-weight: bold; font-size: 16px; direction: rtl;">
//                 💎 طلب مدفوع
//             </div>
//             <div style="margin-top: 10px; color: #f59e0b; font-weight: bold; font-size: 16px; direction: rtl;">
//                 🎨 قيد المعالجة
//             </div>
//         </div>

//         ${itemsList ? `
//         <div class="order-items" style="background: rgba(216, 232, 100, 0.1); border: 1px solid rgba(216, 232, 100, 0.3); border-radius: 10px; padding: 25px; margin: 25px 0;">
//             <div style="font-size: 18px; font-weight: bold; color: ${colors.success}; margin-bottom: 15px; direction: rtl;">العناصر التي تتطلب عمل مخصص:</div>
//             ${itemsList}
//         </div>
//         ` : ''}

//         <div class="message">
//             شكراً لثقتك بنا. سنتواصل معك في حال احتجنا لأي توضيحات إضافية.
//             <br><br>
//             <strong>فريق Prestige Designs</strong> ❤️
//         </div>
//     `;

//     return await createBaseTemplate(content, `معالجة طلبك - ${orderData.orderNumber}`);
// };

// // Email service class
// export class EmailService {
//     /**
//      * Send free order completed email
//      */
//     static async sendFreeOrderCompletedEmail(
//         to: string,
//         orderData: {
//             orderNumber: string;
//             customerName: string;
//             downloadLinks?: Array<{
//                 fileName: string;
//                 fileUrl: string;
//                 fileSize: number;
//                 fileType: string;
//             }>;
//         }
//     ) {
//         try {
//             const html = await createFreeOrderCompletedTemplate(orderData);

//             const mailOptions = {
//                 from: `"${emailSender.name}" <${emailSender.from}>`,
//                 to: to,
//                 subject: `تم قبول الطلب المجاني - ${orderData.orderNumber}`,
//                 html: html,
//             };

//             const result = await transporter.sendMail(mailOptions) as { messageId: string };
//             console.log('✅ Free order completed email sent successfully:', result.messageId);
//             return { success: true, messageId: result.messageId };
//         } catch (error) {
//             console.error('❌ Error sending free order completed email:', error);
//             return { success: false, error: (error as Error).message };
//         }
//     }

//     /**
//      * Send order completed email
//      */
//     static async sendOrderCompletedEmail(
//         to: string,
//         orderData: {
//             orderNumber: string;
//             customerName: string;
//             downloadLinks: Array<{
//                 fileName: string;
//                 fileUrl: string;
//                 fileSize: number;
//                 fileType: string;
//             }>;
//             downloadExpiry: Date;
//             totalPrice?: number;
//         }
//     ) {
//         try {
//             const html = await createOrderCompletedTemplate(orderData);

//             const mailOptions = {
//                 from: `"${emailSender.name}" <${emailSender.from}>`,
//                 to: to,
//                 subject: `تم إكمال الطلب - ${orderData.orderNumber}`,
//                 html: html,
//             };

//             const result = await transporter.sendMail(mailOptions) as { messageId: string };
//             console.log('✅ Order completed email sent successfully:', result.messageId);
//             return { success: true, messageId: result.messageId };
//         } catch (error) {
//             console.error('❌ Error sending order completed email:', error);
//             return { success: false, error: (error as Error).message };
//         }
//     }

//     /**
//      * Send order cancelled email
//      */
//     static async sendOrderCancelledEmail(
//         to: string,
//         orderData: {
//             orderNumber: string;
//             customerName: string;
//             reason?: string;
//             totalPrice?: number;
//         }
//     ) {
//         try {
//             const html = await createOrderCancelledTemplate(orderData);

//             const mailOptions = {
//                 from: `"${emailSender.name}" <${emailSender.from}>`,
//                 to: to,
//                 subject: `تم إلغاء الطلب - ${orderData.orderNumber}`,
//                 html: html,
//             };

//             const result = await transporter.sendMail(mailOptions) as { messageId: string };
//             console.log('✅ Order cancelled email sent successfully:', result.messageId);
//             return { success: true, messageId: result.messageId };
//         } catch (error) {
//             console.error('❌ Error sending order cancelled email:', error);
//             return { success: false, error: (error as Error).message };
//         }
//     }

//     /**
//      * Send custom message email
//      */
//     static async sendCustomMessage(
//         to: string,
//         messageData: {
//             orderNumber: string;
//             customerName: string;
//             subject: string;
//             message: string;
//         }
//     ) {
//         try {
//             const content = `
//                 <div class="order-info">
//                     <div class="order-number">رقم الطلب: ${messageData.orderNumber}</div>
//                     <div class="customer-name">عزيزي ${messageData.customerName}</div>
//                 </div>

//                 <div class="message">
//                     ${messageData.message}
//                 </div>

//                 <div class="message">
//                     شكراً لثقتك في خدماتنا!
//                     <br><br>
//                     <strong>فريق Prestige Designs</strong> ❤️
//                 </div>
//             `;

//             const html = await createBaseTemplate(content, messageData.subject);

//             const mailOptions = {
//                 from: `"${emailSender.name}" <${emailSender.from}>`,
//                 to: to,
//                 subject: messageData.subject,
//                 html: html,
//             };

//             const result = await transporter.sendMail(mailOptions) as { messageId: string };
//             console.log('✅ Custom message email sent successfully:', result.messageId);
//             return { success: true, messageId: result.messageId };
//         } catch (error) {
//             console.error('❌ Error sending custom message email:', error);
//             return { success: false, error: (error as Error).message };
//         }
//     }

//     /**
//      * Send admin notification email
//      */
//     static async sendAdminNotification(
//         adminEmail: string,
//         orderData: {
//             orderNumber: string;
//             customerName: string;
//             customerEmail: string;
//             customerPhone?: string;
//             totalPrice: number;
//             items: Array<{
//                 productName: string;
//                 quantity: number;
//                 price: number;
//             }>;
//             orderType: string;
//         }
//     ) {
//         try {
//             const html = await createAdminNotificationTemplate(orderData);

//             const mailOptions = {
//                 from: `"${emailSender.name}" <${emailSender.from}>`,
//                 to: adminEmail,
//                 subject: `طلب جديد - ${orderData.orderNumber}`,
//                 html: html,
//             };

//             const result = await transporter.sendMail(mailOptions) as { messageId: string };
//             console.log('✅ Admin notification email sent successfully:', result.messageId);
//             return { success: true, messageId: result.messageId };
//         } catch (error) {
//             console.error('❌ Error sending admin notification email:', error);
//             return { success: false, error: (error as Error).message };
//         }
//     }

//     /**
//      * Test email configuration
//      */
//     static async testConnection() {
//         try {
//             await transporter.verify();
//             console.log('✅ Email service is ready');
//             return { success: true };
//         } catch (error) {
//             console.error('❌ Email service connection failed:', error);
//             return { success: false, error: (error as Error).message };
//         }
//     }

//     /**
//      * Send free order missing customization email
//      */
//     static async sendFreeOrderMissingCustomizationEmail(
//         to: string,
//         orderData: {
//             orderNumber: string;
//             customerName: string;
//             orderId: string;
//             createdAt: Date;
//         }
//     ) {
//         try {
//             const html = await createFreeOrderMissingCustomizationTemplate(orderData);

//             const mailOptions = {
//                 from: `"${emailSender.name}" <${emailSender.from}>`,
//                 to: to,
//                 subject: `⚠️ طلبك المجاني يحتاج تفاصيل إضافية - ${orderData.orderNumber}`,
//                 html: html,
//             };

//             const result = await transporter.sendMail(mailOptions) as { messageId: string };
//             console.log('✅ Free order missing customization email sent successfully:', result.messageId);
//             return { success: true, messageId: result.messageId };
//         } catch (error) {
//             console.error('❌ Error sending free order missing customization email:', error);
//             return { success: false, error: (error as Error).message };
//         }
//     }

//     /**
//      * Send free order under review email
//      */
//     static async sendFreeOrderUnderReviewEmail(
//         to: string,
//         orderData: {
//             orderNumber: string;
//             customerName: string;
//             orderId: string;
//             createdAt: Date;
//         }
//     ) {
//         try {
//             const html = await createFreeOrderUnderReviewTemplate(orderData);

//             const mailOptions = {
//                 from: `"${emailSender.name}" <${emailSender.from}>`,
//                 to: to,
//                 subject: `📋 طلبك المجاني قيد المراجعة - ${orderData.orderNumber}`,
//                 html: html,
//             };

//             const result = await transporter.sendMail(mailOptions) as { messageId: string };
//             console.log('✅ Free order under review email sent successfully:', result.messageId);
//             return { success: true, messageId: result.messageId };
//         } catch (error) {
//             console.error('❌ Error sending free order under review email:', error);
//             return { success: false, error: (error as Error).message };
//         }
//     }

//     /**
//      * Send customization processing email
//      */
//     static async sendCustomizationProcessingEmail(
//         to: string,
//         orderData: {
//             orderNumber: string;
//             customerName: string;
//             customWorkItems?: Array<{
//                 productName: string;
//                 quantity: number;
//             }>;
//         }
//     ) {
//         try {
//             const html = await createCustomizationProcessingTemplate(orderData);

//             const mailOptions = {
//                 from: `"${emailSender.name}" <${emailSender.from}>`,
//                 to: to,
//                 subject: `🎨 معالجة طلبك - ${orderData.orderNumber}`,
//                 html: html,
//             };

//             const result = await transporter.sendMail(mailOptions) as { messageId: string };
//             console.log('✅ Customization processing email sent successfully:', result.messageId);
//             return { success: true, messageId: result.messageId };
//         } catch (error) {
//             console.error('❌ Error sending customization processing email:', error);
//             return { success: false, error: (error as Error).message };
//         }
//     }
// }
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

// Color scheme from our CSS - Updated for better dark theme
const colors = {
    primary: '#8261c6',      // Purple primary
    secondary: '#e260ef',    // Pink accent
    success: '#d8e864',      // Lime green
    dark: '#1a1a1f',         // Darker primary for better contrast
    cardDark: '#202028',     // Card background
    light: '#fcebff',        // Light primary
    text: '#d1d5db',         // Better text readability
    textSecondary: '#9ca3af', // Secondary text
    border: '#374151',       // Better border color
    gradient: 'linear-gradient(135deg, #1a1a1f 0%, #202028 100%)', // Dark gradient
};

// Helper function to get branding settings
const getBrandingSettings = async () => {
    try {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // Try to fetch from API
        const response = await fetch(`${baseUrl}/api/settings`, {
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const data = await response.json();
            // Ensure we have valid settings response
            if (data?.data) {
                return {
                    siteName: data.data.branding?.siteName || 'Prestige Designs',
                    logoUrl: data.data.branding?.logoUrl || `${baseUrl}/site/logo.png`,
                    faviconUrl: data.data.branding?.faviconUrl,
                    whatsappNumber: data.data.social?.whatsapp || 'https://wa.me/972597607959',
                    tiktokUrl: data.data.social?.tiktok,
                    discordUrl: data.data.social?.discord,
                    telegramUrl: data.data.social?.telegram
                };
            }
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
    }

    // Return default settings with logo if fetch fails
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return {
        siteName: 'Prestige Designs',
        logoUrl: `${baseUrl}/site/logo.png`, // Always include our logo
        faviconUrl: null,
        whatsappNumber: 'https://wa.me/972597607959', // Default fallback
        tiktokUrl: null,
        discordUrl: null,
        telegramUrl: null
    };
};

// Base email template with our branding
const createBaseTemplate = async (content: string, title: string) => {
    const branding = await getBrandingSettings();

    // Always include logo - either from branding settings or default
    const logoUrl = branding.logoUrl || `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/site/logo.png`;

    // Create logo HTML with better email client compatibility
    const logoHtml = `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
            <tr>
                <td align="center" valign="middle">
                    <img src="${logoUrl}"
                         alt="${branding.siteName || 'Prestige Designs'}"
                         class="logo"
                         style="width: 80px !important; height: 80px !important; display: block !important; margin: 0 auto !important; border-radius: 12px !important; padding: 8px !important; object-fit: contain !important; box-shadow: 0 2px 10px rgba(130, 97, 198, 0.3) !important; max-width: 80px !important; max-height: 80px !important;"
                         width="80"
                         height="80"
                         border="0"
                         onerror="this.style.display='none'" />
                </td>
            </tr>
        </table>
    `;

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <style>
        /* Reset */
        * {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
        }

        /* Prevent email client wrapper issues */
        table, td, th {
            border-collapse: collapse !important;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
            background: ${colors.dark} !important;
            color: ${colors.light} !important;
            line-height: 1.6 !important;
            direction: rtl !important;
            text-align: right !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100vh !important;
            -webkit-text-size-adjust: 100% !important;
            -ms-text-size-adjust: 100% !important;
        }

        /* Main container */
        .email-wrapper {
            width: 100% !important;
            background: ${colors.dark} !important;
            margin: 0 !important;
            padding: 20px 0 !important;
        }

        .email-container {
            max-width: 600px !important;
            margin: 0 auto !important;
            background: ${colors.cardDark} !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
            border: 1px solid ${colors.border} !important;
        }

        .header {
            background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%) !important;
            padding: 40px 30px !important;
            text-align: center !important;
        }

        .logo-container {
            text-align: center !important;
            margin-bottom: 20px !important;
            display: block !important;
            width: 100% !important;
        }

        .logo {
            width: 80px !important;
            height: 80px !important;
            margin: 0 auto !important;
            display: block !important;
            border-radius: 12px !important;
            box-shadow: 0 2px 10px rgba(130, 97, 198, 0.3) !important;
            padding: 8px !important;
            object-fit: contain !important;
            max-width: 80px !important;
            max-height: 80px !important;
            vertical-align: middle !important;
            /* Prevent download overlay in email clients */
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
            pointer-events: none !important;
        }

        .company-name {
            font-size: 32px !important;
            font-weight: bold !important;
            color: white !important;
            margin-bottom: 10px !important;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
        }

        .tagline {
            color: rgba(255, 255, 255, 0.95) !important;
            font-size: 18px !important;
            font-weight: 500 !important;
        }

        .content {
            padding: 40px 30px !important;
            background: ${colors.cardDark} !important;
        }

        .title {
            font-size: 28px !important;
            font-weight: bold !important;
            color: ${colors.light} !important;
            margin-bottom: 25px !important;
            text-align: right !important;
            line-height: 1.3 !important;
        }

        .message {
            font-size: 18px !important;
            color: ${colors.text} !important;
            margin-bottom: 30px !important;
            line-height: 1.7 !important;
            text-align: right !important;
        }

        .order-info {
            background: rgba(130, 97, 198, 0.15) !important;
            border: 1px solid rgba(130, 97, 198, 0.4) !important;
            border-radius: 12px !important;
            padding: 25px !important;
            margin: 25px 0 !important;
        }

        .order-number {
            font-size: 20px !important;
            font-weight: bold !important;
            color: ${colors.primary} !important;
            margin-bottom: 15px !important;
            text-align: right !important;
            direction: rtl !important;
        }

        .order-price {
            font-size: 18px !important;
            font-weight: bold !important;
            text-align: right !important;
            direction: rtl !important;
            margin-top: 10px !important;
        }

        .download-section {
            background: rgba(216, 232, 100, 0.15) !important;
            border: 1px solid rgba(216, 232, 100, 0.4) !important;
            border-radius: 12px !important;
            padding: 25px !important;
            margin: 25px 0 !important;
        }

        .download-title {
            font-size: 20px !important;
            font-weight: bold !important;
            color: ${colors.success} !important;
            margin-bottom: 20px !important;
            text-align: right !important;
        }

        .download-link {
            display: inline-block !important;
            background: linear-gradient(135deg, ${colors.success} 0%, #b8d432 100%) !important;
            color: ${colors.dark} !important;
            text-decoration: none !important;
            padding: 14px 28px !important;
            border-radius: 10px !important;
            font-weight: bold !important;
            font-size: 16px !important;
            margin: 10px 5px !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 2px 8px rgba(216, 232, 100, 0.3) !important;
        }

        .file-info {
            background: rgba(255, 255, 255, 0.08) !important;
            border-radius: 10px !important;
            padding: 20px !important;
            margin: 15px 0 !important;
            border-right: 4px solid ${colors.primary} !important;
            text-align: right !important;
            direction: rtl !important;
        }

        .file-name {
            font-weight: bold !important;
            color: ${colors.light} !important;
            margin-bottom: 8px !important;
            font-size: 16px !important;
            text-align: right !important;
        }

        .file-size {
            color: ${colors.textSecondary} !important;
            font-size: 14px !important;
            text-align: right !important;
        }

        .expiry-notice {
            background: rgba(239, 68, 68, 0.15) !important;
            border: 1px solid rgba(239, 68, 68, 0.4) !important;
            border-radius: 10px !important;
            padding: 20px !important;
            margin: 25px 0 !important;
            text-align: right !important;
        }

        .expiry-text {
            color: #fca5a5 !important;
            font-size: 16px !important;
            text-align: right !important;
            font-weight: 500 !important;
        }

        .refund-notice {
            background: rgba(34, 197, 94, 0.15) !important;
            border: 1px solid rgba(34, 197, 94, 0.4) !important;
            border-radius: 12px !important;
            padding: 25px !important;
            margin: 25px 0 !important;
            text-align: right !important;
        }

        .refund-title {
            font-size: 20px !important;
            font-weight: bold !important;
            color: #22c55e !important;
            margin-bottom: 15px !important;
        }

        .refund-text {
            color: ${colors.text} !important;
            font-size: 16px !important;
            line-height: 1.6 !important;
        }

        .footer {
            background: ${colors.dark} !important;
            padding: 40px 30px !important;
            text-align: center !important;
            border-top: 1px solid ${colors.border} !important;
        }

        .footer-content {
            max-width: 500px !important;
            margin: 0 auto !important;
        }

        .footer-text {
            color: ${colors.text} !important;
            font-size: 18px !important;
            margin-bottom: 25px !important;
            text-align: center !important;
            font-weight: 500 !important;
        }

        .contact-info {
            color: ${colors.primary} !important;
            font-size: 16px !important;
            margin-bottom: 20px !important;
            text-align: center !important;
            font-weight: 500 !important;
        }

        .contact-methods {
            margin: 20px 0 !important;
            text-align: center !important;
        }

        .whatsapp-contact {
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            background: #25D366 !important;
            color: white !important;
            padding: 12px 20px !important;
            border-radius: 8px !important;
            text-decoration: none !important;
            font-weight: bold !important;
            font-size: 14px !important;
            margin: 10px 0 !important;
            box-shadow: 0 2px 6px rgba(37, 211, 102, 0.3) !important;
            transition: all 0.3s ease !important;
        }

        .social-links {
            margin: 30px 0 25px 0 !important;
            text-align: center !important;
            width: 100% !important;
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
        }

        .social-title {
            color: ${colors.text} !important;
            font-size: 14px !important;
            margin-bottom: 20px !important;
            text-align: center !important;
            font-weight: 500 !important;
            direction: rtl !important;
        }

        .social-buttons {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 20px !important;
            flex-wrap: wrap !important;
            margin: 0 auto !important;
            max-width: 400px !important;
        }

        .social-link {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            padding: 10px 16px !important;
            border-radius: 8px !important;
            text-decoration: none !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            transition: all 0.3s ease !important;
            min-width: 100px !important;
            text-align: center !important;
        }

        .social-link.tiktok {
            background: #000000 !important;
            color: white !important;
        }

        .social-link.discord {
            background: #5865F2 !important;
            color: white !important;
        }

        .social-link.telegram {
            background: #0088cc !important;
            color: white !important;
        }

        .footer-bottom {
            margin-top: 30px !important;
            padding-top: 20px !important;
            border-top: 1px solid ${colors.border} !important;
            text-align: center !important;
        }

        .copyright {
            color: ${colors.textSecondary} !important;
            font-size: 12px !important;
            text-align: center !important;
        }

        .order-reason {
            text-align: right !important;
            direction: rtl !important;
            color: ${colors.textSecondary} !important;
            font-size: 16px !important;
            margin-top: 10px !important;
        }

        .customer-name {
            color: ${colors.text} !important;
            font-size: 18px !important;
            margin-top: 10px !important;
        }

        .order-item {
            background: rgba(255, 255, 255, 0.05) !important;
            border-radius: 8px !important;
            padding: 15px !important;
            margin: 10px !important;
            border-right: 3px solid ${colors.success} !important;
        }

        .item-name {
            font-weight: bold !important;
            color: ${colors.light} !important;
            font-size: 16px !important;
            margin-bottom: 8px !important;
            text-align: right !important;
        }

        .item-details {
            color: ${colors.textSecondary} !important;
            font-size: 14px !important;
            text-align: right !important;
            direction: rtl !important;
        }

        /* Responsive */
        @media only screen and (max-width: 600px) {
            .email-wrapper {
                padding: 10px !important;
            }

            .email-container {
                margin: 0 10px !important;
                border-radius: 8px !important;
            }

            .header, .content, .footer {
                padding: 25px 20px !important;
            }

            .title {
                font-size: 24px !important;
            }

            .company-name {
                font-size: 28px !important;
            }

            .message {
                font-size: 16px !important;
            }

            .social-buttons {
                flex-direction: row !important;
                justify-content: center !important;
                gap: 15px !important;
                flex-wrap: wrap !important;
            }

            .social-link {
                margin: 5px 0 !important;
                min-width: 90px !important;
                font-size: 12px !important;
                padding: 8px 12px !important;
            }

            .whatsapp-contact {
                font-size: 13px !important;
                padding: 10px 16px !important;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
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
                <div class="footer-content">
                    <div class="footer-text">
                        شكراً لثقتكم في خدماتنا
                    </div>
                    <div class="contact-info">
                        للتواصل والدعم:
                    </div>
                    <div class="contact-methods">
                        <a href="${branding.whatsappNumber}" class="whatsapp-contact">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                            </svg>
                            واتساب للدعم الفوري
                        </a>
                    </div>
                    ${(branding.tiktokUrl || branding.discordUrl || branding.telegramUrl) ? `
                    <div class="social-links">
                        <div class="social-title">تابعونا على:</div>
                        <div class="social-buttons">
                            ${branding.tiktokUrl ? `
                            <a href="${branding.tiktokUrl}" class="social-link tiktok">
                                تيك توك
                            </a>
                            ` : ''}
                            ${branding.discordUrl ? `
                            <a href="${branding.discordUrl}" class="social-link discord">
                                ديسكورد
                            </a>
                            ` : ''}
                            ${branding.telegramUrl ? `
                            <a href="${branding.telegramUrl}" class="social-link telegram">
                                تيليجرام
                            </a>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                    <div class="footer-bottom">
                        <div class="copyright">
                            © ${new Date().getFullYear()} ${branding.siteName || 'Prestige Designs'} - جميع الحقوق محفوظة
                        </div>
                    </div>
                </div>
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
      <div style="margin-top: 10px; color: #22c55e; font-weight: bold; font-size: 16px; direction: rtl;">
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
      ❤️ Prestige Designs فريق
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
    totalPrice?: number;
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
      ${orderData.totalPrice ? `
      <div class="order-price" style="margin-top: 10px; color: ${colors.success}; font-weight: bold; font-size: 18px; text-align: right;">
        💎 المبلغ المدفوع: $${orderData.totalPrice.toFixed(2)}
      </div>
      ` : ''}
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
      <br><br>
      <strong>فريق Prestige Designs</strong> ❤️
    </div>
  `;

    return await createBaseTemplate(content, `تم إكمال الطلب - ${orderData.orderNumber}`);
};

// Order cancelled email template
const createOrderCancelledTemplate = async (orderData: {
    orderNumber: string;
    customerName: string;
    reason?: string;
    totalPrice?: number;
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
            ${orderData.totalPrice ? `
            <div class="order-price" style="margin-top: 10px; color: ${colors.textSecondary}; font-weight: bold; font-size: 16px; text-align: right;">
                 المبلغ: $${orderData.totalPrice.toFixed(2)}
            </div>
            ` : ''}
            ${orderData.reason ? `<div class="order-reason">السبب: ${orderData.reason}</div>` : ''}
        </div>

        ${orderData.totalPrice ? `
        <div class="refund-notice">
            <div class="refund-title">استرداد المبلغ</div>
            <div class="refund-text">
          .الخاص بك خلال 3-5 أيام عمل PayPal إلى حساب ($${orderData.totalPrice.toFixed(2)}) سيتم إرسال المبلغ المدفوع
            </div>
        </div>
        ` : ''}

        <div class="message">
            إذا كان لديك أي استفسار حول هذا الإلغاء${orderData.totalPrice ? ' أو الاسترداد' : ''}، يرجى التواصل معنا.
            <br><br>
            نعتذر عن أي إزعاج قد تسببنا به.
            <br><br>
            <strong> Prestige Designs فريق</strong>
        </div>
    `;

    return await createBaseTemplate(content, `تم إلغاء الطلب - ${orderData.orderNumber}`);
};

// Admin notification email template
const createAdminNotificationTemplate = async (orderData: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    totalPrice: number;
    items: Array<{
        productName: string;
        quantity: number;
        price: number;
    }>;
    orderType: string;
}) => {
    const itemsList = orderData.items.map(item => `
    <div class="order-item">
      <div class="item-name">📦 ${item.productName}</div>
      <div class="item-details">الكمية: ${item.quantity} × ${item.price.toFixed(2)} USD</div>
    </div>
  `).join('');

    const content = `
    <div class="title">طلب جديد - ${orderData.orderType === 'free' ? 'مجاني' : 'مدفوع'}</div>

    <div class="message">
      تم استلام طلب جديد وهو بحاجة إلى المراجعة والمعالجة.
    </div>

    <div class="order-info">
      <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
      <div style="margin-top: 10px; color: ${orderData.orderType === 'free' ? '#22c55e' : colors.primary}; font-weight: bold; font-size: 16px; direction: rtl;">
        ${orderData.orderType === 'free' ? ' طلب مجاني' : ' طلب مدفوع'} - ${orderData.totalPrice.toFixed(2)} USD
      </div>
    </div>

    <div class="customer-info" style="background: rgba(130, 97, 198, 0.1); border: 1px solid rgba(130, 97, 198, 0.3); border-radius: 10px; padding: 10px; margin: 10px; direction: rtl;">
      <div style="font-size: 20px; font-weight: bold; color: ${colors.primary}; margin-bottom: 20px;">معلومات العميل:</div>
      <div style="margin-bottom: 15px; margin-right:5px; color: ${colors.light}; font-size: 17px;">👤 الاسم: ${orderData.customerName}</div>
      <div style="margin-bottom: 15px; margin-right:5px; color: ${colors.light}; font-size: 17px;">📧 البريد الإلكتروني: ${orderData.customerEmail}</div>
      ${orderData.customerPhone ? `<div style=" margin-right:5px; color: ${colors.light}; font-size: 17px;">📱 الهاتف: ${orderData.customerPhone}</div>` : ''}
    </div>

    <div class="order-items" style="background: rgba(216, 232, 100, 0.1); border: 1px solid rgba(216, 232, 100, 0.3); border-radius: 10px; padding: 30px; margin: 30px 0;">
      <div style="font-size: 20px; font-weight: bold; color: ${colors.success}; margin: 5px; padding: 5px; direction: rtl;">تفاصيل الطلب:</div>
      ${itemsList}
    </div>

    <div class="message">
      يرجى مراجعة الطلب في لوحة التحكم واتخاذ الإجراء المناسب.
      <br><br>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/orders" style="color: ${colors.primary}; text-decoration: none; font-weight: bold;">🔗 الذهاب إلى لوحة التحكم</a>
    </div>
  `;

    return await createBaseTemplate(content, `طلب جديد - ${orderData.orderNumber}`);
};

// Free order missing customization email template
const createFreeOrderMissingCustomizationTemplate = async (orderData: {
    orderNumber: string;
    customerName: string;
    orderId: string;
    createdAt: Date;
}) => {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const content = `
        <div class="title">⚠️ طلبك المجاني يحتاج تفاصيل إضافية</div>

        <div class="message">
            مرحباً ${orderData.customerName}،
            <br><br>
            طلبك يحتوي على منتجات قابلة للتخصيص، لكن لم يتم إضافة تفاصيل التخصيص المطلوبة. يرجى إضافة التفاصيل أو سيتواصل معك فريقنا لاستلام المتطلبات.
        </div>

        <div class="order-info">
            <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
            <div style="margin-top: 10px; color: #22c55e; font-weight: bold; font-size: 16px; direction: rtl;">
                💚 طلب مجاني - $0.00
            </div>
            <div style="margin-top: 10px; color: #f59e0b; font-weight: bold; font-size: 16px; direction: rtl;">
                ⚠️ في انتظار التخصيصات
            </div>
            <div style="margin-top: 10px; color: ${colors.textSecondary}; font-size: 16px; direction: rtl;">
                📅 التاريخ: ${orderData.createdAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/customer/orders/${orderData.orderId}"
               style="display: inline-block; background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(130, 97, 198, 0.4);">
                📝 إضافة تفاصيل التخصيص
            </a>
        </div>

        <div class="message">
            إذا كان لديك أي استفسار، لا تتردد في التواصل معنا.
            <br><br>
            <strong>فريق Prestige Designs</strong> ❤️
        </div>
    `;

    return await createBaseTemplate(content, `تفاصيل إضافية مطلوبة - ${orderData.orderNumber}`);
};

// Free order under review email template
const createFreeOrderUnderReviewTemplate = async (orderData: {
    orderNumber: string;
    customerName: string;
    orderId: string;
    createdAt: Date;
}) => {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const content = `
        <div class="title">📋 طلبك المجاني قيد المراجعة</div>

        <div class="message">
            مرحباً ${orderData.customerName}،
            <br><br>
            طلبك يحتوي على تخصيصات تحتاج لمراجعة فريقنا. سنتواصل معك قريباً بالتفاصيل ونبدأ العمل على التصاميم.
        </div>

        <div class="order-info">
            <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
            <div style="margin-top: 10px; color: #22c55e; font-weight: bold; font-size: 16px; direction: rtl;">
                💚 طلب مجاني - $0.00
            </div>
            <div style="margin-top: 10px; color: #f59e0b; font-weight: bold; font-size: 16px; direction: rtl;">
                📋 قيد المراجعة
            </div>
            <div style="margin-top: 10px; color: ${colors.textSecondary}; font-size: 16px; direction: rtl;">
                📅 التاريخ: ${orderData.createdAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/customer/orders"
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);">
                📋 متابعة طلباتي
            </a>
        </div>

        <div class="message">
            شكراً لثقتكم في خدماتنا! سنقوم بإعلامكم فور الانتهاء من مراجعة طلبكم.
            <br><br>
            <strong>فريق Prestige Designs</strong> ❤️
        </div>
    `;

    return await createBaseTemplate(content, `طلبك قيد المراجعة - ${orderData.orderNumber}`);
};

// Customization processing email template (for paid orders)
const createCustomizationProcessingTemplate = async (orderData: {
    orderNumber: string;
    customerName: string;
    customWorkItems?: Array<{
        productName: string;
        quantity: number;
    }>;
}) => {
    const itemsList = orderData.customWorkItems && orderData.customWorkItems.length > 0
        ? orderData.customWorkItems.map(item => `
        <div class="order-item">
            <div class="item-name">📦 ${item.productName}</div>
            <div class="item-details">الكمية: ${item.quantity}</div>
        </div>
        `).join('')
        : '';

    const content = `
        <div class="title">🎨 طلبك قيد المعالجة</div>

        <div class="message">
            مرحباً ${orderData.customerName}،
            <br><br>
            تم استلام طلبك بنجاح وتأكيد الدفع. سيتم العمل على تخصيص التصاميم حسب متطلباتك وإرسالها إليك في أقرب وقت ممكن.
        </div>

        <div class="order-info">
            <div class="order-number">رقم الطلب: ${orderData.orderNumber}</div>
            <div style="margin-top: 10px; color: ${colors.primary}; font-weight: bold; font-size: 16px; direction: rtl;">
                💎 طلب مدفوع
            </div>
            <div style="margin-top: 10px; color: #f59e0b; font-weight: bold; font-size: 16px; direction: rtl;">
                🎨 قيد المعالجة
            </div>
        </div>

        ${itemsList ? `
        <div class="order-items" style="background: rgba(216, 232, 100, 0.1); border: 1px solid rgba(216, 232, 100, 0.3); border-radius: 10px; padding: 25px; margin: 25px 0;">
            <div style="font-size: 18px; font-weight: bold; color: ${colors.success}; margin-bottom: 15px; direction: rtl;">العناصر التي تتطلب عمل مخصص:</div>
            ${itemsList}
        </div>
        ` : ''}

        <div class="message">
            شكراً لثقتك بنا. سنتواصل معك في حال احتجنا لأي توضيحات إضافية.
            <br><br>
            <strong>فريق Prestige Designs</strong> ❤️
        </div>
    `;

    return await createBaseTemplate(content, `معالجة طلبك - ${orderData.orderNumber}`);
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
            totalPrice?: number;
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
            totalPrice?: number;
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
                    <strong>فريق Prestige Designs</strong> ❤️
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
     * Send admin notification email
     */
    static async sendAdminNotification(
        adminEmail: string,
        orderData: {
            orderNumber: string;
            customerName: string;
            customerEmail: string;
            customerPhone?: string;
            totalPrice: number;
            items: Array<{
                productName: string;
                quantity: number;
                price: number;
            }>;
            orderType: string;
        }
    ) {
        try {
            const html = await createAdminNotificationTemplate(orderData);

            const mailOptions = {
                from: `"${emailSender.name}" <${emailSender.from}>`,
                to: adminEmail,
                subject: `طلب جديد - ${orderData.orderNumber}`,
                html: html,
            };

            const result = await transporter.sendMail(mailOptions) as { messageId: string };
            console.log('✅ Admin notification email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Error sending admin notification email:', error);
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

    /**
     * Send free order missing customization email
     */
    static async sendFreeOrderMissingCustomizationEmail(
        to: string,
        orderData: {
            orderNumber: string;
            customerName: string;
            orderId: string;
            createdAt: Date;
        }
    ) {
        try {
            const html = await createFreeOrderMissingCustomizationTemplate(orderData);

            const mailOptions = {
                from: `"${emailSender.name}" <${emailSender.from}>`,
                to: to,
                subject: `⚠️ طلبك المجاني يحتاج تفاصيل إضافية - ${orderData.orderNumber}`,
                html: html,
            };

            const result = await transporter.sendMail(mailOptions) as { messageId: string };
            console.log('✅ Free order missing customization email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Error sending free order missing customization email:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Send free order under review email
     */
    static async sendFreeOrderUnderReviewEmail(
        to: string,
        orderData: {
            orderNumber: string;
            customerName: string;
            orderId: string;
            createdAt: Date;
        }
    ) {
        try {
            const html = await createFreeOrderUnderReviewTemplate(orderData);

            const mailOptions = {
                from: `"${emailSender.name}" <${emailSender.from}>`,
                to: to,
                subject: `📋 طلبك المجاني قيد المراجعة - ${orderData.orderNumber}`,
                html: html,
            };

            const result = await transporter.sendMail(mailOptions) as { messageId: string };
            console.log('✅ Free order under review email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Error sending free order under review email:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Send customization processing email
     */
    static async sendCustomizationProcessingEmail(
        to: string,
        orderData: {
            orderNumber: string;
            customerName: string;
            customWorkItems?: Array<{
                productName: string;
                quantity: number;
            }>;
        }
    ) {
        try {
            const html = await createCustomizationProcessingTemplate(orderData);

            const mailOptions = {
                from: `"${emailSender.name}" <${emailSender.from}>`,
                to: to,
                subject: `🎨 معالجة طلبك - ${orderData.orderNumber}`,
                html: html,
            };

            const result = await transporter.sendMail(mailOptions) as { messageId: string };
            console.log('✅ Customization processing email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Error sending customization processing email:', error);
            return { success: false, error: (error as Error).message };
        }
    }
}