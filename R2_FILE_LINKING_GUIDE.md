# R2 File Linking Guide

## Overview

This guide explains how the new R2-based file linking system works and how it maintains backward compatibility with existing files and orders.

## Problem Statement

When uploading design files before creating a product:

1. File uploaded with `productId: "temp"` → saves with `productId: null`
2. Product created with design file IDs → **created duplicate files** instead of updating existing ones
3. Result: Multiple records for the same file in database

## Solution: R2 Key-Based Linking

Instead of tracking files by MongoDB ID (which causes duplicates), we now track by **R2 file key** (S3-compatible object key), which is **unique and immutable**.

### Why R2 Key-Based Linking Works

✅ **Unique**: Same file = same R2 key (no duplicates possible)  
✅ **Immutable**: File key never changes throughout file lifecycle  
✅ **Simple**: No need to track multiple IDs  
✅ **Scalable**: Works even if same file uploaded multiple times  
✅ **Backward Compatible**: Doesn't affect existing local or Google Drive files

## Data Model Changes

### DesignFile Schema - New Fields

```typescript
// R2 storage fields (added to DesignFile model)
r2FileKey?: string;       // S3-compatible key for R2 (e.g., "prestige-designs-files/designs/r2-new/1765128870541_palpay.png")
r2FolderPath?: string;    // Folder path in R2 bucket (e.g., "prestige-designs-files/designs/r2-new")
useR2: boolean;           // true if file is stored in R2, false for legacy storage
```

### Indexes Added

```typescript
DesignFileSchema.index({ r2FileKey: 1 }) // Fast lookup by file key
DesignFileSchema.index({ useR2: 1 }) // Find all R2 files
DesignFileSchema.index({ r2FileKey: 1, productId: 1 }) // Compound index for linking
```

## File Upload Workflow

### 1. Upload Design File

**Endpoint**: `POST /api/admin/upload/design-file`

**Request**:

```json
{
  "fileName": "design.psd",
  "fileType": "psd",
  "fileSize": 5242880,
  "productId": "temp",
  "productSlug": "my-product",
  "description": "Main design file"
}
```

**Response**:

```json
{
  "success": true,
  "message": "File uploaded successfully to R2",
  "data": {
    "fileId": "6935baa7f1b9b2b8e0889977",
    "r2FileKey": "prestige-designs-files/designs/r2-new/1765128870541_palpay.png",
    "fileName": "design.psd",
    "fileUrl": "https://0d58d2a7a2d2a0fc439719300343b118.r2.cloudflarestorage.com/prestige-designs-files/designs/r2-new/1765128870541_palpay.png",
    "uploadedAt": "2025-12-07T17:34:31.359Z",
    "useR2": true
  }
}
```

**Database Record Created**:

```javascript
{
  _id: ObjectId,
  fileName: "design.psd",
  fileUrl: "https://r2.../1765128870541_palpay.png",
  productId: null,           // Not yet linked to product
  r2FileKey: "prestige-designs-files/designs/r2-new/1765128870541_palpay.png",
  r2FolderPath: "prestige-designs-files/designs/r2-new",
  useR2: true,
  isActive: true,
  createdAt: "2025-12-07T17:34:31.359Z"
}
```

### 2. Create Product with File Link

**Endpoint**: `POST /api/admin/products`

**Request** (Option A - using R2 keys):

```json
{
  "name": "My Product",
  "description": "Product description",
  "price": 99.99,
  "images": ["https://example.com/image.jpg"],
  "categoryId": "507f1f77bcf86cd799439011",
  "r2FileKeys": ["prestige-designs-files/designs/r2-new/1765128870541_palpay.png"]
}
```

**What Happens**:

1. Product created successfully
2. Auto-link logic runs: Finds file with matching `r2FileKey` and `productId: null`
3. Updates that file record: `productId` → product ID, `updatedAt` → now
4. **Result**: Single file record, now linked to product

**Final Database State**:

```javascript
{
  _id: ObjectId,
  fileName: "design.psd",
  fileUrl: "https://r2.../1765128870541_palpay.png",
  productId: ObjectId("6935bab0f1b9b2b8e088997b"),  // Now linked!
  r2FileKey: "prestige-designs-files/designs/r2-new/1765128870541_palpay.png",
  r2FolderPath: "prestige-designs-files/designs/r2-new",
  useR2: true,
  isActive: true,
  updatedAt: "2025-12-07T17:34:40.515Z"
}
```

### 3. Manual Linking (Fallback)

If product creation fails or you need to link files later:

**Endpoint**: `PATCH /api/admin/design-files/link-by-r2key`

**Request**:

```json
{
  "productId": "6935bab0f1b9b2b8e088997b",
  "r2FileKeys": ["prestige-designs-files/designs/r2-new/1765128870541_palpay.png"],
  "productSlug": "my-product"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Successfully linked 1 design files to product",
  "data": {
    "productId": "6935bab0f1b9b2b8e088997b",
    "productName": "My Product",
    "linkedCount": 1,
    "alreadyLinkedCount": 0
  }
}
```

## Backward Compatibility

### Existing Local Files

**No Impact** ✅

- Old local files have `fileUrl` starting with `/uploads/`
- No `r2FileKey` field
- `useR2: false` (default)
- Linking logic skips files without `r2FileKey`
- Orders can still access these files normally

### Existing Google Drive Files

**No Impact** ✅

- Google Drive files have `useGoogleDrive: true`
- Have `googleDriveFileId` instead of `r2FileKey`
- Linking logic is R2-specific, doesn't affect Google Drive
- Orders can still access these files normally

### Existing Orders

**No Impact** ✅

Orders reference design files through:

1. **OrderDesignFile junction table**: Links orders to design files by `designFileId` (MongoDB ID)
2. This linking is completely separate from product linking
3. Whether file is local, Google Drive, or R2 doesn't matter
4. Order completion logic still works as before

**Order File Access Flow**:

```
Order
  → OrderDesignFile.designFileId (junction table)
    → DesignFile record (contains fileUrl, doesn't matter where file is stored)
      → Download file from fileUrl (could be local, Google Drive, or R2)
```

## Migration Path (Optional)

If you want to migrate existing Google Drive files to R2 in the future:

### Step 1: Create Migration Script

```typescript
// scripts/migrate-files-to-r2.js
const mongoose = require('mongoose');
const DesignFile = require('@/lib/db/models/DesignFile');

async function migrateGoogleDriveToR2() {
  const googleDriveFiles = await DesignFile.find({
    useGoogleDrive: true,
    useR2: false
  });

  for (const file of googleDriveFiles) {
    // 1. Download from Google Drive
    const buffer = await downloadFromGoogleDrive(file.googleDriveFileId);

    // 2. Upload to R2
    const r2File = await R2Service.uploadFile(buffer, file.fileName, ...);

    // 3. Update DesignFile record
    file.r2FileKey = r2File.key;
    file.r2FolderPath = r2File.folderPath;
    file.fileUrl = r2File.url;  // Update URL to R2
    file.useR2 = true;
    file.useGoogleDrive = false;
    await file.save();
  }
}
```

### Step 2: Run Migration

```bash
node scripts/migrate-files-to-r2.js
```

### Step 3: Verify

- Check that files are in R2 bucket
- Verify orders still work correctly
- Can then delete Google Drive service if desired

## Safety Features

### 1. **Only Update Unlinked Files**

Query includes `productId: null` condition:

```typescript
await DesignFile.updateMany(
  {
    r2FileKey: { $in: r2FileKeys },
    productId: null, // ← Safety check: only unlinked files
  },
  { productId: product._id }
)
```

This prevents accidentally re-linking already-linked files.

### 2. **Graceful Degradation**

Product creation doesn't fail if file linking fails:

```typescript
try {
  // Link files
  await DesignFile.updateMany(...);
} catch (linkError) {
  console.error('Error linking files:', linkError);
  // Don't fail product creation
}
```

Product is still created even if linking encounters issues.

### 3. **No Silent Updates**

Both endpoints log exactly how many files were linked:

```
✅ Linked 3 design files to product using R2 keys
```

Clear feedback on what was actually updated.

## Testing Checklist

- [ ] Upload file with `productId: "temp"` → Get fileId and r2FileKey
- [ ] Create product with r2FileKeys array → File productId updates (single record)
- [ ] Create product without r2FileKeys → Works normally
- [ ] Upload same file twice → Different fileIds, same r2FileKey
- [ ] Link one file to multiple products → Only first one linked (productId: null check)
- [ ] Old local files still accessible via /downloads/
- [ ] Old Google Drive files still accessible
- [ ] Order completion still provides design files
- [ ] Order design file downloads still work

## Troubleshooting

### Issue: Files still showing productId: null after product creation

**Cause**: r2FileKeys not being passed to product creation endpoint

**Fix**: Capture `r2FileKey` from upload response, pass to product creation

### Issue: Getting duplicate files

**Cause**: Uploading same file twice and creating two separate products

**Fix**: Use the same r2FileKey when creating multiple products - it will link to same file

### Issue: Old files not accessible

**Cause**: Unlikely, but if it happens - check that old files have `useR2: false`

**Fix**: Old files have different schema, should still work. Check logs for errors.

## API Reference

### Upload Design File

```
POST /api/admin/upload/design-file
Returns: fileId, r2FileKey, fileUrl
```

### Create Product (with auto-linking)

```
POST /api/admin/products
Body includes: r2FileKeys: string[]
Auto-links files with matching r2FileKey and productId: null
```

### Manual Link by R2 Key

```
PATCH /api/admin/design-files/link-by-r2key
Body: { productId, r2FileKeys, productSlug }
Useful if auto-linking failed or for retroactive linking
```

### Old File-Based Endpoints (still available)

```
PATCH /api/admin/design-files/link-product
For manual linking by fileId (legacy)
```

## Summary

- ✅ New files stored in R2 with unique key
- ✅ Linking by R2 key prevents duplicates
- ✅ Auto-linking during product creation
- ✅ Manual linking endpoint as fallback
- ✅ Completely backward compatible with old files
- ✅ Orders unaffected
- ✅ Migration path available for future Google Drive → R2

No action needed for existing files - everything continues to work!
