/**
 * Category Model Schema
 * 
 * This file defines the Category model schema for MongoDB using Mongoose.
 * Categories are used to organize designs in the store and are managed by admins.
 * 
 * Features:
 * - Category organization and hierarchy
 * - SEO-friendly slugs and metadata
 * - Display customization (images, colors, icons)
 * - Visibility and status management
 * - Admin-only management with audit trails
 * - Sort ordering for display
 * - Analytics and tracking support
 * 
 * Use Cases:
 * - Store navigation and filtering
 * - Design organization
 * - SEO optimization
 * - Marketing and promotions
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for Category document
export interface ICategory extends Document {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    icon?: string;

    // Display and ordering
    order: number;
    isActive: boolean;
    isFeatured: boolean;
    color?: string;

    // SEO and metadata
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];

    // Analytics and stats
    designCount: number;
    viewCount: number;

    // Admin management
    createdBy: string; // Admin user ID
    updatedBy?: string; // Admin user ID

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Category Schema definition
const CategorySchema = new Schema<ICategory>({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        maxlength: [100, 'Category name cannot exceed 100 characters'],
        unique: true
    },

    slug: {
        type: String,
        required: [true, 'Category slug is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
    },

    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        trim: true
    },

    image: {
        type: String,
        validate: {
            validator: function (v: string) {
                if (!v) return true; // Optional field
                return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i.test(v);
            },
            message: 'Please provide a valid image URL'
        }
    },


    // Display and ordering
    order: {
        type: Number,
        required: [true, 'Display order is required'],
        min: [0, 'Order cannot be negative'],
        default: 0
    },

    isActive: {
        type: Boolean,
        default: true
    },

    isFeatured: {
        type: Boolean,
        default: false
    },

    color: {
        type: String,
        validate: {
            validator: function (v: string) {
                if (!v) return true; // Optional field
                return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
            },
            message: 'Please provide a valid hex color code'
        }
    },

    // SEO and metadata
    metaTitle: {
        type: String,
        maxlength: [60, 'Meta title cannot exceed 60 characters'],
        trim: true
    },

    metaDescription: {
        type: String,
        maxlength: [160, 'Meta description cannot exceed 160 characters'],
        trim: true
    },

    keywords: [{
        type: String,
        lowercase: true,
        trim: true
    }],

    // Analytics and stats
    designCount: {
        type: Number,
        default: 0,
        min: [0, 'Design count cannot be negative']
    },

    viewCount: {
        type: Number,
        default: 0,
        min: [0, 'View count cannot be negative']
    },

    // Admin management
    createdBy: {
        type: String,
        required: [true, 'Created by admin is required']
    },

    updatedBy: {
        type: String
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
// Note: name and slug indexes are automatically created by unique: true in schema
CategorySchema.index({ order: 1 });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ isFeatured: 1 });
CategorySchema.index({ createdBy: 1 });
CategorySchema.index({ createdAt: -1 });

// Compound indexes
CategorySchema.index({ isActive: 1, order: 1 });
CategorySchema.index({ isActive: 1, isFeatured: 1 });

// Virtual for full hierarchy path
CategorySchema.virtual('fullPath').get(function (this: ICategory) {
    // This would be populated by a separate function to get the full category path
    return this.name;
});

// Pre-save middleware to generate slug from name if not provided
CategorySchema.pre('save', function (this: ICategory, next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
            .trim();
    }
    next();
});

// Interface for lean category query results
interface LeanCategory {
    _id: string;
    name: string;
    slug: string;
    order: number;
    isActive: boolean;
    isFeatured: boolean;
}

// Static method to get all active categories
CategorySchema.statics.getActive = async function () {
    const categories: LeanCategory[] = await this.find({ isActive: true })
        .sort({ order: 1 })
        .lean();

    return categories;
};

// Static method to get featured categories
CategorySchema.statics.getFeatured = async function () {
    return this.find({ isActive: true, isFeatured: true })
        .sort({ order: 1 })
        .lean();
};

// Instance method to increment view count
CategorySchema.methods.incrementViews = async function () {
    this.viewCount += 1;
    return this.save();
};

// Instance method to update design count
CategorySchema.methods.updateDesignCount = async function () {
    // This would count designs in this category
    // For now, we'll implement a placeholder
    this.designCount = 0; // This should be replaced with actual design count logic
    return this.save();
};

// Prevent recompilation in development
const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
