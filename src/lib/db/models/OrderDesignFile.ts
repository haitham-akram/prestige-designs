/**
 * Order Design File Junction Model Schema
 * 
 * This file defines the OrderDesignFile junction model for MongoDB using Mongoose.
 * This model handles the many-to-many relationship between orders and design files,
 * providing individual download tracking and access control for each customer.
 * 
 * Features:
 * - Order-to-file relationship management
 * - Individual download tracking per customer
 * - Access control and validation
 * - Download analytics
 * - Expiration management
 * 
 * Use Cases:
 * - Customer file access after purchase
 * - Download tracking per order
 * - Analytics and reporting
 * - Access control management
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for Order Design File junction document
export interface IOrderDesignFile extends Document {
    _id: string;
    orderId: string;              // Reference to Order
    designFileId: string;         // Reference to DesignFile
    downloadCount: number;        // Individual download count for this order
    firstDownloadedAt?: Date;     // When first downloaded
    lastDownloadedAt?: Date;      // When last downloaded
    isActive: boolean;            // For soft delete
    expiresAt?: Date;             // Optional expiration for this order's access
    createdAt: Date;
    updatedAt: Date;
}

// Order Design File Junction Schema definition
const OrderDesignFileSchema = new Schema<IOrderDesignFile>({
    orderId: {
        type: String,
        required: [true, 'Order ID is required'],
        ref: 'Order'
    },

    designFileId: {
        type: String,
        required: [true, 'Design file ID is required'],
        ref: 'DesignFile'
    },

    downloadCount: {
        type: Number,
        default: 0,
        min: [0, 'Download count cannot be negative']
    },

    firstDownloadedAt: {
        type: Date,
        default: null
    },

    lastDownloadedAt: {
        type: Date,
        default: null
    },

    isActive: {
        type: Boolean,
        default: true
    },

    expiresAt: {
        type: Date,
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
OrderDesignFileSchema.index({ orderId: 1 });
OrderDesignFileSchema.index({ designFileId: 1 });
OrderDesignFileSchema.index({ isActive: 1 });
OrderDesignFileSchema.index({ createdAt: -1 });
OrderDesignFileSchema.index({ expiresAt: 1 });

// Compound indexes
OrderDesignFileSchema.index({ orderId: 1, isActive: 1 });
OrderDesignFileSchema.index({ designFileId: 1, isActive: 1 });
OrderDesignFileSchema.index({ orderId: 1, designFileId: 1 }, { unique: true });

// Static method to get files by order
OrderDesignFileSchema.statics.getByOrder = async function (orderId: string, isActive: boolean = true) {
    return this.find({ orderId, isActive })
        .populate('designFileId')
        .sort({ createdAt: -1 })
        .lean();
};

// Static method to get orders by design file
OrderDesignFileSchema.statics.getByDesignFile = async function (designFileId: string, isActive: boolean = true) {
    return this.find({ designFileId, isActive })
        .populate('orderId')
        .sort({ createdAt: -1 })
        .lean();
};

// Static method to create access for an order
OrderDesignFileSchema.statics.createOrderAccess = async function (orderId: string, designFileIds: string[]) {
    const accessRecords = designFileIds.map(designFileId => ({
        orderId,
        designFileId,
        downloadCount: 0,
        isActive: true
    }));

    return this.insertMany(accessRecords);
};

// Instance method to increment download count
OrderDesignFileSchema.methods.incrementDownloads = async function () {
    const now = new Date();

    this.downloadCount += 1;

    if (!this.firstDownloadedAt) {
        this.firstDownloadedAt = now;
    }

    this.lastDownloadedAt = now;

    return this.save();
};

// Instance method to check if access is expired
OrderDesignFileSchema.methods.isExpired = function (): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
};

// Instance method to check if can download (based on design file limits)
OrderDesignFileSchema.methods.canDownload = async function (): Promise<boolean> {
    if (!this.isActive) return false;

    if (this.isExpired()) return false;

    // Check design file download limits
    const designFile = await mongoose.model('DesignFile').findById(this.designFileId);
    if (!designFile || !designFile.isActive) return false;

    if (designFile.expiresAt && new Date() > designFile.expiresAt) return false;

    if (designFile.maxDownloads && this.downloadCount >= designFile.maxDownloads) return false;

    return true;
};

// Virtual for checking if access is active
OrderDesignFileSchema.virtual('isAccessActive').get(function (this: IOrderDesignFile) {
    return this.isActive && !this.isExpired();
});

// Pre-save middleware to ensure unique order-file combinations
OrderDesignFileSchema.pre('save', function (this: IOrderDesignFile, next) {
    if (this.isNew) {
        // Check for existing combination
        mongoose.model('OrderDesignFile').findOne({
            orderId: this.orderId,
            designFileId: this.designFileId,
            _id: { $ne: this._id }
        }).then(existing => {
            if (existing) {
                return next(new Error('Order already has access to this design file'));
            }
            next();
        }).catch(next);
    } else {
        next();
    }
});

// Prevent recompilation in development
const OrderDesignFile: Model<IOrderDesignFile> = mongoose.models.OrderDesignFile || mongoose.model<IOrderDesignFile>('OrderDesignFile', OrderDesignFileSchema);

export default OrderDesignFile; 