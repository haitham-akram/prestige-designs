# Prestige Designs Production Deployment Guide

## 🚀 Production Readiness Checklist

### 1. Security Configuration ✅

#### Environment Variables
- [ ] Create production `.env.production` file with secure values
- [ ] Generate strong `NEXTAUTH_SECRET` (use: `openssl rand -base64 32`)
- [ ] Generate strong `JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Set production database URLs
- [ ] Configure production OAuth app credentials
- [ ] Set up production SMTP credentials
- [ ] Configure production PayPal Live credentials

#### Security Headers & CSP
```javascript
// next.config.ts
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongoose']
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          }
        ],
      },
    ]
  },
}
```

### 2. Database Configuration ✅

#### MongoDB Production Setup
- [ ] Create MongoDB Atlas production cluster
- [ ] Configure IP whitelist for your server
- [ ] Set up database user with minimal required permissions
- [ ] Enable database monitoring and alerts
- [ ] Configure backup strategy

#### Database Indexes (Run in production)
```javascript
// Connect to MongoDB and run these commands
db.products.createIndex({ slug: 1 }, { unique: true })
db.categories.createIndex({ slug: 1 }, { unique: true })
db.orders.createIndex({ orderNumber: 1 }, { unique: true })
db.orders.createIndex({ userId: 1 })
db.orders.createIndex({ status: 1 })
db.promocodes.createIndex({ code: 1 }, { unique: true })
db.reviews.createIndex({ isActive: 1 })
db.users.createIndex({ email: 1 }, { unique: true })
```

### 3. Payment System Configuration ✅

#### PayPal Live Environment
- [ ] Create PayPal Business Account
- [ ] Get Live API credentials from PayPal Developer Dashboard
- [ ] Configure webhook endpoints for payment notifications
- [ ] Test payment flow in PayPal sandbox first
- [ ] Update environment variables with live credentials
- [ ] Verify refund functionality works with live account

### 4. File Upload & Storage ✅

#### Cloudinary Production
- [ ] Create Cloudinary production account
- [ ] Configure upload presets and transformations
- [ ] Set up folder structure for organized uploads
- [ ] Configure security settings and access controls

### 5. Email Configuration ✅

#### SMTP Setup
- [ ] Configure production email service (Gmail, SendGrid, etc.)
- [ ] Set up SPF, DKIM, and DMARC records
- [ ] Test email delivery for order confirmations
- [ ] Configure email templates for professional appearance

### 6. Performance Optimization 🔧

#### Next.js Production Build
```bash
# Build and test production locally
npm run build
npm start
```

#### Image Optimization
- [ ] Verify all images are properly optimized
- [ ] Check Cloudinary transformations are working
- [ ] Test image loading performance

#### Caching Strategy
```javascript
// Add to next.config.ts
const nextConfig = {
  // ... existing config
  async rewrites() {
    return [
      {
        source: '/api/cache/:path*',
        destination: '/api/:path*',
        has: [
          {
            type: 'header',
            key: 'cache-control',
            value: 'max-age=3600',
          },
        ],
      },
    ]
  },
}
```

### 7. Monitoring & Analytics 📊

#### Error Tracking
- [ ] Set up Sentry for error monitoring
- [ ] Configure logging for API endpoints
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)

#### Analytics
- [ ] Configure Google Analytics
- [ ] Set up conversion tracking for orders
- [ ] Monitor payment success rates

### 8. Deployment Options 🌐

#### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel Dashboard
```

#### Option 2: Netlify
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Set environment variables
- [ ] Deploy

#### Option 3: Self-hosted (Docker)
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

#### Option 4: Railway/Render
- [ ] Connect repository
- [ ] Configure environment variables
- [ ] Deploy with auto-scaling

### 9. Domain & SSL 🔐

#### Domain Configuration
- [ ] Purchase production domain
- [ ] Configure DNS settings
- [ ] Set up SSL certificate (automatically handled by most platforms)
- [ ] Configure subdomain redirects if needed

### 10. Testing Checklist ✅

#### Pre-Production Testing
- [ ] Test user registration and login
- [ ] Test product browsing and search
- [ ] Test cart functionality
- [ ] Test checkout process with real payment
- [ ] Test promo code application
- [ ] Test order management (admin panel)
- [ ] Test refund functionality
- [ ] Test email notifications
- [ ] Test file uploads
- [ ] Test responsive design on mobile/tablet

### 11. Go-Live Preparation 📋

#### Final Steps
- [ ] Create admin user account
- [ ] Upload initial products and categories
- [ ] Configure site settings (logo, contact info, etc.)
- [ ] Set up Google Search Console
- [ ] Create robots.txt and sitemap.xml
- [ ] Prepare customer support documentation

#### Launch Day
- [ ] Monitor error logs closely
- [ ] Test all critical user flows
- [ ] Monitor payment processing
- [ ] Check email delivery
- [ ] Monitor server resources
- [ ] **Create admin user account**

### 12. Admin User Setup 👤

#### Option 1: Using API Endpoint (Recommended for Production)
After deployment, create the admin user by calling:

```bash
# Set environment variable for security
export ADMIN_SETUP_KEY="your-secure-key-here"

# Call the API endpoint
curl -X POST "https://yourdomain.com/api/admin/setup-user" \
  -H "x-admin-setup-key: your-secure-key-here"
```

#### Option 2: Using Node.js Script (Local/Development)
```bash
# Run the admin creation script
npm run admin:create
```

#### Admin Credentials
- **Email:** `vip.nasser2021@gmail.com`
- **Password:** `AdminPrestige2025!`
- **Role:** `admin`

⚠️ **IMPORTANT:** Change the password immediately after first login!

### 13. Post-Launch Monitoring 📈

#### Week 1-2
- [ ] Daily error log review
- [ ] Payment success rate monitoring
- [ ] User feedback collection
- [ ] Performance optimization
- [ ] Security audit

## 🛠️ Recommended Deployment: Vercel

For your Next.js application, Vercel is the most straightforward option:

1. **Push to GitHub** (already done)
2. **Connect Vercel to GitHub**
3. **Configure environment variables**
4. **Deploy with one click**

Vercel provides:
- ✅ Automatic SSL
- ✅ Global CDN
- ✅ Serverless functions
- ✅ Easy scaling
- ✅ Built-in analytics

Would you like me to help you with any specific deployment platform or configuration?
