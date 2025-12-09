# R2 Implementation Complete ✅

## Summary

Cloudflare R2 storage has been fully implemented for the Prestige Designs application. Files are now uploaded to R2 instead of Google Drive, with unlimited API calls and free bandwidth.

## What Was Implemented

### 1. **R2Service** (`src/lib/services/r2Service.ts`)

Complete S3-compatible service for Cloudflare R2 operations:

**Methods:**

- `uploadFile(buffer, fileName, folderPath, contentType)` - Upload files to R2
- `downloadFile(fileKey)` - Stream files from R2
- `deleteFile(fileKey)` - Delete files from R2
- `getFileMetadata(fileKey)` - Retrieve file metadata
- `testConnection()` - Verify R2 credentials work
- `isConfigured()` - Check if credentials are set
- `getQuotaStatus()` - Returns unlimited quota info

**Configuration:**

- Bucket: `prestige-designs-files`
- Endpoint: S3-compatible R2 API
- Authentication: Access Key ID + Secret Access Key
- Region: Global (Geo-Redundant)

### 2. **Upload Endpoint** (`src/app/api/admin/upload/design-file/route.ts`)

Updated to use R2 instead of Google Drive:

**Features:**

- Accepts file uploads from admin panel
- Stores files in R2 bucket
- Organizes by folder structure (`designs/` or `orders/`)
- Saves metadata to MongoDB with r2FileKey and r2FolderPath
- Returns R2 file key and public URL

**Flow:**

```
Admin Upload → FormData → Buffer → R2.uploadFile() → MongoDB (with r2FileKey)
```

### 3. **Download Endpoint** (`src/app/api/design-files/[id]/download/route.ts`)

Updated to serve files from R2:

**Features:**

- Checks if file is stored in R2 (useR2 = true)
- Falls back to Google Drive for legacy files
- Streams file from R2 with proper headers
- Tracks download count in MongoDB
- Authenticated via customer session/API token

**Flow:**

```
Customer Request → Check useR2 → Fetch from R2 → Stream Response → Increment Counter
```

### 4. **Test Endpoint** (`src/app/api/r2/test/route.ts`)

Public endpoint to verify R2 configuration:

**Response (Success):**

```json
{
  "success": true,
  "message": "Successfully connected to Cloudflare R2",
  "bucket": "prestige-designs-files",
  "quota": "Unlimited (Pay-as-you-go)",
  "timestamp": "2025-01-22T10:30:00.000Z"
}
```

**Response (Not Configured):**

```json
{
  "success": false,
  "message": "R2 service not configured",
  "configured": false,
  "nextSteps": [...]
}
```

**Test it:**

```bash
curl http://localhost:3000/api/r2/test
```

### 5. **Setup Guide** (`R2_SETUP.md`)

Comprehensive guide covering:

✅ **Step-by-Step Setup:**

- Create Cloudflare account
- Create R2 bucket
- Generate API credentials
- Configure environment variables

✅ **Verification:**

- API endpoint testing
- Dashboard verification
- Credential validation

✅ **File Organization:**

- Directory structure in R2
- File key format
- Database tracking

✅ **API Endpoints:**

- Upload endpoint documentation
- Download endpoint documentation
- Request/response examples

✅ **Monitoring & Costs:**

- Storage usage tracking
- Cost estimation (typically <$1/month for small-medium usage)
- Billing dashboard link

✅ **Troubleshooting:**

- Configuration issues
- Permission errors
- Bucket not found
- Slow upload/download
- Connection failures

✅ **Advanced Topics:**

- Custom domain configuration
- Private vs public buckets
- Lifecycle policies
- Security best practices

## File Structure

Files are organized in R2 bucket with clear hierarchy:

```
prestige-designs-files/
├── designs/
│   └── [product-slug]/
│       ├── [filename.ext]
│       └── color-[variant]/
│           └── [filename.ext]
│
└── orders/
    └── [ORDER_ID]/
        └── [product-slug]/
            ├── [filename.ext]
            └── color-[variant]/
                └── [filename.ext]
```

Example keys:

- `designs/prestige-packages/design.psd`
- `designs/prestige-packages/color-red/design.psd`
- `orders/PD-2025-001/prestige-packages/design.psd`

## Environment Variables Required

Add these to `.env.local`:

```env
# Cloudflare R2 Credentials
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_BUCKET_NAME=prestige-designs-files
```

## Database Updates Needed

When uploading files to R2, MongoDB documents now include:

```javascript
{
  // ... existing fields ...
  useR2: true,                    // Indicates file is in R2
  r2FileKey: "designs/slug/file.psd",  // File location in R2
  r2FolderPath: "designs/slug",        // Folder path for organization
  r2Url: "https://bucket.r2.cloudflarestorage.com/...",  // Public URL

  // Legacy fields (kept for backward compatibility)
  useGoogleDrive: false,          // No longer used
  googleDriveFileId: null,        // Deprecated
}
```

## Package Installation

AWS SDK installed with `--legacy-peer-deps`:

```bash
npm install @aws-sdk/client-s3 --legacy-peer-deps
```

Added to `package.json`:

- `@aws-sdk/client-s3` (latest version)

## Cost Breakdown

**Cloudflare R2 Pricing:**

- **Storage**: $0.015 per GB/month
- **API calls**: Unlimited (no charge)
- **Bandwidth out**: Free (no egress charges)

**Typical Usage:**
| Usage | Monthly Cost |
|-------|--------------|
| 500 MB (100 designs × 5MB) | ~$0.01 |
| 5 GB (1000 designs × 5MB) | ~$0.08 |
| 50 GB (10,000 designs) | ~$0.75 |
| 500 GB (100,000 designs) | ~$7.50 |

## Next Steps

1. **Configure R2 Account:**

   - Sign up for Cloudflare: https://www.cloudflare.com
   - Create R2 bucket: `prestige-designs-files`
   - Generate API credentials

2. **Set Environment Variables:**

   - Add credentials to `.env.local`
   - Include all 4 required environment variables

3. **Test Connection:**

   - Restart dev server
   - Visit: `http://localhost:3000/api/r2/test`
   - Should see success response

4. **Test Upload:**

   - Go to admin panel
   - Upload a design file
   - Verify appears in R2 bucket dashboard

5. **Test Download:**

   - Download file as customer
   - Verify file is served from R2
   - Check download count increments

6. **Monitor Storage:**
   - Check R2 dashboard for usage
   - Monitor billing
   - Scale as needed

## Backward Compatibility

✅ **Existing Google Drive Files:**

- Still work via legacy code path
- Download endpoint checks useR2 first, then Google Drive, then local
- No migration required immediately

⚠️ **Shared Drives Feature (Removed):**

- R2 doesn't support sharing like Google Drive
- Customers download via API instead
- No email notifications (simpler approach)

## File Uploads vs. API Downloads

**Upload Flow (Admin):**

1. Select file in admin panel
2. Post to `/api/admin/upload/design-file`
3. File → Buffer → R2
4. Save metadata with `r2FileKey` to MongoDB

**Download Flow (Customer):**

1. Customer requests file
2. API validates authentication
3. Fetch from R2 using `r2FileKey`
4. Stream file with proper headers
5. Increment download counter

**Advantages:**

- ✅ Unlimited API calls (no cost scaling)
- ✅ Free bandwidth (no egress charges)
- ✅ Secure (no direct R2 URLs exposed)
- ✅ Trackable (download counts)
- ✅ Centralized (single API)

## Configuration Reference

For detailed setup instructions, see [R2_SETUP.md](./R2_SETUP.md)

Quick links:

- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [R2 Pricing Calculator](https://www.cloudflare.com/en-gb/products/r2/pricing/)
- [R2 API Documentation](https://developers.cloudflare.com/r2/api/s3/)

---

**Status**: ✅ Implementation Complete
**Ready for**: R2 account setup and environment variable configuration
