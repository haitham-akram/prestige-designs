/**
 * PromoCodeUsage Model Schema
 * 
 * This file defines the PromoCodeUsage model for tracking individual user usage of promo codes.
 * It tracks when, how often, and which orders each user applies promo codes to prevent abuse.
 * 
 * Features:
 * - Per-user promo code usage tracking
 * - Order-specific usage records
 * - Prevention of multiple uses of single-use codes
 * - Usage analytics and reporting
 * 
 * Use Cases:
 * - Enforce promo code usage limits per customer
 * - Track promotional campaign effectiveness  
 * - Prevent promo code abuse and fraud
 * - Generate usage analytics
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for PromoCodeUsage document
export interface IPromoCodeUsage extends Document {
    _id: string;
    userId: string;                  // User who used the promo code
    promoCodeId: string;             // Reference to the promo code
    promoCode: string;               // The actual promo code string for easier queries
    orderId: string;                 // Order where the promo code was applied
    orderNumber: string;             // Human-readable order number

    // Usage details
    discountAmount: number;          // How much discount was applied
    orderTotal: number;              // Total order value when promo was applied
    usedAt: Date;                    // When the promo code was used

    // Status tracking
    isActive: boolean;               // True if order is still valid (not cancelled/refunded)

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Interface for static methods
export interface IPromoCodeUsageModel extends Model<IPromoCodeUsage> {
    getUserUsageCount(userId: string, promoCodeId: string): Promise<number>;
    getUserUsageCountByCode(userId: string, promoCode: string): Promise<number>;
    hasUserUsedPromo(userId: string, promoCodeId: string): Promise<boolean>;
    hasUserUsedPromoByCode(userId: string, promoCode: string): Promise<boolean>;
    recordUsage(data: {
        userId: string;
        promoCodeId: string;
        promoCode: string;
        orderId: string;
        orderNumber: string;
        discountAmount: number;
        orderTotal: number;
    }): Promise<IPromoCodeUsage>;
    deactivateUsage(orderId: string): Promise<mongoose.UpdateWriteOpResult>;
}

// PromoCodeUsage Schema definition
const PromoCodeUsageSchema = new Schema<IPromoCodeUsage>({
    userId: {
        type: String,
        required: [true, 'User ID is required'],
        index: true
    },

    promoCodeId: {
        type: String,
        required: [true, 'Promo code ID is required'],
        index: true
    },

    promoCode: {
        type: String,
        required: [true, 'Promo code string is required'],
        uppercase: true,
        trim: true,
        index: true
    },

    orderId: {
        type: String,
        required: [true, 'Order ID is required'],
        unique: true, // Each order can have only one promo code usage record
        index: true
    },

    orderNumber: {
        type: String,
        required: [true, 'Order number is required'],
        index: true
    },

    discountAmount: {
        type: Number,
        required: [true, 'Discount amount is required'],
        min: [0, 'Discount amount cannot be negative']
    },

    orderTotal: {
        type: Number,
        required: [true, 'Order total is required'],
        min: [0, 'Order total cannot be negative']
    },

    usedAt: {
        type: Date,
        required: [true, 'Usage date is required'],
        default: Date.now
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
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
PromoCodeUsageSchema.index({ userId: 1, promoCodeId: 1 }); // Find user's usage of specific promo
PromoCodeUsageSchema.index({ userId: 1, promoCode: 1 }); // Find user's usage by code string
PromoCodeUsageSchema.index({ promoCodeId: 1, isActive: 1 }); // Find active usage of promo
PromoCodeUsageSchema.index({ usedAt: 1 }); // Time-based queries
PromoCodeUsageSchema.index({ userId: 1, isActive: 1, usedAt: -1 }); // User's recent active usage

// Static method to get user's usage count for a promo code
PromoCodeUsageSchema.statics.getUserUsageCount = async function (userId: string, promoCodeId: string) {
    const count = await this.countDocuments({
        userId,
        promoCodeId,
        isActive: true
    });
    return count;
};

// Static method to get user's usage count by promo code string
PromoCodeUsageSchema.statics.getUserUsageCountByCode = async function (userId: string, promoCode: string) {
    const count = await this.countDocuments({
        userId,
        promoCode: promoCode.toUpperCase(),
        isActive: true
    });
    return count;
};

// Static method to check if user has used a promo code
PromoCodeUsageSchema.statics.hasUserUsedPromo = async function (userId: string, promoCodeId: string) {
    const usage = await this.findOne({
        userId,
        promoCodeId,
        isActive: true
    });
    return !!usage;
};

// Static method to check if user has used a promo code by code string
PromoCodeUsageSchema.statics.hasUserUsedPromoByCode = async function (userId: string, promoCode: string) {
    const usage = await this.findOne({
        userId,
        promoCode: promoCode.toUpperCase(),
        isActive: true
    });
    return !!usage;
};

// Static method to record new usage
PromoCodeUsageSchema.statics.recordUsage = async function (data: {
    userId: string;
    promoCodeId: string;
    promoCode: string;
    orderId: string;
    orderNumber: string;
    discountAmount: number;
    orderTotal: number;
}) {
    const usage = new this({
        ...data,
        promoCode: data.promoCode.toUpperCase()
    });
    return usage.save();
};

// Static method to deactivate usage (for cancelled/refunded orders)
PromoCodeUsageSchema.statics.deactivateUsage = async function (orderId: string) {
    return this.updateOne(
        { orderId },
        { isActive: false }
    );
};

// Virtual for usage age in days
PromoCodeUsageSchema.virtual('usageAgeInDays').get(function (this: IPromoCodeUsage) {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.usedAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Prevent recompilation in development
const PromoCodeUsage = mongoose.models.PromoCodeUsage || mongoose.model<IPromoCodeUsage, IPromoCodeUsageModel>('PromoCodeUsage', PromoCodeUsageSchema);

export default PromoCodeUsage;
