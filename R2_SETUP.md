# Cloudflare R2 Setup Guide

This guide walks you through setting up Cloudflare R2 as the file storage backend for Prestige Designs.

## Overview

**Cloudflare R2** is an S3-compatible object storage solution that:

- Provides **unlimited API calls** (no overage charges)
- Offers **free egress bandwidth** (no data transfer costs)
- Costs only **$0.015 per GB stored** (pay-as-you-go)
- Works seamlessly with AWS SDK (S3 API compatible)

> Perfect for file storage with API-based downloads!

## Prerequisites

- Cloudflare account (free tier works for R2)
- Credit/debit card for billing (R2 requires one even for free tier)
- Access to environment variables

## Step 1: Create Cloudflare Account

1. Visit [https://www.cloudflare.com/products/r2/](https://www.cloudflare.com/products/r2/)
2. Click **"Sign Up"** (use existing account if you have one)
3. Complete email verification
4. Set up 2FA if prompted (optional but recommended)

## Step 2: Create R2 Bucket

1. Log in to **Cloudflare Dashboard** → [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Navigate to **R2** (left sidebar)
3. Click **"Create bucket"**
4. Enter bucket name: `prestige-designs-files`
   - Bucket names must be lowercase with hyphens only
5. Select region: **Automatic (Geo-Redundant)** ✓
6. Click **"Create bucket"**
7. Note your **Account ID** (displayed at the top of the dashboard, format: `abc123def456`)

## Step 3: Generate R2 API Token

### Create API Token

1. Go to **Account Home** → [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Select account → **R2**
3. Click **"API Tokens"** (left sidebar under Settings)
4. Click **"Create API token"**
5. Choose **"Edit (Full)"** template
6. Configure:
   - **Token Name**: `prestige-designs-api`
   - **Permissions**:
     - ✓ Account > R2 > Edit
   - **TTL**: Never (for production)
   - **Applicable Buckets**: `prestige-designs-files` (or All buckets)
7. Click **"Create Token"**

### Save Credentials

You'll see two credentials - **copy both immediately**:

```
Access Key ID:     (example: abc123def456ghi789)
Secret Access Key: (example: XyZ1a2B3c4D5e6F7g8H9i0jKlMnOpQrStUvWxYz)
```

Keep these secure! You won't see the secret again.

## Step 4: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id_here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key_here
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_R2_BUCKET_NAME=prestige-designs-files
```

### Example (filled in):

```env
CLOUDFLARE_R2_ACCESS_KEY_ID=abc123def456ghi789jkl012
CLOUDFLARE_R2_SECRET_ACCESS_KEY=XyZ1a2B3c4D5e6F7g8H9i0jKlMnOpQrStUvWxYz
CLOUDFLARE_R2_ACCOUNT_ID=f1a2b3c4d5e6f7g8h9i0j
CLOUDFLARE_R2_BUCKET_NAME=prestige-designs-files
```

## Step 5: Verify Setup

### Via API Endpoint

Once environment variables are set, restart your development server and test:

```bash
# Public test endpoint (no authentication required)
curl http://localhost:3000/api/r2/test
```

**Success Response:**

```json
{
  "success": true,
  "message": "Successfully connected to Cloudflare R2",
  "bucket": "prestige-designs-files",
  "quota": "Unlimited (Pay-as-you-go)",
  "timestamp": "2025-01-22T10:30:00.000Z"
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "R2 service not configured",
  "configured": false,
  "nextSteps": [...]
}
```

### Via Cloudflare Dashboard

1. Go to **R2** → **Buckets**
2. Click your `prestige-designs-files` bucket
3. Should see **0 Objects** (until files are uploaded)

## How Files Are Stored

### Directory Structure in R2

Files are organized by type and context:

```
prestige-designs-files/
├── designs/
│   ├── product-slug-1/
│   │   ├── design.psd
│   │   ├── preview.jpg
│   │   └── color-red/
│   │       ├── design.psd
│   │       └── preview.jpg
│   └── product-slug-2/
│       └── design.psd
│
└── orders/
    ├── PD-2025-001/
    │   ├── product-slug/
    │   │   └── design.psd
    │   └── product-slug-2/
    │       └── design.psd
    └── PD-2025-002/
        └── product-slug/
            └── design.psd
```

### File Keys

File location is stored as a single key:

- **Design File**: `designs/product-slug/file.psd`
- **Order File**: `orders/PD-2025-001/product-slug/file.psd`
- **Color Variant**: `designs/product-slug/color-red/file.psd`

### Database Tracking

Each file entry in MongoDB includes:

```javascript
{
  r2FileKey: "designs/product-slug/file.psd",
  r2FolderPath: "designs/product-slug",
  useR2: true,
  r2Url: "https://prestige-designs-files.f1a2b3c4d5e6f7g8.r2.cloudflarestorage.com/designs/product-slug/file.psd"
}
```

## API Endpoints

### Upload Design File (Admin)

```http
POST /api/admin/upload/design-file
Content-Type: multipart/form-data

Form Fields:
- file: <binary file>
- productSlug: "product-name"
- fileName: "design.psd"
- folderPath: "designs" or "orders"
- orderId: "PD-2025-001" (if order file)
- colorVariant: "red" (optional)
```

**Response:**

```json
{
  "success": true,
  "message": "File uploaded to R2 successfully",
  "fileId": "507f1f77bcf86cd799439011",
  "r2FileKey": "designs/product-slug/design.psd",
  "r2Url": "https://prestige-designs-files.f1a2b3c4d5e6f7g8.r2.cloudflarestorage.com/..."
}
```

### Download File (Customer)

```http
GET /api/design-files/:fileId/download

Headers:
- Authorization: Bearer <customer-token> (if required)
```

**Response:**

- Binary file stream
- Content-Type: file/image/application/octet-stream
- Content-Disposition: attachment; filename="design.psd"

## Monitoring & Costs

### Check Storage Usage

1. Go to **R2** → **Buckets**
2. Click `prestige-designs-files`
3. See **Objects** count and **Storage Used**

### Expected Costs

For typical design files:

| Scenario              | Monthly Storage | Monthly Cost |
| --------------------- | --------------- | ------------ |
| 100 designs × 5MB     | 500 MB          | ~$0.01       |
| 1000 designs × 5MB    | 5 GB            | ~$0.08       |
| 10,000 designs × 5MB  | 50 GB           | ~$0.75       |
| 100,000 designs × 5MB | 500 GB          | ~$7.50       |

**API Calls**: Unlimited - no additional charge
**Bandwidth**: Free - no egress charges

### Billing Dashboard

Monitor costs at: [https://dash.cloudflare.com/billing/overview](https://dash.cloudflare.com/billing/overview)

## Troubleshooting

### "R2 service not configured" Error

**Solution**: Verify environment variables are set:

```bash
# Check if variables are loaded
echo $CLOUDFLARE_R2_ACCESS_KEY_ID
```

Restart dev server after adding env variables.

### "Access Denied" During Upload

**Causes & Solutions**:

1. **Wrong credentials**: Verify Access Key ID and Secret in `.env.local`
2. **Insufficient permissions**: Regenerate API token with full "Edit" permissions
3. **Bucket doesn't exist**: Create `prestige-designs-files` bucket in R2 dashboard
4. **Wrong account ID**: Copy exact Account ID from dashboard (no spaces)

### "Bucket not found"

**Solution**:

1. Check bucket name is exactly: `prestige-designs-files` (lowercase, hyphens)
2. Verify bucket exists in R2 dashboard
3. Ensure bucket is in same account as API token

### Slow Upload/Download

**Causes & Solutions**:

1. **Large files**: Consider compression before upload
   - PSD files: typically 50-500 MB
   - Pre-compress if over 1 GB
2. **Network latency**: R2 is global, but nearest region is optimal
   - Change bucket region in settings if too slow
3. **Concurrent uploads**: R2 handles unlimited concurrency - no issues
4. **Download speed**: Limited by customer internet, not R2 (free egress)

### Test Connection Fails

**Debugging steps**:

```bash
# 1. Verify environment variables
cat .env.local | grep CLOUDFLARE

# 2. Check Node.js can reach R2
curl https://your_account_id.r2.cloudflarestorage.com

# 3. Test endpoint
curl http://localhost:3000/api/r2/test

# 4. Check server logs
# Look for error messages in terminal
```

## Advanced Configuration

### Custom R2 Domain

If you want custom domain for downloads:

1. Create public R2 bucket
2. Add Custom Domain in R2 settings
3. Point DNS to R2 domain
4. Update `r2Url` in responses to use custom domain

**Example**:

```
Before: https://prestige-designs-files.f1a2b3c4d5e6f7g8.r2.cloudflarestorage.com/...
After:  https://cdn.prestige-designs.com/...
```

### Private vs Public Bucket

Current setup uses **private bucket** with authenticated downloads via API.

**Advantages**:

- ✓ Only authenticated customers can download
- ✓ Bandwidth free (no direct R2 URLs exposed)
- ✓ Server controls access
- ✓ Download tracking via API

### Lifecycle Policies

Auto-delete old files after retention period:

1. Go to **R2** → **Buckets** → `prestige-designs-files`
2. Click **Settings** → **Lifecycle rules**
3. Set rules like: "Delete objects after 365 days"

Example: Auto-archive order files after 1 year.

## Security Best Practices

### API Token Rotation

Rotate credentials quarterly:

1. Generate new token (as in Step 3)
2. Update `.env.local` with new credentials
3. Restart application
4. Delete old token in R2 dashboard

### Restrict Token Scope

In production, restrict tokens to specific buckets:

1. Create separate tokens for different buckets
2. Use least-privilege principle
3. Disable unused tokens

### Backup Strategy

R2 is **not a backup solution** (data is only in one location).

For critical files:

1. Enable **versioning** in bucket settings (free)
2. Consider backup to secondary storage quarterly
3. Document design file history in MongoDB

## Next Steps

After setup verification:

1. ✓ Test upload via admin panel
2. ✓ Verify file appears in R2 bucket
3. ✓ Test download via customer API
4. ✓ Check file is tracked in MongoDB
5. ✓ Monitor usage in Cloudflare dashboard

## Support & Resources

- **Cloudflare R2 Docs**: https://developers.cloudflare.com/r2/
- **Pricing Calculator**: https://www.cloudflare.com/en-gb/products/r2/pricing/
- **API Reference**: https://developers.cloudflare.com/r2/api/s3/
- **Discord/Support**: https://www.cloudflare.com/support/

---

**Summary**: R2 is now your file storage backend with unlimited API calls and free bandwidth. Files are organized in folders, streamed to customers via authenticated API, and tracked in MongoDB. Monthly costs typically under $1 for moderate usage.
