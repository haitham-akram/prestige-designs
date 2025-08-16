# Production Build Instructions

## Quick Start

1. **Set Environment Variables**
   ```bash
   cp .env.production .env.local
   # Edit .env.local with your production values
   ```

2. **Build and Test Locally**
   ```bash
   npm run build
   npm start
   ```

3. **Deploy to Vercel (Recommended)**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

## Alternative Deployment Options

### Railway
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically

### Render
1. Connect GitHub repository  
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Add environment variables

### Docker
```bash
# Build image
docker build -t prestige-designs .

# Run container
docker run -p 3000:3000 --env-file .env.production prestige-designs
```

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database properly set up and indexed
- [ ] PayPal Live credentials configured
- [ ] SMTP email service configured
- [ ] Domain and SSL configured
- [ ] Error monitoring set up (Sentry recommended)
- [ ] Analytics configured (Google Analytics)

## Post-Deployment

1. Test all critical flows
2. Monitor error logs
3. Check payment processing
4. Verify email delivery
5. Monitor performance metrics
