/**
 * Order Service
 * 
 * This file contains services for handling order-related operations,
 * including order completion and design file access management.
 * 
 * Features:
 * - Order completion processing
 * - Design file access creation
 * - Payment validation
 * - File access management
 */

import Order from '@/lib/db/models/Order';
import OrderDesignFile from '@/lib/db/models/OrderDesignFile';
import DesignFile from '@/lib/db/models/DesignFile';
import connectDB from '@/lib/db/connection';

export interface OrderFilters {
    status?: string;
    paymentStatus?: string;
    customizationStatus?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    customerId?: string;
}

export interface OrderUpdateData {
    orderStatus?: string;
    adminNotes?: string;
    estimatedDelivery?: string;
    customerNotes?: string;
}

export interface FileUploadData {
    files: File[];
    productId: string;
    colorName?: string;
    notes?: string;
}

export class OrderService {
    /**
     * Get orders with filtering and pagination
     */
    static async getOrders(
        filters: OrderFilters = {},
        page: number = 1,
        limit: number = 20,
        sortBy: string = 'createdAt',
        sortOrder: 'asc' | 'desc' = 'desc'
    ) {
        await connectDB();

        const filter: any = {};

        if (filters.status && filters.status !== 'all') {
            filter.orderStatus = filters.status;
        }

        if (filters.paymentStatus && filters.paymentStatus !== 'all') {
            filter.paymentStatus = filters.paymentStatus;
        }

        if (filters.customizationStatus && filters.customizationStatus !== 'all') {
            filter.customizationStatus = filters.customizationStatus;
        }

        if (filters.search) {
            filter.$or = [
                { orderNumber: { $regex: filters.search, $options: 'i' } },
                { customerName: { $regex: filters.search, $options: 'i' } },
                { customerEmail: { $regex: filters.search, $options: 'i' } }
            ];
        }

        if (filters.startDate || filters.endDate) {
            filter.createdAt = {};
            if (filters.startDate) {
                filter.createdAt.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                filter.createdAt.$lte = new Date(filters.endDate);
            }
        }

        if (filters.customerId) {
            filter.customerId = filters.customerId;
        }

        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (page - 1) * limit;

        const [orders, totalCount] = await Promise.all([
            Order.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(filter)
        ]);

        return {
            orders,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPrevPage: page > 1
            }
        };
    }

    /**
     * Get a single order by ID with design files
     */
    static async getOrderById(orderId: string) {
        await connectDB();

        const order = await Order.findById(orderId).lean();
        if (!order) {
            throw new Error('Order not found');
        }

        const orderDesignFiles = await OrderDesignFile.find({ orderId: order._id })
            .populate('designFileId')
            .lean();

        return {
            order,
            designFiles: orderDesignFiles
        };
    }

    /**
     * Update an order
     */
    static async updateOrder(orderId: string, updateData: OrderUpdateData, adminId: string) {
        await connectDB();

        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        const updates: any = {};
        const historyEntry: any = {
            timestamp: new Date(),
            changedBy: adminId // This will now be the admin name
        };

        if (updateData.orderStatus && updateData.orderStatus !== order.orderStatus) {
            updates.orderStatus = updateData.orderStatus;
            historyEntry.status = updateData.orderStatus;
            historyEntry.note = `تم تغيير حالة الطلب إلى ${updateData.orderStatus === 'pending' ? 'في الانتظار' : updateData.orderStatus === 'processing' ? 'قيد المعالجة' : updateData.orderStatus === 'completed' ? 'مكتمل' : updateData.orderStatus === 'cancelled' ? 'ملغي' : updateData.orderStatus}`;
        }

        if (updateData.adminNotes !== undefined) {
            updates.adminNotes = updateData.adminNotes;
            if (!historyEntry.status) {
                historyEntry.status = 'note_updated';
                historyEntry.note = 'تم تحديث ملاحظات المدير';
            }
        }

        if (updateData.estimatedDelivery !== undefined) {
            updates.estimatedDelivery = updateData.estimatedDelivery ? new Date(updateData.estimatedDelivery) : null;
            if (!historyEntry.status) {
                historyEntry.status = 'delivery_updated';
                historyEntry.note = 'تم تحديث موعد التسليم المتوقع';
            }
        }

        if (updateData.customerNotes !== undefined) {
            updates.customerNotes = updateData.customerNotes;
            if (!historyEntry.status) {
                historyEntry.status = 'customer_note_updated';
                historyEntry.note = 'تم تحديث ملاحظات العميل';
            }
        }

        if (Object.keys(updates).length > 0) {
            updates.$push = { orderHistory: historyEntry };
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            updates,
            { new: true, runValidators: true }
        );

        return updatedOrder;
    }

    /**
     * Get orders that need customization work
     */
    static async getCustomizationQueue() {
        await connectDB();

        const orders = await Order.find({
            hasCustomizableProducts: true,
            customizationStatus: { $in: ['pending', 'processing'] },
            orderStatus: { $in: ['processing', 'pending'] },
            paymentStatus: 'paid'
        })
            .sort({ createdAt: 1 })
            .lean();

        return orders;
    }

    /**
     * Get orders by status
     */
    static async getOrdersByStatus(status: string, limit: number = 50) {
        await connectDB();

        return Order.find({ orderStatus: status })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }

    /**
     * Get orders by customer
     */
    static async getOrdersByCustomer(customerId: string, limit: number = 20) {
        await connectDB();

        return Order.find({ customerId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }

    /**
     * Get order statistics
     */
    static async getOrderStats(period: number = 30) {
        await connectDB();

        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - period);

        const dateFilter = {
            createdAt: { $gte: daysAgo }
        };

        const [
            totalOrders,
            totalRevenue,
            completedOrders,
            pendingOrders,
            processingOrders,
            customizationOrders
        ] = await Promise.all([
            Order.countDocuments(dateFilter),
            Order.aggregate([
                { $match: { ...dateFilter, paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalPrice' } } }
            ]),
            Order.countDocuments({ ...dateFilter, orderStatus: 'completed' }),
            Order.countDocuments({ ...dateFilter, orderStatus: 'pending' }),
            Order.countDocuments({ ...dateFilter, orderStatus: 'processing' }),
            Order.countDocuments({ ...dateFilter, hasCustomizableProducts: true })
        ]);

        return {
            totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            completedOrders,
            pendingOrders,
            processingOrders,
            customizationOrders
        };
    }

    /**
     * Check if order can be completed
     */
    static async canCompleteOrder(orderId: string): Promise<boolean> {
        await connectDB();

        const order = await Order.findById(orderId);
        if (!order) {
            return false;
        }

        // If no customizations, can complete immediately
        if (!order.hasCustomizableProducts) {
            return true;
        }

        // Check if all customized items have design files
        const orderDesignFiles = await OrderDesignFile.find({ orderId: order._id });

        const customizedItems = order.items.filter(item => item.hasCustomizations);
        const itemsWithFiles = new Set(
            orderDesignFiles.map(odf => odf.designFileId)
        );

        return customizedItems.every(item =>
            itemsWithFiles.has(item.productId)
        );
    }

    /**
     * Complete an order
     */
    static async completeOrder(orderId: string, adminId: string) {
        await connectDB();

        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        const canComplete = await this.canCompleteOrder(orderId);
        if (!canComplete) {
            throw new Error('Order cannot be completed - missing design files for customized items');
        }

        // Generate download links
        const orderDesignFiles = await OrderDesignFile.find({ orderId: order._id })
            .populate('designFileId');

        const downloadLinks = orderDesignFiles.map(odf =>
            `/api/design-files/${odf.designFileId}/download`
        );

        order.orderStatus = 'completed';
        order.downloadLinks = downloadLinks;
        order.processedAt = new Date();
        order.processedBy = adminId;
        order.actualDelivery = new Date();
        order.downloadExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        if (order.hasCustomizableProducts) {
            order.customizationStatus = 'completed';
        }

        order.orderHistory.push({
            status: 'completed',
            timestamp: new Date(),
            note: 'تم إكمال الطلب من قبل المدير',
            changedBy: adminId
        });

        await order.save();
        return order;
    }

    /**
     * Cancel an order
     */
    static async cancelOrder(orderId: string, adminId: string, reason?: string) {
        await connectDB();

        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        order.orderStatus = 'cancelled';
        order.orderHistory.push({
            status: 'cancelled',
            timestamp: new Date(),
            note: reason || 'تم إلغاء الطلب من قبل المدير',
            changedBy: adminId
        });

        await order.save();
        return order;
    }

    /**
     * Get order history
     */
    static async getOrderHistory(orderId: string) {
        await connectDB();

        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        return order.orderHistory.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }

    /**
     * Add admin note to order
     */
    static async addAdminNote(orderId: string, note: string, adminId: string) {
        await connectDB();

        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        order.adminNotes = note;
        order.orderHistory.push({
            status: 'note_added',
            timestamp: new Date(),
            note: `ملاحظة المدير: ${note}`,
            changedBy: adminId
        });

        await order.save();
        return order;
    }
} 