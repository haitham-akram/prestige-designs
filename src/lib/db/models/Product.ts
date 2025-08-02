/**
 * Product Model Schema
 * 
 * This file defines the Product model schema for MongoDB using Mongoose.
 * Products represent the designs that admins add to the store for customers to purchase and customize.
 * 
 * Features:
 * - Design management and customization options
 * - Multi-image support and YouTube integration
 * - Color theme management for customer customization
 * - Logo upload and editing capabilities
 * - Category organization and pricing
 * - SEO optimization and marketing features 
 * Use Cases:
 * - Design catalog management
 * - Customer design customization
 * - E-commerce functionality
 * - SEO and marketing
 * - Analytics and reporting
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for Color Theme
export interface IColorTheme {
    name: string;          // e.g., "Primary", "Secondary", "Accent"
    hex: string;           // e.g., "#3B82F6"
    description?: string;  // e.g., "Main brand color"
}

// Interface for Product Images
export interface IProductImage {
    url: string;
    alt?: string;          // Alt text for SEO
    isPrimary: boolean;    // Main product image
    order: number;         // Display order
}

// Interface for Product document
export interface IProduct extends Document {
    _id: string;
    name: string;
    slug: string;
    description?: string;

    // Media and customization
    images: IProductImage[];
    youtubeLink?: string;

    // Design customization options (Admin checkboxes)
    EnableCustomizations: boolean;
    allowColorChanges: boolean;      // Show color picker to customer
    allowTextEditing: boolean;       // Show text input fields to customer
    allowImageReplacement: boolean;  // Show image upload to customer
    allowLogoUpload: boolean;        // Show logo upload to customer
    // Color themes (only shown if allowColorChanges = true)
    colors: IColorTheme[];           // Theme colors for customer customization

    // Category and organization
    categoryId: mongoose.Types.ObjectId;
    tags?: string[];                 // Additional tags for search/filtering

    // Pricing and promotions
    price: number;                   // Base price
    discountAmount?: number;         // Discount in same currency as price
    discountPercentage?: number;     // Alternative: percentage discount
    finalPrice: number;              // Calculated final price after discount

    // Status and visibility
    isActive: boolean;
    isFeatured: boolean;

    // Analytics and stats
    purchaseCount: number;
    rating: number;                  // Average rating (0-5)
    reviewCount: number;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Color Theme Schema
const ColorThemeSchema = new Schema<IColorTheme>({
    name: {
        type: String,
        required: [true, 'Color name is required'],
        trim: true,
        maxlength: [50, 'Color name cannot exceed 50 characters']
    },
    hex: {
        type: String,
        required: [true, 'Color hex code is required'],
        validate: {
            validator: function (v: string) {
                return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
            },
            message: 'Please provide a valid hex color code'
        }
    },
    description: {
        type: String,
        maxlength: [100, 'Color description cannot exceed 100 characters'],
        trim: true
    }
}, { _id: false }); // Don't create separate _id for subdocuments

// Product Image Schema
const ProductImageSchema = new Schema<IProductImage>({
    url: {
        type: String,
        required: [true, 'Image URL is required'],
        validate: {
            validator: function (v: string) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i.test(v);
            },
            message: 'Please provide a valid image URL'
        }
    },
    alt: {
        type: String,
        maxlength: [200, 'Alt text cannot exceed 200 characters'],
        trim: true
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        required: [true, 'Image order is required'],
        min: [0, 'Order cannot be negative'],
        default: 0
    }
}, { _id: false });

// Product Schema definition
const ProductSchema = new Schema<IProduct>({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [200, 'Product name cannot exceed 200 characters']
    },

    slug: {
        type: String,
        required: [true, 'Product slug is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
    },

    description: {
        type: String,
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
        trim: true
    },

    // Media and customization
    images: {
        type: [ProductImageSchema],
        default: [],
        validate: {
            validator: function (images: IProductImage[]) {
                return images.length > 0;
            },
            message: 'At least one product image is required'
        }
    },

    youtubeLink: {
        type: String,
        validate: {
            validator: function (v: string) {
                if (!v) return true; // Optional field
                return /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/).+/.test(v);
            },
            message: 'Please provide a valid YouTube URL'
        }
    },

    // Design customization options (Admin checkboxes)
    EnableCustomizations: {
        type: Boolean,
        default: false
    },
    allowColorChanges: {
        type: Boolean,
        default: false
    },

    allowTextEditing: {
        type: Boolean,
        default: false
    },

    allowImageReplacement: {
        type: Boolean,
        default: false
    },

    allowLogoUpload: {
        type: Boolean,
        default: false
    },

    // Color themes (only shown if allowColorChanges = true)
    colors: {
        type: [ColorThemeSchema],
        default: []
    },

    // Category and organization
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required']
    },

    tags: {
        type: [{
            type: String,
            lowercase: true,
            trim: true,
            maxlength: [30, 'Tag cannot exceed 30 characters']
        }],
        default: []
    },

    // Pricing and promotions
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },

    discountAmount: {
        type: Number,
        min: [0, 'Discount amount cannot be negative'],
        default: 0
    },

    discountPercentage: {
        type: Number,
        min: [0, 'Discount percentage cannot be negative'],
        max: [100, 'Discount percentage cannot exceed 100'],
        default: 0
    },

    finalPrice: {
        type: Number,
        min: [0, 'Final price cannot be negative'],
        default: 0
    },

    // Status and visibility
    isActive: {
        type: Boolean,
        default: true
    },

    isFeatured: {
        type: Boolean,
        default: false
    },

    // Analytics and stats
    purchaseCount: {
        type: Number,
        default: 0,
        min: [0, 'Purchase count cannot be negative']
    },

    rating: {
        type: Number,
        default: 0,
        min: [0, 'Rating cannot be negative'],
        max: [5, 'Rating cannot exceed 5']
    },

    reviewCount: {
        type: Number,
        default: 0,
        min: [0, 'Review count cannot be negative']
    },

    // File management - Now handled by DesignFile model
    // designFiles field removed - files are managed separately for security

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
ProductSchema.index({ name: 1 });
ProductSchema.index({ slug: 1 });
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ finalPrice: 1 });
ProductSchema.index({ rating: -1 });
ProductSchema.index({ purchaseCount: -1 });
ProductSchema.index({ createdAt: -1 });

// Compound indexes
ProductSchema.index({ isActive: 1, isFeatured: 1 });
ProductSchema.index({ categoryId: 1, isActive: 1 });
ProductSchema.index({ tags: 1, isActive: 1 });

// Text index for search functionality
ProductSchema.index({
    name: 'text',
    description: 'text',
    tags: 'text'
});

// Pre-save middleware to generate slug from name if not provided
ProductSchema.pre('save', function (this: IProduct, next) {
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

// Pre-save middleware for final price calculation
ProductSchema.pre('save', function (this: IProduct, next) {
    if (this.isModified('price') || this.isModified('discountAmount') || this.isModified('discountPercentage')) {
        let finalPrice = this.price;
        if ((this.discountAmount || 0) > 0) { finalPrice -= this.discountAmount || 0; }
        if ((this.discountPercentage || 0) > 0) { finalPrice -= (finalPrice * (this.discountPercentage || 0)) / 100; }
        this.finalPrice = Math.max(0, finalPrice);
    }
    next();
});

// Pre-save middleware to ensure only one primary image
ProductSchema.pre('save', function (this: IProduct, next) {
    if (this.isModified('images') && this.images && Array.isArray(this.images)) {
        const primaryImages = this.images.filter(img => img.isPrimary);

        if (primaryImages.length === 0 && this.images.length > 0) {
            // Set first image as primary if none is set
            this.images[0].isPrimary = true;
        } else if (primaryImages.length > 1) {
            // Ensure only one primary image
            this.images.forEach((img, index) => {
                img.isPrimary = index === 0;
            });
        }
    }
    next();
});

// Static method to get featured products
ProductSchema.statics.getFeatured = async function (limit = 10) {
    return this.find({ isActive: true, isFeatured: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

// Static method to get products by category
ProductSchema.statics.getByCategory = async function (categoryId: string, limit = 20) {
    return this.find({
        categoryId,
        isActive: true
    })
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(limit)
        .lean();
};

// Static method to search products
ProductSchema.statics.search = async function (query: string, limit = 20) {
    return this.find({
        $text: { $search: query },
        isActive: true
    })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();
};

// Instance method to increment purchase count
ProductSchema.methods.incrementPurchases = async function () {
    this.purchaseCount += 1;
    return this.save();
};

// Instance method to update rating
ProductSchema.methods.updateRating = async function (newRating: number) {
    // This is a simplified rating calculation
    // In a real app, you'd calculate based on all reviews
    const totalRating = (this.rating * this.reviewCount) + newRating;
    this.reviewCount += 1;
    this.rating = totalRating / this.reviewCount;
    return this.save();
};

// Virtual for primary image
ProductSchema.virtual('primaryImage').get(function (this: IProduct) {
    if (!this.images || !Array.isArray(this.images)) {
        return null;
    }
    const primary = this.images.find(img => img.isPrimary);
    return primary || (this.images.length > 0 ? this.images[0] : null);
});

// Virtual for discount percentage (if using discount amount)
ProductSchema.virtual('calculatedDiscountPercentage').get(function (this: IProduct) {
    if ((this.discountAmount || 0) > 0 && this.price > 0) {
        return Math.round(((this.discountAmount || 0) / this.price) * 100);
    }
    return this.discountPercentage || 0;
});

// Virtual for checking if product is on sale
ProductSchema.virtual('isOnSale').get(function (this: IProduct) {
    return (this.discountAmount || 0) > 0 || (this.discountPercentage || 0) > 0;
});

// Prevent recompilation in development
const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
