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

import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        avatar: {
            type: String,
            default: '👤',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        order: {
            type: Number,
            default: 0,
        },
        orderId: {
            type: String,
            default: null,
        },
        userId: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
)

export default mongoose.models.Review || mongoose.model('Review', reviewSchema)
