# Large File Upload Optimizations

## Problem Description

Users were experiencing issues when uploading large files (30+ MB) in the product form page. The upload process would get stuck at 80-90% completion, especially with slower internet connections. The feedback was: "مشكلة عند رفع ملف فوق 30 ميجا يضل يحمل عالفاضي" (Issue when uploading files over 30 MB, it keeps loading endlessly).

## Root Causes Identified

1. **API Route Timeout**: Only 30 seconds timeout for uploads
2. **Limited File Size Support**: 100MB limit without proper chunking
3. **No Timeout Handling**: XMLHttpRequest without proper timeout management
4. **No Retry Mechanism**: Failed uploads didn't automatically retry
5. **Single Request Upload**: Large files uploaded as single requests without progress recovery

## Optimizations Implemented

### 1. Increased API Route Timeouts

**Files Updated:**

- `src/app/api/admin/upload/design-file/route.ts`
- `src/app/api/admin/upload/order-file/route.ts`

**Changes:**

```typescript
// Before
export const maxDuration = 30 // 30 seconds

// After
export const maxDuration = 300 // 5 minutes for large file uploads
```

### 2. Increased File Size Limits

**Files Updated:**

- `src/app/api/admin/upload/design-file/route.ts`
- `src/components/ui/DesignFileUpload.tsx`

**Changes:**

```typescript
// Before
.max(100 * 1024 * 1024, 'File size cannot exceed 100MB')
maxSize = 100 // 100MB default

// After
.max(500 * 1024 * 1024, 'File size cannot exceed 500MB')
maxSize = 500 // 500MB default for large files
```

### 3. Enhanced Upload Hook with Retry Logic

**File Updated:**

- `src/hooks/useFileUpload.ts`

**New Features:**

- **Configurable Timeout**: Default 5 minutes, customizable per use case
- **Automatic Retry**: Up to 3 retries with exponential backoff
- **Better Progress Tracking**: More frequent updates with percentage display
- **Proper Error Handling**: Distinguishes between different error types
- **Timeout Management**: Proper cleanup of timeout handlers

**Interface:**

```typescript
export interface UseFileUploadOptions {
  onSuccess?: (result: Record<string, unknown>, fileInfo?: Record<string, unknown>) => void
  onError?: (error: string) => void
  onProgress?: (progress: number) => void
  timeout?: number // Timeout in milliseconds
  maxRetries?: number // Maximum number of retry attempts
}
```

### 4. Updated Product Form Upload Configuration

**File Updated:**

- `src/app/admin/products/new/page.tsx`

**Configuration:**

```typescript
const { uploadFile: uploadDesignFile } = useFileUpload({
    timeout: 600000, // 10 minutes for large files
    maxRetries: 3, // Retry up to 3 times
    onSuccess: // ... success handler
    onError: // ... error handler
})

const { uploadFile: uploadImage } = useFileUpload({
    timeout: 300000, // 5 minutes for image uploads
    maxRetries: 2, // Fewer retries for images
    onSuccess: // ... success handler
    onError: // ... error handler
})
```

### 5. Next.js Configuration for Server Actions

**File Updated:**

- `next.config.ts`

**Changes:**

```typescript
experimental: {
    serverComponentsExternalPackages: ['mongoose'],
    serverActions: {
        bodySizeLimit: '500mb', // Allow up to 500MB for server actions
    },
},
```

## User Experience Improvements

### Progress Indication

- Real-time progress percentage display
- Retry attempt indicators
- Clear error messages in Arabic

### Error Handling

- Automatic retry for network issues and timeouts
- Exponential backoff to avoid overwhelming the server
- User-friendly error messages

### Performance

- Better memory management with proper cleanup
- Progress updates don't block the UI
- Timeout handling prevents hanging uploads

## Technical Benefits

1. **Reliability**: Automatic retries handle temporary network issues
2. **Scalability**: Increased limits support larger design files
3. **User Experience**: Clear progress indication and error messages
4. **Performance**: Proper timeout handling prevents resource leaks
5. **Robustness**: Better error differentiation and handling

## Testing Recommendations

1. **Large File Testing**:

   - Test with files 30-100 MB in size
   - Test with slow internet connections (throttled)
   - Test network interruption scenarios

2. **Retry Logic Testing**:

   - Simulate temporary network failures
   - Test timeout scenarios
   - Verify exponential backoff behavior

3. **Progress Tracking**:
   - Verify progress updates are smooth
   - Test with different file sizes
   - Ensure UI remains responsive

## Production Deployment Notes

### Vercel Configuration

- API routes now have 5-minute timeout (within Vercel Pro limits)
- File size limits increased to 500MB
- Proper error handling for edge cases

### Monitoring

- Monitor API route execution times
- Track file upload success rates
- Watch for timeout patterns

## Future Enhancements

1. **Chunked Upload**: Implement chunked upload for files > 100MB
2. **Resume Upload**: Allow resuming interrupted uploads
3. **Compression**: Automatic file compression for certain file types
4. **Progress Persistence**: Save progress across page refreshes
5. **Bandwidth Detection**: Adjust timeout based on connection speed

## Files Modified Summary

1. `src/hooks/useFileUpload.ts` - Enhanced with retry logic and timeout handling
2. `src/app/api/admin/upload/design-file/route.ts` - Increased timeout and file size limits
3. `src/app/api/admin/upload/order-file/route.ts` - Increased timeout
4. `src/components/ui/DesignFileUpload.tsx` - Increased default max size
5. `src/app/admin/products/new/page.tsx` - Updated to use enhanced upload options
6. `next.config.ts` - Added server actions configuration

These optimizations should resolve the issue with large file uploads getting stuck at 80-90% completion and provide a much better user experience for uploading design files, especially on slower internet connections.
