/**
 * Currency Model Schema
 * 
 * This file defines the Currency model schema for MongoDB using Mongoose.
 * Currencies are managed by admins (max 4 currencies) and rates are updated via ExchangeRate-API.
 * 
 * Features:
 * - Admin-defined currencies (limited to ~4 currencies)
 * - ExchangeRate-API integration for live rates
 * - USD as primary currency (all products stored in USD)
 * - Display-only conversion for customers
 * - Automatic rate updates once per day
 * - Fallback to manual rates if API fails
 * - Customer currency selection
 * 
 * API Integration:
 * - ExchangeRate-API (1,500 requests/month free)
 * - Updates once per day (~120 requests/month)
 * - Base currency: USD
 * - Caching and error handling
 * 
 * Use Cases:
 * - Customer price display in local currency
 * - PayPal checkout conversion (back to USD)
 * - Admin currency management
 * - Rate monitoring and updates
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for Currency document
export interface ICurrency extends Document {
    _id: string;
    code: string;                    // ISO currency code (e.g., "EUR", "GBP")
    name: string;                    // Full name (e.g., "Euro", "British Pound")
    symbol: string;                  // Currency symbol (e.g., "€", "£")

    // Exchange rate management
    exchangeRate: number;            // Rate from USD (e.g., 1 USD = 0.85 EUR)
    previousRate?: number;           // Previous rate for comparison
    rateChange?: number;             // Percentage change from previous rate

    // API integration
    lastApiUpdate?: Date;            // Last successful API update
    apiSource: string;               // "exchangerate-api" or "manual"
    apiStatus: 'success' | 'failed' | 'pending';

    // Admin management
    isActive: boolean;               // Admin can enable/disable
    isPrimary: boolean;              // USD should be marked as primary
    displayOrder: number;            // Order in currency selector

    // Manual override
    manualRate?: number;             // Admin can set manual rate as fallback
    useManualRate: boolean;          // Force use manual rate instead of API

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Currency Schema definition
const CurrencySchema = new Schema<ICurrency>({
    code: {
        type: String,
        required: [true, 'Currency code is required'],
        unique: true,
        uppercase: true,
        trim: true,
        length: [3, 'Currency code must be exactly 3 characters'],
        match: [/^[A-Z]{3}$/, 'Currency code must be 3 uppercase letters']
    },

    name: {
        type: String,
        required: [true, 'Currency name is required'],
        trim: true,
        maxlength: [50, 'Currency name cannot exceed 50 characters']
    },

    symbol: {
        type: String,
        required: [true, 'Currency symbol is required'],
        trim: true,
        maxlength: [5, 'Currency symbol cannot exceed 5 characters']
    },

    // Exchange rate management
    exchangeRate: {
        type: Number,
        required: [true, 'Exchange rate is required'],
        min: [0.0001, 'Exchange rate must be greater than 0'],
        validate: {
            validator: function (this: ICurrency, value: number) {
                // USD should always have rate of 1
                if (this.code === 'USD') {
                    return value === 1;
                }
                return value > 0;
            },
            message: 'USD must have exchange rate of 1, other currencies must be greater than 0'
        }
    },

    previousRate: {
        type: Number,
        min: [0.0001, 'Previous rate must be greater than 0']
    },

    rateChange: {
        type: Number,
        default: 0
    },

    // API integration
    lastApiUpdate: {
        type: Date,
        default: null
    },

    apiSource: {
        type: String,
        enum: {
            values: ['exchangerate-api', 'manual'],
            message: 'API source must be either exchangerate-api or manual'
        },
        default: 'exchangerate-api'
    },

    apiStatus: {
        type: String,
        enum: {
            values: ['success', 'failed', 'pending'],
            message: 'API status must be success, failed, or pending'
        },
        default: 'pending'
    },

    // Admin management
    isActive: {
        type: Boolean,
        default: true
    },

    isPrimary: {
        type: Boolean,
        default: false,
        validate: {
            validator: async function (this: ICurrency, value: boolean) {
                if (value) {
                    // Only USD can be primary
                    if (this.code !== 'USD') return false;

                    // Ensure only one primary currency exists
                    const existingPrimary = await mongoose.model('Currency').findOne({
                        isPrimary: true,
                        _id: { $ne: this._id }
                    });
                    return !existingPrimary;
                }
                return true;
            },
            message: 'Only USD can be primary currency, and only one primary currency is allowed'
        }
    },

    displayOrder: {
        type: Number,
        required: [true, 'Display order is required'],
        min: [0, 'Display order cannot be negative'],
        default: 0
    },

    // Manual override
    manualRate: {
        type: Number,
        min: [0.0001, 'Manual rate must be greater than 0']
    },

    useManualRate: {
        type: Boolean,
        default: false
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
CurrencySchema.index({ code: 1 });
CurrencySchema.index({ isActive: 1 });
CurrencySchema.index({ isPrimary: 1 });
CurrencySchema.index({ displayOrder: 1 });
CurrencySchema.index({ lastApiUpdate: 1 });
CurrencySchema.index({ apiStatus: 1 });

// Compound indexes
CurrencySchema.index({ isActive: 1, displayOrder: 1 });
CurrencySchema.index({ isActive: 1, isPrimary: 1 });

// Pre-save middleware to ensure USD is primary and has rate 1
CurrencySchema.pre('save', function (this: ICurrency, next) {
    if (this.code === 'USD') {
        this.isPrimary = true;
        this.exchangeRate = 1;
        this.apiSource = 'manual'; // USD rate is always 1, no API needed
    }
    next();
});

// Pre-save middleware to calculate rate change
CurrencySchema.pre('save', function (this: ICurrency, next) {
    if (this.isModified('exchangeRate') && this.previousRate) {
        const change = ((this.exchangeRate - this.previousRate) / this.previousRate) * 100;
        this.rateChange = Math.round(change * 100) / 100; // Round to 2 decimal places
    }
    next();
});

// Static method to get all active currencies for customer selection
CurrencySchema.statics.getActiveForCustomers = async function () {
    return this.find({ isActive: true })
        .sort({ isPrimary: -1, displayOrder: 1 }) // Primary first, then by display order
        .select('code name symbol exchangeRate')
        .lean();
};

// Static method to get primary currency (USD)
CurrencySchema.statics.getPrimary = async function () {
    return this.findOne({ isPrimary: true }).lean();
};

// Static method to get currencies that need API updates
CurrencySchema.statics.getNeedingApiUpdate = async function () {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return this.find({
        isActive: true,
        code: { $ne: 'USD' }, // USD doesn't need API updates
        useManualRate: false,
        $or: [
            { lastApiUpdate: null },
            { lastApiUpdate: { $lt: oneDayAgo } },
            { apiStatus: 'failed' }
        ]
    }).lean();
};

// Instance method to convert USD amount to this currency
CurrencySchema.methods.convertFromUSD = function (this: ICurrency, usdAmount: number) {
    const rate = this.useManualRate && this.manualRate ? this.manualRate : this.exchangeRate;
    return Math.round(usdAmount * rate * 100) / 100; // Round to 2 decimal places
};

// Instance method to convert this currency amount to USD
CurrencySchema.methods.convertToUSD = function (this: ICurrency, amount: number) {
    const rate = this.useManualRate && this.manualRate ? this.manualRate : this.exchangeRate;
    return Math.round((amount / rate) * 100) / 100; // Round to 2 decimal places
};

// Instance method to update exchange rate from API
CurrencySchema.methods.updateRateFromAPI = async function (this: ICurrency, newRate: number) {
    this.previousRate = this.exchangeRate;
    this.exchangeRate = newRate;
    this.lastApiUpdate = new Date();
    this.apiStatus = 'success';
    this.apiSource = 'exchangerate-api';
    return this.save();
};

// Instance method to mark API update as failed
CurrencySchema.methods.markApiUpdateFailed = async function (this: ICurrency) {
    this.apiStatus = 'failed';
    return this.save();
};

// Instance method to set manual rate
CurrencySchema.methods.setManualRate = async function (this: ICurrency, rate: number, useManual = true) {
    this.previousRate = this.exchangeRate;
    this.manualRate = rate;
    this.useManualRate = useManual;

    if (useManual) {
        this.exchangeRate = rate;
        this.apiSource = 'manual';
    }

    return this.save();
};

// Virtual for effective rate (manual or API)
CurrencySchema.virtual('effectiveRate').get(function (this: ICurrency) {
    return this.useManualRate && this.manualRate ? this.manualRate : this.exchangeRate;
});

// Virtual for rate change indicator
CurrencySchema.virtual('rateChangeIndicator').get(function (this: ICurrency) {
    if (!this.rateChange || this.rateChange === 0) return 'stable';
    return this.rateChange > 0 ? 'up' : 'down';
});

// Virtual for last update status
CurrencySchema.virtual('updateStatus').get(function (this: ICurrency) {
    if (!this.lastApiUpdate) return 'never_updated';

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (this.lastApiUpdate < oneDayAgo) return 'outdated';

    return 'current';
});

// Virtual for formatted display
CurrencySchema.virtual('displayName').get(function (this: ICurrency) {
    return `${this.name} (${this.code})`;
});

// Prevent recompilation in development
const Currency: Model<ICurrency> = mongoose.models.Currency || mongoose.model<ICurrency>('Currency', CurrencySchema);

export default Currency;
