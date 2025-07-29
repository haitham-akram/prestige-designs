import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Cloudinary upload options interface
export interface CloudinaryUploadOptions {
    folder?: string;
    public_id?: string;
    transformation?: any;
    resource_type?: 'image' | 'video' | 'raw';
    format?: string;
    quality?: number;
    width?: number;
    height?: number;
    crop?: string;
}

// Default upload options for categories
export const categoryImageOptions: CloudinaryUploadOptions = {
    folder: 'prestige-designs/categories',
    transformation: {
        quality: 'auto',
        fetch_format: 'auto',
        width: 800,
        height: 600,
        crop: 'fill',
        gravity: 'auto'
    },
    resource_type: 'image',
    format: 'webp'
};

// Utility function to generate optimized image URLs
export const getOptimizedImageUrl = (publicId: string, options: CloudinaryUploadOptions = {}) => {
    const defaultOptions = {
        quality: 'auto',
        fetch_format: 'auto',
        ...options
    };

    return cloudinary.url(publicId, defaultOptions);
};

// Utility function to delete image from Cloudinary
export const deleteImage = async (publicId: string) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
}; 