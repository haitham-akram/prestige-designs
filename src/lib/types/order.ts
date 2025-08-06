// Order-related TypeScript interfaces and types

export interface OrderItem {
    productId: string;
    productName: string;
    productSlug: string;
    quantity: number;
    originalPrice: number;
    discountAmount: number;
    unitPrice: number;
    totalPrice: number;
    promoCode?: string;
    promoDiscount?: number;
    hasCustomizations: boolean;
    customizations?: {
        colors?: { name: string; hex: string; }[];
        textChanges?: { field: string; value: string; }[];
        uploadedImages?: string[];
        uploadedLogo?: string;
        customizationNotes?: string;
    };
}

export interface PayPalAddress {
    fullName?: string;
    email?: string;
    country?: string;
    city?: string;
    postalCode?: string;
    address?: string;
}

export interface OrderHistoryEntry {
    status: string;
    timestamp: Date;
    note?: string;
    changedBy?: string;
}

export interface Order {
    _id: string;
    orderNumber: string;
    customerId: string;
    customerEmail: string;
    customerName: string;
    paypalAddress?: PayPalAddress;
    items: OrderItem[];
    subtotal: number;
    totalPromoDiscount: number;
    totalPrice: number;
    appliedPromoCodes: string[];
    paymentMethod: 'paypal';
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paypalTransactionId?: string;
    paypalOrderId?: string;
    paidAt?: Date;
    orderStatus: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
    deliveryMethod: 'digital_download';
    downloadLinks?: string[];
    downloadExpiry?: Date;
    emailSent: boolean;
    emailSentAt?: Date;
    hasCustomizableProducts: boolean;
    customizationStatus: 'none' | 'pending' | 'processing' | 'completed';
    customerNotes?: string;
    adminNotes?: string;
    orderHistory: OrderHistoryEntry[];
    processedAt?: Date;
    processedBy?: string;
    estimatedDelivery?: Date;
    actualDelivery?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderDesignFile {
    _id: string;
    orderId: string;
    designFileId: string;
    downloadCount: number;
    firstDownloadedAt?: Date;
    lastDownloadedAt?: Date;
    isActive: boolean;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface DesignFile {
    _id: string;
    fileName: string;
    originalName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    productId: string;
    colorName?: string;
    isActive: boolean;
    maxDownloads?: number;
    expiresAt?: Date;
    notes?: string;
    uploadedBy: string;
    uploadedFor?: string;
    createdAt: Date;
    updatedAt: Date;
}

// API Response Types
export interface OrdersResponse {
    orders: Order[];
    pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export interface OrderDetailResponse {
    order: Order;
    designFiles: OrderDesignFile[];
}

export interface OrderStats {
    overview: {
        totalOrders: number;
        totalRevenue: number;
        completedOrders: number;
        pendingOrders: number;
        processingOrders: number;
        cancelledOrders: number;
        customizationOrders: number;
        avgOrderValue: number;
    };
    dailyStats: Array<{
        date: string;
        orders: number;
        revenue: number;
        customizations: number;
    }>;
    statusDistribution: Record<string, number>;
    customizationStatusDistribution: Record<string, number>;
    topProducts: Array<{
        _id: string;
        productName: string;
        orderCount: number;
        totalRevenue: number;
    }>;
    processingTime: {
        avgProcessingTime: number;
        minProcessingTime: number;
        maxProcessingTime: number;
    };
}

// Filter Types
export interface OrderFilters {
    status?: string;
    paymentStatus?: string;
    customizationStatus?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    customerId?: string;
}

// Update Types
export interface OrderUpdateData {
    orderStatus?: string;
    adminNotes?: string;
    estimatedDelivery?: string;
    customerNotes?: string;
}

// File Upload Types
export interface FileUploadData {
    files: File[];
    productId: string;
    colorName?: string;
    notes?: string;
}

// Email Types
export interface EmailData {
    type: string;
    subject: string;
    sentAt: Date;
    sentBy: string;
    recipient: string;
    customMessage?: string;
}

// Bulk Action Types
export interface BulkActionRequest {
    action: 'mark_processing' | 'mark_completed' | 'mark_cancelled';
    orderIds: string[];
}

// Status Colors and Icons
export const ORDER_STATUS_COLORS = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    completed: '#10b981',
    cancelled: '#ef4444',
    refunded: '#8b5cf6'
} as const;

export const PAYMENT_STATUS_COLORS = {
    pending: '#f59e0b',
    paid: '#10b981',
    failed: '#ef4444',
    refunded: '#8b5cf6'
} as const;

export const CUSTOMIZATION_STATUS_COLORS = {
    none: '#6b7280',
    pending: '#f59e0b',
    processing: '#3b82f6',
    completed: '#10b981'
} as const;

// Utility Types
export type OrderStatus = Order['orderStatus'];
export type PaymentStatus = Order['paymentStatus'];
export type CustomizationStatus = Order['customizationStatus'];

// Form Types
export interface OrderFormData {
    orderStatus: OrderStatus;
    adminNotes: string;
    estimatedDelivery: string;
    customerNotes: string;
}

export interface FileUploadFormData {
    files: FileList;
    productId: string;
    colorName: string;
    notes: string;
}

export interface EmailFormData {
    emailType: 'order_confirmation' | 'order_processing' | 'order_completed' | 'custom_message';
    customMessage?: string;
} 