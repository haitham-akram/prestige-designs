/**
 * Design File Model Schema
 * 
 * This file defines the DesignFile model schema for MongoDB using Mongoose.
 * Design files represent the actual design assets (PSD, AI, EPS, etc.) that customers
 * can download after purchasing a product.
 * 
 * Features:
 * - Secure file management
 * - Payment-based access control
 * - Download tracking
 * - File versioning support
 * - Expiration management
 * 
 * Use Cases:
 * - Design file storage and delivery
 * - Order fulfillment
 * - Download analytics
 * - File access control
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for Design File document
export interface IDesignFile extends Document {
    _id: string;
    productId: mongoose.Types.ObjectId;  // Reference to Product
    fileName: string;            // Original filename
    fileUrl: string;             // CDN/Storage URL
    fileType: string;            // File extension/type
    fileSize: number;            // File size in bytes
    mimeType: string;            // MIME type
    description?: string;        // File description
    isActive: boolean;           // For soft delete
    isPublic: boolean;           // Whether file is publicly accessible
    downloadCount: number;       // Track downloads
    maxDownloads?: number;       // Maximum allowed downloads
    expiresAt?: Date;            // Optional expiration date
    downloadUrl?: string;        // Temporary download URL
    downloadUrlExpiresAt?: Date; // When download URL expires
    createdBy: string;           // Admin who uploaded the file
    updatedBy?: string;          // Admin who last updated the file
    createdAt: Date;
    updatedAt: Date;
}

// Design File Schema definition
const DesignFileSchema = new Schema<IDesignFile>({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Product ID is required'],
        ref: 'Product'
    },


    fileName: {
        type: String,
        required: [true, 'File name is required'],
        trim: true,
        maxlength: [255, 'File name cannot exceed 255 characters']
    },

    fileUrl: {
        type: String,
        required: [true, 'File URL is required'],
        validate: {
            validator: function (v: string) {
                // Allow both local file paths and external URLs
                return /^(\/uploads\/designs\/.+|https?:\/\/.+)/.test(v);
            },
            message: 'Please provide a valid file URL or local path'
        }
    },

    fileType: {
        type: String,
        required: [true, 'File type is required'],
        lowercase: true,
        trim: true,
        enum: {
            values: ['psd', 'ai', 'eps', 'pdf', 'svg', 'zip', 'rar', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
            message: 'Invalid file type. Allowed types: psd, ai, eps, pdf, svg, zip, rar, png, jpg, jpeg, gif, webp, mp4, avi, mov, wmv, flv, webm, mkv'
        }
    },

    fileSize: {
        type: Number,
        required: [true, 'File size is required'],
        min: [1, 'File size must be greater than 0']
    },

    mimeType: {
        type: String,
        required: [true, 'MIME type is required'],
        trim: true
    },

    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        trim: true
    },

    isActive: {
        type: Boolean,
        default: true
    },

    isPublic: {
        type: Boolean,
        default: false
    },

    downloadCount: {
        type: Number,
        default: 0,
        min: [0, 'Download count cannot be negative']
    },

    maxDownloads: {
        type: Number,
        min: [1, 'Maximum downloads must be at least 1'],
        default: null
    },

    expiresAt: {
        type: Date,
        default: null
    },

    downloadUrl: {
        type: String,
        default: null
    },

    downloadUrlExpiresAt: {
        type: Date,
        default: null
    },

    createdBy: {
        type: String,
        required: [true, 'Created by is required'],
        ref: 'User'
    },

    updatedBy: {
        type: String,
        ref: 'User',
        default: null
    }

}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: {
        virtuals: true,
        transform: function (doc, ret: Record<string, unknown>) {
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes for better query performance
DesignFileSchema.index({ productId: 1 });
DesignFileSchema.index({ isActive: 1 });
DesignFileSchema.index({ isPublic: 1 });
DesignFileSchema.index({ fileType: 1 });
DesignFileSchema.index({ createdAt: -1 });
DesignFileSchema.index({ expiresAt: 1 });

// Compound indexes
DesignFileSchema.index({ productId: 1, isActive: 1 });
DesignFileSchema.index({ productId: 1, fileType: 1 });

// Pre-save middleware to validate file size
DesignFileSchema.pre('save', function (this: IDesignFile, next) {
    // Maximum file size: 100MB
    const maxFileSize = 100 * 1024 * 1024; // 100MB in bytes

    if (this.fileSize > maxFileSize) {
        return next(new Error('File size cannot exceed 100MB'));
    }

    next();
});

// Pre-save middleware to set MIME type based on file type
DesignFileSchema.pre('save', function (this: IDesignFile, next) {
    if (!this.mimeType) {
        const mimeTypes: Record<string, string> = {
            'psd': 'image/vnd.adobe.photoshop',
            'ai': 'application/postscript',
            'eps': 'application/postscript',
            'pdf': 'application/pdf',
            'svg': 'image/svg+xml',
            'zip': 'application/zip',
            'rar': 'application/vnd.rar',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp'
        };

        this.mimeType = mimeTypes[this.fileType] || 'application/octet-stream';
    }

    next();
});

// Static method to get files by product
DesignFileSchema.statics.getByProduct = async function (productId: string, isActive: boolean = true) {
    return this.find({ productId, isActive }).sort({ createdAt: -1 }).lean();
};

// Static method to get public files by product
DesignFileSchema.statics.getPublicByProduct = async function (productId: string) {
    return this.find({ productId, isActive: true, isPublic: true }).sort({ createdAt: -1 }).lean();
};

// Instance method to increment download count
DesignFileSchema.methods.incrementDownloads = async function () {
    this.downloadCount += 1;
    return this.save();
};

// Instance method to check if file can be downloaded
DesignFileSchema.methods.canDownload = function (): boolean {
    if (!this.isActive) return false;

    if (this.expiresAt && new Date() > this.expiresAt) return false;

    if (this.maxDownloads && this.downloadCount >= this.maxDownloads) return false;

    return true;
};

// Instance method to generate temporary download URL
DesignFileSchema.methods.generateDownloadUrl = function (expiresInHours: number = 24): string {
    // This is a placeholder - in a real implementation, you'd generate a signed URL
    // from your CDN/storage provider (AWS S3, Cloudinary, etc.)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    this.downloadUrl = `${this.fileUrl}?token=${Date.now()}&expires=${expiresAt.getTime()}`;
    this.downloadUrlExpiresAt = expiresAt;

    return this.downloadUrl;
};

// Virtual for formatted file size
DesignFileSchema.virtual('formattedFileSize').get(function (this: IDesignFile) {
    const bytes = this.fileSize;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for checking if file is expired
DesignFileSchema.virtual('isExpired').get(function (this: IDesignFile) {
    return this.expiresAt ? new Date() > this.expiresAt : false;
});

// Virtual for checking if download URL is expired
DesignFileSchema.virtual('isDownloadUrlExpired').get(function (this: IDesignFile) {
    return this.downloadUrlExpiresAt ? new Date() > this.downloadUrlExpiresAt : false;
});

// Virtual for download limit reached
DesignFileSchema.virtual('downloadLimitReached').get(function (this: IDesignFile) {
    return this.maxDownloads ? this.downloadCount >= this.maxDownloads : false;
});

// Prevent recompilation in development
const DesignFile: Model<IDesignFile> = mongoose.models.DesignFile || mongoose.model<IDesignFile>('DesignFile', DesignFileSchema);

export default DesignFile; 