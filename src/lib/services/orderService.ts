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

import connectDB from '@/lib/db/connection';
import { Order, Product, DesignFile, OrderDesignFile } from '@/lib/db/models';

/**
 * Complete an order and grant design file access
 * @param orderId - The order ID to complete
 * @returns Promise<boolean> - Success status
 */
export async function completeOrder(orderId: string): Promise<boolean> {
    try {
        await connectDB();

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            console.error(`Order not found: ${orderId}`);
            return false;
        }

        // Verify order is paid
        if (order.status !== 'paid') {
            console.error(`Order ${orderId} is not paid. Status: ${order.status}`);
            return false;
        }

        // Get all products from the order
        const productIds = order.items.map(item => item.productId);

        // Find all design files for these products
        const designFiles = await DesignFile.find({
            productId: { $in: productIds },
            isActive: true
        });

        if (designFiles.length === 0) {
            console.log(`No design files found for order ${orderId}`);
            return true; // Order completed successfully, just no files
        }

        // Create access records for each design file
        const accessRecords = designFiles.map(designFile => ({
            orderId: order._id,
            designFileId: designFile._id,
            downloadCount: 0,
            isActive: true
        }));

        // Insert access records
        await OrderDesignFile.insertMany(accessRecords);

        // Update order status to completed
        await Order.findByIdAndUpdate(orderId, {
            status: 'completed',
            completedAt: new Date()
        });

        console.log(`Order ${orderId} completed successfully. Created ${accessRecords.length} file access records.`);
        return true;

    } catch (error) {
        console.error('Error completing order:', error);
        return false;
    }
}

/**
 * Grant design file access for a specific order and product
 * @param orderId - The order ID
 * @param productId - The product ID
 * @returns Promise<boolean> - Success status
 */
export async function grantFileAccess(orderId: string, productId: string): Promise<boolean> {
    try {
        await connectDB();

        // Verify order exists and is paid
        const order = await Order.findById(orderId);
        if (!order || order.status !== 'paid') {
            console.error(`Order ${orderId} not found or not paid`);
            return false;
        }

        // Find design files for the product
        const designFiles = await DesignFile.find({
            productId,
            isActive: true
        });

        if (designFiles.length === 0) {
            console.log(`No design files found for product ${productId}`);
            return true;
        }

        // Create access records
        const accessRecords = designFiles.map(designFile => ({
            orderId,
            designFileId: designFile._id,
            downloadCount: 0,
            isActive: true
        }));

        // Insert access records
        await OrderDesignFile.insertMany(accessRecords);

        console.log(`Granted file access for order ${orderId}, product ${productId}. Created ${accessRecords.length} access records.`);
        return true;

    } catch (error) {
        console.error('Error granting file access:', error);
        return false;
    }
}

/**
 * Revoke design file access for an order
 * @param orderId - The order ID
 * @returns Promise<boolean> - Success status
 */
export async function revokeFileAccess(orderId: string): Promise<boolean> {
    try {
        await connectDB();

        // Deactivate all access records for the order
        const result = await OrderDesignFile.updateMany(
            { orderId },
            { isActive: false }
        );

        console.log(`Revoked file access for order ${orderId}. Updated ${result.modifiedCount} records.`);
        return true;

    } catch (error) {
        console.error('Error revoking file access:', error);
        return false;
    }
}

/**
 * Get design file access for an order
 * @param orderId - The order ID
 * @returns Promise<Array> - Array of design file access records
 */
export async function getOrderFileAccess(orderId: string) {
    try {
        await connectDB();

        const accessRecords = await OrderDesignFile.find({
            orderId,
            isActive: true
        }).populate('designFileId');

        return accessRecords;

    } catch (error) {
        console.error('Error getting order file access:', error);
        return [];
    }
}

/**
 * Check if order has access to a specific design file
 * @param orderId - The order ID
 * @param designFileId - The design file ID
 * @returns Promise<boolean> - Whether access exists
 */
export async function hasFileAccess(orderId: string, designFileId: string): Promise<boolean> {
    try {
        await connectDB();

        const access = await OrderDesignFile.findOne({
            orderId,
            designFileId,
            isActive: true
        });

        return !!access;

    } catch (error) {
        console.error('Error checking file access:', error);
        return false;
    }
}

/**
 * Get download statistics for a design file
 * @param designFileId - The design file ID
 * @returns Promise<Object> - Download statistics
 */
export async function getFileDownloadStats(designFileId: string) {
    try {
        await connectDB();

        const stats = await OrderDesignFile.aggregate([
            { $match: { designFileId, isActive: true } },
            {
                $group: {
                    _id: null,
                    totalDownloads: { $sum: '$downloadCount' },
                    totalOrders: { $sum: 1 },
                    averageDownloads: { $avg: '$downloadCount' }
                }
            }
        ]);

        return stats[0] || {
            totalDownloads: 0,
            totalOrders: 0,
            averageDownloads: 0
        };

    } catch (error) {
        console.error('Error getting file download stats:', error);
        return {
            totalDownloads: 0,
            totalOrders: 0,
            averageDownloads: 0
        };
    }
} 