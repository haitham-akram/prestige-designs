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
    transformation?: Record<string, unknown>;
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

// Utility function to upload file to Cloudinary
export const uploadToCloudinary = async (file: Buffer | string, options: CloudinaryUploadOptions = {}) => {
    try {
        const uploadOptions = {
            folder: 'prestige-designs',
            resource_type: 'auto',
            ...options
        };

        let uploadResult;
        if (typeof file === 'string') {
            // Upload from URL
            uploadResult = await cloudinary.uploader.upload(file, uploadOptions);
        } else {
            // Upload from buffer - convert to base64 string
            const base64File = file.toString('base64');
            const dataURI = `data:application/octet-stream;base64,${base64File}`;
            uploadResult = await cloudinary.uploader.upload(dataURI, uploadOptions);
        }

        return uploadResult;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
}; 