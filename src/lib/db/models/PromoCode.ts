/**
 * PromoCode Model Schema
 * 
 * This file defines the PromoCode model schema for MongoDB using Mongoose.
 * Promo codes are created by admins and applied to specific products only.
 * 
 * Features:
 * - One promo code per product
 * - Admin-managed discount creation
 * - Usage tracking and limits
 * - Time-based activation/expiration
 * - Optional minimum order amount
 * - No stacking (one promo code per order)
 * 
 * Use Cases:
 * - Product-specific sales and promotions
 * - Flash sales with time limits
 * - Customer acquisition campaigns
 * - Usage analytics and reporting
 */

import mongoose, { Document, Schema } from 'mongoose';

// Interface for PromoCode document
export interface IPromoCode extends Document {
    _id: string;
    code: string;                    // The promo code string (e.g., "SAVE20", "FLASH50")
    productIds: string[];            // Array of product IDs (empty array = all products)
    applyToAllProducts: boolean;     // True for "all products" promo codes

    // Discount configuration
    discountType: 'percentage' | 'fixed_amount';  // Type of discount
    discountValue: number;           // 20 (for 20% off) or 15 (for $15 off)
    maxDiscountAmount?: number;      // Cap for percentage discounts (e.g., max $50 off)

    // Usage control
    usageLimit?: number;             // How many times total it can be used (null = unlimited)
    usageCount: number;              // How many times it's been used so far
    userUsageLimit?: number;         // How many times per user (e.g., once per customer)

    // Optional minimum order
    minimumOrderAmount?: number;     // Minimum purchase amount to use promo

    // Time management
    startDate?: Date;                // When promo becomes active
    endDate?: Date;                  // When promo expires
    isActive: boolean;               // Admin can enable/disable manually

    // Admin management
    description?: string;            // Internal note (e.g., "Black Friday Sale")

    // Timestamps
    createdAt: Date;
    updatedAt: Date;

    // Methods
    isCurrentlyValid(): boolean;
    canUserUse(userUsageCount: number): boolean;
    calculateDiscount(orderAmount: number): number;
    incrementUsage(): Promise<IPromoCode>;
}

// PromoCode Schema definition
const PromoCodeSchema = new Schema<IPromoCode>({
    code: {
        type: String,
        required: [true, 'Promo code is required'],
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: [20, 'Promo code cannot exceed 20 characters'],
        match: [/^[A-Z0-9]+$/, 'Promo code can only contain uppercase letters and numbers']
    },

    productIds: [{
        type: String,
        required: false,
        index: true
    }],

    applyToAllProducts: {
        type: Boolean,
        default: false,
        index: true
    },

    // Discount configuration
    discountType: {
        type: String,
        required: [true, 'Discount type is required'],
        enum: {
            values: ['percentage', 'fixed_amount'],
            message: 'Discount type must be either percentage or fixed_amount'
        }
    },

    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount value cannot be negative'],
        validate: {
            validator: function (this: IPromoCode, value: number) {
                if (this.discountType === 'percentage') {
                    return value <= 100;
                }
                return true;
            },
            message: 'Percentage discount cannot exceed 100'
        }
    },

    maxDiscountAmount: {
        type: Number,
        min: [0, 'Maximum discount amount cannot be negative'],
        validate: {
            validator: function (this: IPromoCode, value: number | undefined) {
                // Only validate if discountType is percentage and maxDiscountAmount is provided
                if (this.discountType === 'percentage' && value !== undefined) {
                    return value > 0;
                }
                return true;
            },
            message: 'Maximum discount amount must be greater than 0 for percentage discounts'
        }
    },

    // Usage control
    usageLimit: {
        type: Number,
        min: [1, 'Usage limit must be at least 1 if specified'],
        default: null // null means unlimited
    },

    usageCount: {
        type: Number,
        default: 0,
        min: [0, 'Usage count cannot be negative']
    },

    userUsageLimit: {
        type: Number,
        min: [1, 'User usage limit must be at least 1 if specified'],
        default: null // null means unlimited per user
    },

    // Optional minimum order
    minimumOrderAmount: {
        type: Number,
        min: [0, 'Minimum order amount cannot be negative'],
        default: null // null means no minimum
    },

    // Time management
    startDate: {
        type: Date,
        default: null // null means active immediately
    },

    endDate: {
        type: Date,
        default: null // null means no expiration
    },

    isActive: {
        type: Boolean,
        default: true
    },

    // Admin management
    description: {
        type: String,
        maxlength: [200, 'Description cannot exceed 200 characters'],
        trim: true
    },

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
// Note: code index is automatically created by unique: true in schema
// Note: productIds index is automatically created by index: true in schema
PromoCodeSchema.index({ isActive: 1 });
PromoCodeSchema.index({ startDate: 1 });
PromoCodeSchema.index({ endDate: 1 });
PromoCodeSchema.index({ applyToAllProducts: 1 });

// Compound indexes
PromoCodeSchema.index({ productIds: 1, isActive: 1 });
PromoCodeSchema.index({ applyToAllProducts: 1, isActive: 1 });
PromoCodeSchema.index({ code: 1, isActive: 1 });
PromoCodeSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Pre-save middleware to validate product selection
PromoCodeSchema.pre('save', function (this: IPromoCode, next) {
    // Either applyToAllProducts should be true OR productIds should have at least one product
    if (!this.applyToAllProducts && (!this.productIds || this.productIds.length === 0)) {
        return next(new Error('Either select specific products or apply to all products'));
    }

    // If applyToAllProducts is true, clear productIds array
    if (this.applyToAllProducts) {
        this.productIds = [];
    }

    next();
});

// Pre-save middleware to convert code to uppercase
PromoCodeSchema.pre('save', function (this: IPromoCode, next) {
    if (this.isModified('code')) {
        this.code = this.code.toUpperCase();
    }
    next();
});

// Pre-save middleware to validate date logic
PromoCodeSchema.pre('save', function (this: IPromoCode, next) {
    if (this.startDate && this.endDate && this.startDate >= this.endDate) {
        return next(new Error('End date must be after start date'));
    }
    next();
});

// Static method to find valid promo codes for products
PromoCodeSchema.statics.findValidForProducts = async function (productIds: string[], code?: string) {
    const now = new Date();
    const query: Record<string, unknown> = {
        isActive: true,
        $and: [
            {
                $or: [
                    { startDate: null },
                    { startDate: { $lte: now } }
                ]
            },
            {
                $or: [
                    { endDate: null },
                    { endDate: { $gte: now } }
                ]
            },
            {
                $or: [
                    { applyToAllProducts: true },
                    { productIds: { $in: productIds } }
                ]
            }
        ]
    };

    if (code) {
        query.code = code.toUpperCase();
    }

    return this.find(query).lean();
};

// Legacy method for backward compatibility  
PromoCodeSchema.statics.findValidForProduct = async function (productId: string, code?: string) {
    // Call findValidForProducts with single product in array
    const now = new Date();
    const query: Record<string, unknown> = {
        isActive: true,
        $and: [
            {
                $or: [
                    { startDate: null },
                    { startDate: { $lte: now } }
                ]
            },
            {
                $or: [
                    { endDate: null },
                    { endDate: { $gte: now } }
                ]
            },
            {
                $or: [
                    { applyToAllProducts: true },
                    { productIds: productId }
                ]
            }
        ]
    };

    if (code) {
        query.code = code.toUpperCase();
    }

    return this.find(query).lean();
};

// Instance method to check if promo code is currently valid
PromoCodeSchema.methods.isCurrentlyValid = function (this: IPromoCode) {
    if (!this.isActive) return false;

    const now = new Date();

    // Check start date
    if (this.startDate && this.startDate > now) return false;

    // Check end date
    if (this.endDate && this.endDate < now) return false;

    // Check usage limit
    if (this.usageLimit && this.usageCount >= this.usageLimit) return false;

    return true;
};

// Instance method to check if user can use this promo code
PromoCodeSchema.methods.canUserUse = function (this: IPromoCode, userUsageCount: number) {
    // Check if promo code is currently valid (inline validation)
    if (!this.isActive) return false;

    const now = new Date();
    if (this.startDate && this.startDate > now) return false;
    if (this.endDate && this.endDate < now) return false;
    if (this.usageLimit && this.usageCount >= this.usageLimit) return false;

    // Check user usage limit
    if (this.userUsageLimit && userUsageCount >= this.userUsageLimit) return false;

    return true;
};

// Instance method to calculate discount amount
PromoCodeSchema.methods.calculateDiscount = function (this: IPromoCode, orderAmount: number) {
    // Check minimum order amount
    if (this.minimumOrderAmount && orderAmount < this.minimumOrderAmount) {
        return 0;
    }

    let discount = 0;

    if (this.discountType === 'percentage') {
        discount = orderAmount * (this.discountValue / 100);

        // Apply max discount cap if set
        if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
            discount = this.maxDiscountAmount;
        }
    } else {
        discount = this.discountValue;
    }

    // Ensure discount doesn't exceed order amount
    return Math.min(discount, orderAmount);
};

// Instance method to increment usage count
PromoCodeSchema.methods.incrementUsage = async function (this: IPromoCode) {
    this.usageCount += 1;
    return this.save();
};

// Virtual for checking if promo code is expired
PromoCodeSchema.virtual('isExpired').get(function (this: IPromoCode) {
    if (!this.endDate) return false;
    return this.endDate < new Date();
});

// Virtual for checking if promo code is not yet active
PromoCodeSchema.virtual('isNotYetActive').get(function (this: IPromoCode) {
    if (!this.startDate) return false;
    return this.startDate > new Date();
});

// Virtual for usage percentage
PromoCodeSchema.virtual('usagePercentage').get(function (this: IPromoCode) {
    if (!this.usageLimit) return 0;
    return Math.round((this.usageCount / this.usageLimit) * 100);
});

// Prevent recompilation in development  
const PromoCode = mongoose.models.PromoCode || mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);

export default PromoCode;
