/**
 * Review Model Schema
 * 
 * This file defines the Review model schema for MongoDB using Mongoose.
 * Simple review system for digital design products.
 * 
 * Features:
 * - Product reviews with ratings
 * - Customer feedback
 * - Admin moderation
 * - Review verification
 * 
 * Use Cases:
 * - Product ratings and reviews
 * - Customer feedback collection
 * - Social proof for products
 * - Quality improvement insights
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for Review document
export interface IReview extends Document {
    _id: string;

    // Product and customer info
    productId: string;               // Reference to Product
    customerId: string;              // Reference to User
    orderNumber?: string;            // Reference to Order (optional verification)

    // Review content
    rating: number;                  // 1-5 stars
    title?: string;                  // Optional review title
    comment?: string;                // Review text

    // Customer info (stored for display)
    customerName: string;            // Customer name for display
    customerEmail: string;           // Email for verification

    // Review status
    isApproved: boolean;             // Admin approval status

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Review Schema definition
const ReviewSchema = new Schema<IReview>({
    // Product and customer references
    productId: {
        type: String,
        required: [true, 'Product ID is required'],
        index: true
    },

    customerId: {
        type: String,
        required: [true, 'Customer ID is required'],
        index: true
    },

    orderNumber: {
        type: String,
        trim: true,
        index: true
    },

    // Review content
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be between 1 and 5'],
        max: [5, 'Rating must be between 1 and 5']
    },

    title: {
        type: String,
        trim: true,
        maxlength: [400, 'Review title cannot exceed 400 characters']
    },

    comment: {
        type: String,
        trim: true,
        maxlength: [2000, 'Review comment cannot exceed 2000 characters']
    },

    // Customer display info
    customerName: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
    },

    customerEmail: {
        type: String,
        required: [true, 'Customer email is required'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },

    // Review status
    isApproved: {
        type: Boolean,
        default: false  // Requires admin approval
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
ReviewSchema.index({ productId: 1, isApproved: 1 });
ReviewSchema.index({ customerId: 1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ createdAt: -1 });

// Compound indexes
ReviewSchema.index({ productId: 1, customerId: 1 }, { unique: true }); // One review per customer per product


// Static method to get approved reviews for a product
ReviewSchema.statics.getProductReviews = async function (productId: string, limit = 10) {
    return this.find({
        productId,
        isApproved: true
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

// Static method to get product rating summary
ReviewSchema.statics.getProductRatingSummary = async function (productId: string) {
    const result = await this.aggregate([
        {
            $match: {
                productId,
                isApproved: true
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
                ratingsBreakdown: {
                    $push: '$rating'
                }
            }
        }
    ]);

    if (result.length === 0) {
        return {
            averageRating: 0,
            totalReviews: 0,
            ratingsBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
    }

    const data = result[0];
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    data.ratingsBreakdown.forEach((rating: number) => {
        breakdown[rating as keyof typeof breakdown]++;
    });

    return {
        averageRating: Math.round(data.averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: data.totalReviews,
        ratingsBreakdown: breakdown
    };
};

// Static method to get reviews pending approval
ReviewSchema.statics.getPendingReviews = async function (limit = 50) {
    return this.find({ isApproved: false })
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean();
};

// Instance method to approve review
ReviewSchema.methods.approve = async function (this: IReview) {
    this.isApproved = true;
    return this.save();
};

// Instance method to reject review
ReviewSchema.methods.reject = async function (this: IReview) {
    this.isApproved = false;
    return this.save();
};


// Virtual for star display
ReviewSchema.virtual('starDisplay').get(function (this: IReview) {
    return '★'.repeat(this.rating) + '☆'.repeat(5 - this.rating);
});

// Virtual for customer display name (first name + last initial)
ReviewSchema.virtual('displayName').get(function (this: IReview) {
    const names = this.customerName.trim().split(' ');
    if (names.length === 1) {
        return names[0];
    }
    return `${names[0]} ${names[names.length - 1].charAt(0)}.`;
});

// Virtual for review age
ReviewSchema.virtual('reviewAge').get(function (this: IReview) {
    const now = new Date();
    const diff = now.getTime() - this.createdAt.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
});

// Prevent recompilation in development
const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
