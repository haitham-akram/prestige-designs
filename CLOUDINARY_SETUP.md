# Cloudinary Integration Setup Guide

This guide will help you set up Cloudinary for image uploads in your Prestige Designs application.

## Prerequisites

1. A Cloudinary account (sign up at [cloudinary.com](https://cloudinary.com))
2. Your Cloudinary credentials

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Getting Your Cloudinary Credentials

1. Log in to your Cloudinary dashboard
2. Go to the "Dashboard" section
3. Copy your:
   - Cloud Name
   - API Key
   - API Secret

## Features Implemented

### Backend Features

- ✅ Cloudinary configuration and utilities
- ✅ Image upload API endpoint (`/api/upload/image`)
- ✅ Image deletion API endpoint
- ✅ Category model updated to support Cloudinary URLs
- ✅ Automatic image optimization and transformation
- ✅ Secure file upload with validation

### Frontend Features

- ✅ Drag and drop image upload
- ✅ Real-time upload progress indicators
- ✅ Image preview with Cloudinary URLs
- ✅ Automatic image deletion when removing from form
- ✅ Support for multiple image formats (JPG, PNG, WebP)
- ✅ Responsive design for mobile devices

## API Endpoints

### Upload Image

```
POST /api/upload/image
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "folder": "prestige-designs/categories"
}
```

### Delete Image

```
DELETE /api/upload/image?public_id=your_public_id
```

## Image Transformations

Images are automatically optimized with the following transformations:

- Format: WebP (with fallback)
- Quality: Auto-optimized
- Dimensions: 800x600 (fill crop)
- Gravity: Auto-detection

## Security Features

- Admin-only access to upload endpoints
- File type validation
- Size limits enforced by Cloudinary
- Secure URL generation
- Automatic cleanup of unused images

## Usage in Category Form

The CategoryForm component now supports:

1. Drag and drop image upload
2. Real-time upload progress
3. Automatic Cloudinary integration
4. Image preview with optimization
5. Cleanup of old images when updating

## Troubleshooting

### Common Issues

1. **Upload fails**: Check your Cloudinary credentials
2. **Images not displaying**: Verify CORS settings in Cloudinary
3. **Large file uploads**: Cloudinary handles optimization automatically

### Support

For Cloudinary-specific issues, refer to the [Cloudinary documentation](https://cloudinary.com/documentation).
