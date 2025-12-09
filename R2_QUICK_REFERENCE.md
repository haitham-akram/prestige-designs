# R2 Quick Reference Card

## Setup (First Time)

### 1. Create Cloudflare Account

https://www.cloudflare.com → Sign up → Verify email

### 2. Create R2 Bucket

Dashboard → R2 → Create bucket → Name: `prestige-designs-files`

### 3. Get Account ID

Dashboard → R2 → Copy "Account ID" (format: abc123def456...)

### 4. Create API Token

Account Home → R2 → API Tokens → Create → Token name: `prestige-designs-api` → Copy Access Key ID + Secret

### 5. Add to .env.local

```env
CLOUDFLARE_R2_ACCESS_KEY_ID=<paste here>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<paste here>
CLOUDFLARE_R2_ACCOUNT_ID=<paste here>
CLOUDFLARE_R2_BUCKET_NAME=prestige-designs-files
```

### 6. Test Connection

```bash
npm run dev  # Restart server
# Then visit: http://localhost:3000/api/r2/test
```

## File Organization

| Type           | Path                                  | Example                                           |
| -------------- | ------------------------------------- | ------------------------------------------------- |
| Design         | `designs/[slug]/[file]`               | `designs/prestige-packages/design.psd`            |
| Design Variant | `designs/[slug]/color-[color]/[file]` | `designs/prestige-packages/color-red/design.psd`  |
| Order          | `orders/[ORDER_ID]/[slug]/[file]`     | `orders/PD-2025-001/prestige-packages/design.psd` |

## API Endpoints

### Upload Design File (Admin Only)

```http
POST /api/admin/upload/design-file
Content-Type: multipart/form-data

productSlug=prestige-packages&fileName=design.psd&file=<binary>
```

### Download File (Authenticated Customer)

```http
GET /api/design-files/[fileId]/download
Authorization: Bearer [token]
```

### Test R2 Connection (Public)

```http
GET /api/r2/test
```

## Code Examples

### Upload File (R2Service)

```typescript
import { R2Service } from '@/lib/services/r2Service'

const buffer = await file.arrayBuffer()
const result = await R2Service.uploadFile(buffer, 'design.psd', 'designs/prestige-packages', 'application/octet-stream')

console.log(result.fileKey) // designs/prestige-packages/design.psd
console.log(result.url) // https://bucket.r2.cloudflarestorage.com/...
```

### Download File (R2Service)

```typescript
const stream = await R2Service.downloadFile('designs/prestige-packages/design.psd')
response.setHeader('Content-Type', 'application/octet-stream')
response.setHeader('Content-Disposition', 'attachment; filename="design.psd"')
stream.pipe(response)
```

### Test Connection (R2Service)

```typescript
const result = await R2Service.testConnection()
console.log(result.success) // true/false
console.log(result.bucket) // prestige-designs-files
```

## MongoDB Schema

```typescript
interface DesignFile {
  // R2 Fields (New)
  useR2: boolean
  r2FileKey: string // e.g., "designs/slug/file.psd"
  r2FolderPath: string // e.g., "designs/slug"
  r2Url: string // Full URL to file

  // Legacy Fields (Keep for backward compatibility)
  useGoogleDrive?: boolean
  googleDriveFileId?: string
  localPath?: string

  // Common Fields
  fileName: string
  productId: string
  orderId?: string
  downloadCount: number
  createdAt: Date
  updatedAt: Date
}
```

## Troubleshooting Checklist

- [ ] Environment variables set in `.env.local`?
- [ ] Server restarted after changing .env?
- [ ] Bucket exists in R2 dashboard?
- [ ] API token has read/write permissions?
- [ ] Account ID is correct (no spaces)?
- [ ] Access Key ID and Secret copied correctly?
- [ ] Bucket name is exactly `prestige-designs-files`?

**Test it**: Visit `http://localhost:3000/api/r2/test`

## Costs

**$0.015 per GB/month** (pay-as-you-go)

| Size   | Monthly Cost |
| ------ | ------------ |
| 1 GB   | $0.015       |
| 10 GB  | $0.15        |
| 100 GB | $1.50        |
| 1 TB   | $15.00       |

**API Calls**: Unlimited - Free
**Bandwidth**: Free - No egress charges

## Important Files

- **Service**: `src/lib/services/r2Service.ts`
- **Upload Endpoint**: `src/app/api/admin/upload/design-file/route.ts`
- **Download Endpoint**: `src/app/api/design-files/[id]/download/route.ts`
- **Test Endpoint**: `src/app/api/r2/test/route.ts`
- **Setup Guide**: `R2_SETUP.md`
- **Implementation Details**: `R2_IMPLEMENTATION.md`

## Useful Links

- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [R2 Pricing](https://www.cloudflare.com/en-gb/products/r2/pricing/)
- [R2 API Docs](https://developers.cloudflare.com/r2/api/s3/)
- [AWS SDK for S3](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)
- [Support](https://www.cloudflare.com/support/)

## Common Commands

```bash
# Install dependencies
npm install @aws-sdk/client-s3 --legacy-peer-deps

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check environment variables
cat .env.local | grep CLOUDFLARE
```

---

**Remember**: R2 offers unlimited API calls and free bandwidth. The only cost is $0.015 per GB stored. Perfect for design file storage!
