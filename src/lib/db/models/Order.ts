/**
 * Order Model Schema
 * 
 * This file defines the Order model schema for MongoDB using Mongoose.
 * Orders represent customer purchases of digital design products with customizations.
 * 
 * Features:
 * - Digital download delivery system
 * - Automatic order processing
 * - Email notification system
 * - Product customization tracking
 * - PayPal integration
 * - USD currency only
 * - Promo code application
 * - Order status management
 * 
 * Order Flow:
 * 1. Customer places order with customizations
 * 2. PayPal processes payment
 * 3. System automatically processes order
 * 4. Email sent to customer with download links
 * 5. Order marked as delivered
 * 
 * Use Cases:
 * - Digital design purchases
 * - Custom design orders
 * - Order tracking and management
 * - Customer communication
 * - Sales analytics
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for Order Item (product within an order)
export interface IOrderItem {
    productId: string;               // Reference to Product
    productName: string;             // Product name at time of order
    productSlug: string;             // Product slug at time of order
    quantity: number;                // Usually 1 for digital products

    // Pricing with promo support
    originalPrice: number;           // Original price before any discounts
    discountAmount: number;          // Discount applied to this item
    unitPrice: number;               // Final price per item after discount
    totalPrice: number;              // unitPrice * quantity in USD

    // Item-level promo code
    promoCode?: string;              // Promo code applied to this item
    promoDiscount?: number;          // Discount amount from promo for this item

    // Customization data
    hasCustomizations: boolean;      // Does this item have customizations
    customizations?: {
        colors?: { name: string; hex: string; }[]; // Selected color themes
        textChanges?: { field: string; value: string; }[]; // Text modifications
        uploadedImages?: { url: string; publicId: string; }[]; // Uploaded images with Cloudinary info
        uploadedLogo?: { url: string; publicId: string; }; // Uploaded logo with Cloudinary info
        customizationNotes?: string;   // Customer notes for this item
    };
}

// Interface for PayPal Address (received from PayPal after payment)
export interface IPayPalAddress {
    fullName?: string;               // Customer name from PayPal
    email?: string;                  // Email from PayPal
    country?: string;                // Country from PayPal
    city?: string;                   // City from PayPal
    postalCode?: string;             // Postal code from PayPal
    address?: string;                // Street address from PayPal
}

// Interface for Order document
export interface IOrder extends Document {
    _id: string;
    orderNumber: string;             // Human-friendly order number (e.g., "PD-2025-001")

    // Customer information
    customerId: string;              // Reference to User
    customerEmail: string;           // Customer email for notifications
    customerName: string;            // Customer name for order emails

    // PayPal address (populated after payment completion)
    paypalAddress?: IPayPalAddress;  // Address info from PayPal (optional)

    // Order items
    items: IOrderItem[];             // Array of ordered products

    // Pricing information (all in USD)
    subtotal: number;                // Total before any discounts (USD)
    totalPromoDiscount: number;      // Total discount from all promo codes (USD)
    totalPrice: number;              // Final amount after all discounts (USD)

    // Applied promo codes summary
    appliedPromoCodes: string[];     // List of all promo codes used in this order

    // Payment information
    paymentMethod: 'paypal';         // For now, only PayPal
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paypalTransactionId?: string;    // PayPal payment reference
    paypalOrderId?: string;          // PayPal order reference
    paidAt?: Date;                   // When payment was completed

    // Order status
    orderStatus: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';

    // Digital delivery
    deliveryMethod: 'digital_download'; // All products are digital
    downloadLinks?: string[];        // URLs to download processed files
    downloadExpiry?: Date;           // When download links expire
    emailSent: boolean;              // Has completion email been sent
    emailSentAt?: Date;              // When email was sent

    // Customization flags
    hasCustomizableProducts: boolean; // Does order contain customizable items
    customizationStatus: 'none' | 'pending' | 'processing' | 'completed';

    // Customer communication
    customerNotes?: string;          // Special requests from customer
    adminNotes?: string;             // Internal admin notes

    // Order tracking
    orderHistory: {
        status: string;                // Status name
        timestamp: Date;               // When status changed
        note?: string;                 // Optional note about change
        changedBy?: string;            // Admin who made the change
    }[];

    // Processing information
    processedAt?: Date;              // When order was processed
    processedBy?: string;            // System or admin who processed
    estimatedDelivery?: Date;        // Estimated delivery time
    actualDelivery?: Date;           // When actually delivered

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// PayPal Address Schema (optional data from PayPal)
const PayPalAddressSchema = new Schema<IPayPalAddress>({
    fullName: {
        type: String,
        trim: true,
        maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    country: {
        type: String,
        trim: true,
        maxlength: [50, 'Country cannot exceed 50 characters']
    },
    city: {
        type: String,
        trim: true,
        maxlength: [50, 'City cannot exceed 50 characters']
    },
    postalCode: {
        type: String,
        trim: true,
        maxlength: [20, 'Postal code cannot exceed 20 characters']
    },
    address: {
        type: String,
        trim: true,
        maxlength: [200, 'Address cannot exceed 200 characters']
    }
}, { _id: false });

// Order Item Schema
const OrderItemSchema = new Schema<IOrderItem>({
    productId: {
        type: String,
        required: [true, 'Product ID is required']
    },
    productName: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
    },
    productSlug: {
        type: String,
        required: [true, 'Product slug is required'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1'],
        default: 1
    },
    originalPrice: {
        type: Number,
        required: [true, 'Original price is required'],
        min: [0, 'Original price cannot be negative']
    },
    discountAmount: {
        type: Number,
        default: 0,
        min: [0, 'Discount amount cannot be negative']
    },
    unitPrice: {
        type: Number,
        required: [true, 'Unit price is required'],
        min: [0, 'Unit price cannot be negative']
    },
    totalPrice: {
        type: Number,
        required: [true, 'Total price is required'],
        min: [0, 'Total price cannot be negative']
    },
    promoCode: {
        type: String,
        uppercase: true,
        trim: true
    },
    promoDiscount: {
        type: Number,
        min: [0, 'Promo discount cannot be negative'],
        default: 0
    },
    hasCustomizations: {
        type: Boolean,
        default: false
    },
    customizations: {
        colors: [{
            name: { type: String, trim: true },
            hex: { type: String, match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'] }
        }],
        textChanges: [{
            field: { type: String, trim: true },
            value: { type: String, trim: true }
        }],
        uploadedImages: [{
            url: { type: String, trim: true },
            publicId: { type: String, trim: true }
        }],
        uploadedLogo: {
            url: { type: String, trim: true },
            publicId: { type: String, trim: true }
        },
        customizationNotes: { type: String, trim: true }
    }
}, { _id: false });

// Order Schema definition
const OrderSchema = new Schema<IOrder>({
    orderNumber: {
        type: String,
        required: [true, 'Order number is required'],
        unique: true,
        trim: true
    },

    // Customer information
    customerId: {
        type: String,
        required: [true, 'Customer ID is required'],
        index: true
    },

    customerEmail: {
        type: String,
        required: [true, 'Customer email is required'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },

    customerName: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
    },

    // PayPal address (populated after payment completion)
    paypalAddress: {
        type: PayPalAddressSchema,
        required: false
    },

    // Order items
    items: {
        type: [OrderItemSchema],
        validate: {
            validator: function (items: IOrderItem[]) {
                return items.length > 0;
            },
            message: 'Order must contain at least one item'
        }
    },

    // Pricing information
    subtotal: {
        type: Number,
        required: [true, 'Subtotal is required'],
        min: [0, 'Subtotal cannot be negative']
    },

    totalPromoDiscount: {
        type: Number,
        default: 0,
        min: [0, 'Total promo discount cannot be negative']
    },

    totalPrice: {
        type: Number,
        required: [true, 'Total price is required'],
        min: [0, 'Total price cannot be negative']
    },

    // Applied promo codes summary
    appliedPromoCodes: [{
        type: String,
        uppercase: true,
        trim: true
    }],

    // Payment information
    paymentMethod: {
        type: String,
        enum: {
            values: ['paypal'],
            message: 'Payment method must be paypal'
        },
        default: 'paypal'
    },

    paymentStatus: {
        type: String,
        enum: {
            values: ['pending', 'paid', 'failed', 'refunded'],
            message: 'Invalid payment status'
        },
        default: 'pending'
    },

    paypalTransactionId: {
        type: String,
        trim: true
    },

    paypalOrderId: {
        type: String,
        trim: true
    },

    paidAt: {
        type: Date
    },

    // Order status
    orderStatus: {
        type: String,
        enum: {
            values: ['pending', 'processing', 'completed', 'cancelled', 'refunded'],
            message: 'Invalid order status'
        },
        default: 'pending'
    },

    // Digital delivery
    deliveryMethod: {
        type: String,
        enum: {
            values: ['digital_download'],
            message: 'Delivery method must be digital_download'
        },
        default: 'digital_download'
    },

    downloadLinks: [{
        type: String
    }],

    downloadExpiry: {
        type: Date
    },

    emailSent: {
        type: Boolean,
        default: false
    },

    emailSentAt: {
        type: Date
    },

    // Customization flags
    hasCustomizableProducts: {
        type: Boolean,
        default: false
    },

    customizationStatus: {
        type: String,
        enum: {
            values: ['none', 'pending', 'processing', 'completed'],
            message: 'Invalid customization status'
        },
        default: 'none'
    },

    // Customer communication
    customerNotes: {
        type: String,
        trim: true,
        maxlength: [10000, 'Customer notes cannot exceed 10000 characters']
    },

    adminNotes: {
        type: String,
        trim: true,
        maxlength: [10000, 'Admin notes cannot exceed 10000 characters']
    },

    // Order tracking
    orderHistory: [{
        status: {
            type: String,
            required: [true, 'Status is required'],
            trim: true
        },
        timestamp: {
            type: Date,
            required: [true, 'Timestamp is required'],
            default: Date.now
        },
        note: {
            type: String,
            trim: true,
            maxlength: [2000, 'Note cannot exceed 2000 characters']
        },
        changedBy: {
            type: String,
            trim: true
        }
    }],

    // Processing information
    processedAt: {
        type: Date
    },

    processedBy: {
        type: String,
        trim: true,
        default: 'system'
    },

    estimatedDelivery: {
        type: Date
    },

    actualDelivery: {
        type: Date
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
// Note: orderNumber index is automatically created by unique: true in schema
// Note: customerId index is automatically created by index: true in schema
OrderSchema.index({ customerEmail: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ paidAt: -1 });
OrderSchema.index({ paypalTransactionId: 1 });

// Compound indexes
OrderSchema.index({ customerId: 1, orderStatus: 1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, orderStatus: 1 });

// Pre-save middleware to calculate totals and promo codes
OrderSchema.pre('save', function (this: IOrder, next) {
    // Calculate subtotal from original prices
    this.subtotal = this.items.reduce((sum, item) => {
        return sum + (item.originalPrice * item.quantity);
    }, 0);

    // Calculate total promo discount
    this.totalPromoDiscount = this.items.reduce((sum, item) => {
        return sum + (item.promoDiscount || 0);
    }, 0);

    // Calculate final total price
    this.totalPrice = this.items.reduce((sum, item) => {
        return sum + item.totalPrice;
    }, 0);

    // Update applied promo codes list
    const promoCodes = this.items
        .filter(item => item.promoCode)
        .map(item => item.promoCode!)
        .filter((code, index, array) => array.indexOf(code) === index); // Remove duplicates

    this.appliedPromoCodes = promoCodes;

    next();
});

// Pre-save middleware to generate order number
OrderSchema.pre('save', async function (this: IOrder, next) {
    if (this.isNew && !this.orderNumber) {
        const year = new Date().getFullYear();
        const count = await mongoose.model('Order').countDocuments({
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });

        this.orderNumber = `PD-${year}-${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

// Pre-save middleware to add status history
OrderSchema.pre('save', function (this: IOrder, next) {
    if (this.isModified('orderStatus') && !this.isNew) {
        this.orderHistory.push({
            status: this.orderStatus,
            timestamp: new Date(),
            note: `تم تغيير حالة الطلب إلى ${this.orderStatus === 'pending' ? 'في الانتظار' : this.orderStatus === 'processing' ? 'قيد المعالجة' : this.orderStatus === 'completed' ? 'مكتمل' : this.orderStatus === 'cancelled' ? 'ملغي' : this.orderStatus}`,
            changedBy: 'system'
        });
    }
    next();
});

// Pre-save middleware to check customization status
OrderSchema.pre('save', function (this: IOrder, next) {
    const hasCustomizations = this.items.some(item => item.hasCustomizations);
    this.hasCustomizableProducts = hasCustomizations;

    if (hasCustomizations && this.customizationStatus === 'none') {
        this.customizationStatus = 'pending';
    }

    next();
});

// Static method to get orders by customer
OrderSchema.statics.getByCustomer = async function (customerId: string, limit = 20) {
    return this.find({ customerId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

// Static method to get orders by status
OrderSchema.statics.getByStatus = async function (status: string, limit = 50) {
    return this.find({ orderStatus: status })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

// Static method to get pending orders
OrderSchema.statics.getPendingOrders = async function () {
    return this.find({
        orderStatus: 'pending',
        paymentStatus: 'paid'
    })
        .sort({ createdAt: 1 })
        .lean();
};

// Static method to get daily sales
OrderSchema.statics.getDailySales = async function (date: Date) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: startOfDay, $lte: endOfDay },
                paymentStatus: 'paid'
            }
        },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totalPrice' },
                averageOrder: { $avg: '$totalPrice' }
            }
        }
    ]);
};

// Instance method to apply promo code to specific item
OrderSchema.methods.applyPromoToItem = async function (this: IOrder, itemIndex: number, promoCode: string, discountAmount: number) {
    if (itemIndex < 0 || itemIndex >= this.items.length) {
        throw new Error('Invalid item index');
    }

    const item = this.items[itemIndex];
    item.promoCode = promoCode.toUpperCase();
    item.promoDiscount = discountAmount;
    item.discountAmount = discountAmount;
    item.unitPrice = Math.max(0, item.originalPrice - discountAmount);
    item.totalPrice = item.unitPrice * item.quantity;

    this.orderHistory.push({
        status: 'promo_applied',
        timestamp: new Date(),
        note: `تم تطبيق كوبون ${promoCode} على ${item.productName} (خصم ${discountAmount})`,
        changedBy: 'system'
    });

    return this.save();
};

// Instance method to remove promo code from specific item
OrderSchema.methods.removePromoFromItem = async function (this: IOrder, itemIndex: number) {
    if (itemIndex < 0 || itemIndex >= this.items.length) {
        throw new Error('Invalid item index');
    }

    const item = this.items[itemIndex];
    const oldPromo = item.promoCode;

    item.promoCode = undefined;
    item.promoDiscount = 0;
    item.discountAmount = 0;
    item.unitPrice = item.originalPrice;
    item.totalPrice = item.unitPrice * item.quantity;

    if (oldPromo) {
        this.orderHistory.push({
            status: 'promo_removed',
            timestamp: new Date(),
            note: `تم إزالة كوبون ${oldPromo} من ${item.productName}`,
            changedBy: 'system'
        });
    }

    return this.save();
};

// Instance method to get promo code summary
OrderSchema.methods.getPromoSummary = function (this: IOrder) {
    const summary = this.items
        .filter(item => item.promoCode)
        .map(item => ({
            productName: item.productName,
            promoCode: item.promoCode,
            discount: item.promoDiscount,
            originalPrice: item.originalPrice,
            finalPrice: item.unitPrice
        }));

    return {
        totalItems: this.items.length,
        itemsWithPromo: summary.length,
        totalDiscount: this.totalPromoDiscount,
        totalSavings: this.subtotal - this.totalPrice,
        promoDetails: summary
    };
};

// Instance method to mark as paid
OrderSchema.methods.markAsPaid = async function (this: IOrder, paypalTransactionId: string, paypalOrderId: string, paypalAddress?: IPayPalAddress) {
    this.paymentStatus = 'paid';
    this.paypalTransactionId = paypalTransactionId;
    this.paypalOrderId = paypalOrderId;
    this.paidAt = new Date();
    this.orderStatus = 'processing';

    // Store PayPal address if provided
    if (paypalAddress) {
        this.paypalAddress = paypalAddress;
    }

    this.orderHistory.push({
        status: 'paid',
        timestamp: new Date(),
        note: `تم إكمال الدفع عبر PayPal: ${paypalTransactionId}`,
        changedBy: 'system'
    });

    return this.save();
};

// Instance method to complete order
OrderSchema.methods.completeOrder = async function (this: IOrder, downloadLinks: string[]) {
    this.orderStatus = 'completed';
    this.downloadLinks = downloadLinks;
    this.processedAt = new Date();
    this.actualDelivery = new Date();
    this.downloadExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    if (this.hasCustomizableProducts) {
        this.customizationStatus = 'completed';
    }

    this.orderHistory.push({
        status: 'completed',
        timestamp: new Date(),
        note: 'تم إكمال الطلب وإنشاء روابط التحميل',
        changedBy: 'system'
    });

    return this.save();
};

// Instance method to mark email as sent
OrderSchema.methods.markEmailSent = async function (this: IOrder) {
    this.emailSent = true;
    this.emailSentAt = new Date();
    return this.save();
};

// Instance method to add admin note
OrderSchema.methods.addAdminNote = async function (this: IOrder, note: string, adminId: string) {
    this.adminNotes = note;
    this.orderHistory.push({
        status: 'note_added',
        timestamp: new Date(),
        note: `تم إضافة ملاحظة المدير: ${note}`,
        changedBy: adminId // This will now be the admin name
    });
    return this.save();
};

// Virtual for order total in display format
OrderSchema.virtual('displayTotal').get(function (this: IOrder) {
    return `$${this.totalPrice.toFixed(2)}`;
});

// Virtual for order age
OrderSchema.virtual('orderAge').get(function (this: IOrder) {
    const now = new Date();
    const diff = now.getTime() - this.createdAt.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Less than an hour ago';
});

// Virtual for download availability
OrderSchema.virtual('downloadAvailable').get(function (this: IOrder) {
    return this.orderStatus === 'completed' &&
        this.downloadLinks &&
        this.downloadLinks.length > 0 &&
        this.downloadExpiry &&
        this.downloadExpiry > new Date();
});

// Prevent recompilation in development
const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
