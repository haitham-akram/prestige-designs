// /**
//  * Item Delivery Service
//  *
//  * This service handles item-level delivery processing for orders.
//  * It processes each item individually and marks them as delivered or awaiting customization.
//  *
//  * Features:
//  * - Item-level delivery state management
//  * - Automatic file delivery for available items
//  * - Custom work tracking for items requiring customization
//  * - Mixed order handling
//  * - Order completion when all items are delivered
//  */

// import { IOrder } from '@/lib/db/models/Order';
// import { OrderDesignFile } from '@/lib/db/models';
// import { EmailService } from './emailService';
// import { DesignFile as DesignFileModel } from '@/lib/db/models';


// export interface DeliveryResult {
//     autoDeliveredItems: number;
//     awaitingCustomizationItems: number;
//     totalItems: number;
//     orderCompleted: boolean;
// }

// export class ItemDeliveryService {
//     /**
//      * Process delivery for all items in an order
//      */
//     static async processOrderDelivery(order: IOrder): Promise<DeliveryResult> {
//         try {
//             console.log('🔄 Processing item-level delivery for order:', order.orderNumber);
//             console.log('🔍 Order payment status:', order.paymentStatus);
//             console.log('🔍 Order total price:', order.totalPrice);

//             const DesignFile = DesignFileModel;
//             let autoDeliveredCount = 0;
//             let awaitingCustomizationCount = 0;

//             // Process each item individually
//             for (let i = 0; i < order.items.length; i++) {
//                 const item = order.items[i];
//                 console.log(`🔍 Processing item ${i + 1}/${order.items.length}: ${item.productName}`);
//                 console.log(`🔍 Item EnableCustomizations: ${item.EnableCustomizations}`);
//                 console.log(`🔍 Item hasCustomizations: ${item.hasCustomizations}`);
//                 console.log(`🔍 Item customizations:`, JSON.stringify(item.customizations, null, 2));

//                 const itemResult = await this.processItemDelivery(order, i, DesignFile);

//                 if (itemResult === 'auto_delivered') {
//                     autoDeliveredCount++;
//                 } else if (itemResult === 'awaiting_customization') {
//                     awaitingCustomizationCount++;
//                 }

//                 // Log the final status of this item
//                 console.log(`📋 Item ${i + 1} final status: ${itemResult}`);
//                 console.log(`📋 Item delivery status: ${order.items[i].deliveryStatus}`);
//                 console.log(`📋 Item delivery notes: ${order.items[i].deliveryNotes}`);
//             }

//             // Check if all items have been processed
//             const allItemsProcessed = (autoDeliveredCount + awaitingCustomizationCount) === order.items.length;

//             // An order is considered "completed" from a delivery perspective if all items are auto-delivered
//             const orderCompleted = allItemsProcessed && awaitingCustomizationCount === 0;

//             if (orderCompleted) {
//                 order.orderStatus = 'completed';
//                 order.customizationStatus = 'completed';
//                 await order.save();
//                 console.log('✅ Order fully auto-delivered and marked as completed.');
//             } else if (awaitingCustomizationCount > 0) {
//                 order.orderStatus = 'awaiting_customization';
//                 order.customizationStatus = 'pending';
//                 await order.save();
//                 console.log('🎨 Order has items awaiting customization.');
//             }


//             console.log(`✅ Delivery processing complete: ${autoDeliveredCount} auto-delivered, ${awaitingCustomizationCount} awaiting customization`);
//             console.log(`📋 Final order status: ${order.orderStatus}`);
//             console.log(`📋 Final customization status: ${order.customizationStatus}`);

//             return {
//                 autoDeliveredItems: autoDeliveredCount,
//                 awaitingCustomizationItems: awaitingCustomizationCount,
//                 totalItems: order.items.length,
//                 orderCompleted
//             };

//         } catch (error) {
//             console.error('❌ Error processing order delivery:', error);
//             throw error;
//         }
//     }

//     /**
//      * Process delivery for a single item
//      */
//     private static async processItemDelivery(order: IOrder, itemIndex: number, DesignFile: any): Promise<'auto_delivered' | 'awaiting_customization'> {
//         const item = order.items[itemIndex];

//         console.log(`🔍 Checking item: ${item.productName}`);
//         console.log(`🔍 EnableCustomizations: ${item.EnableCustomizations}, hasCustomizations: ${item.hasCustomizations}`);

//         // Case 1: Product doesn't support customization
//         if (item.EnableCustomizations === false) {
//             console.log('🔍 Product does not support customization, checking for general files');
//             return await this.processNonCustomizableItem(order, itemIndex, DesignFile);
//         }

//         // Case 2: Product supports customization but has real customizations
//         const hasRealCustomizations = this.hasRealCustomizations(item);
//         console.log(`🔍 Item has real customizations: ${hasRealCustomizations}`);
//         console.log(`🔍 Item customizations:`, JSON.stringify(item.customizations, null, 2));

//         if (hasRealCustomizations) {
//             console.log('🔍 Item has real customizations, marking as awaiting customization');
//             await order.markItemAsAwaitingCustomization(itemIndex, 'يحتاج تخصيص مخصص');
//             return 'awaiting_customization';
//         }

//         // Case 3: Product supports customization but no real customizations (check for predefined files)
//         console.log('🔍 Product supports customization but no real customizations, checking for predefined files');
//         return await this.processCustomizableItem(order, itemIndex, DesignFile);
//     }

//     /**
//      * Process non-customizable item (always auto-deliver if files exist)
//      */
//     private static async processNonCustomizableItem(order: IOrder, itemIndex: number, DesignFile: any): Promise<'auto_delivered' | 'awaiting_customization'> {
//         const item = order.items[itemIndex];

//         // Convert productId to ObjectId
//         const { Types } = await import('mongoose');
//         const productObjectId = typeof item.productId === 'string' ?
//             new Types.ObjectId(item.productId) : item.productId;

//         // Check for color selections first
//         const colorCustomizations = item.customizations?.colors;

//         if (colorCustomizations && colorCustomizations.length > 0) {
//             // Has color selections - check for predefined color variant files
//             console.log('🔍 Non-customizable item has color selections, checking color variant files');
//             console.log('🔍 Color selections:', JSON.stringify(colorCustomizations, null, 2));
//             return await this.processColorVariantFiles(order, itemIndex, DesignFile, productObjectId, colorCustomizations);
//         }

//         // Check for general files
//         const generalFiles = await DesignFile.find({
//             productId: productObjectId,
//             isColorVariant: false,
//             isActive: true
//         }).lean();

//         if (generalFiles.length > 0) {
//             console.log(`✅ Found ${generalFiles.length} general files for non-customizable item`);

//             // Create OrderDesignFile records
//             await this.createOrderDesignFiles(order, generalFiles);

//             // Mark item as auto-delivered
//             await order.markItemAsAutoDelivered(itemIndex, `تم التوصيل التلقائي - ${generalFiles.length} ملف متاح`);

//             return 'auto_delivered';
//         } else {
//             console.log('❌ No general files found for non-customizable item');
//             await order.markItemAsAwaitingCustomization(itemIndex, 'لا توجد ملفات متاحة - يحتاج إضافة ملفات');
//             return 'awaiting_customization';
//         }
//     }

//     /**
//      * Process customizable item (check for predefined color variants or general files)
//      */
//     private static async processCustomizableItem(order: IOrder, itemIndex: number, DesignFile: any): Promise<'auto_delivered' | 'awaiting_customization'> {
//         const item = order.items[itemIndex];

//         // Convert productId to ObjectId
//         const { Types } = await import('mongoose');
//         const productObjectId = typeof item.productId === 'string' ?
//             new Types.ObjectId(item.productId) : item.productId;

//         const colorCustomizations = item.customizations?.colors;

//         if (!colorCustomizations || colorCustomizations.length === 0) {
//             // No color selection - check for general files
//             console.log('🔍 No color selections, checking general files');
//             return await this.processGeneralFiles(order, itemIndex, DesignFile, productObjectId);
//         } else {
//             // Has color selections - check for predefined color variant files
//             console.log('🔍 Has color selections, checking predefined color variant files');
//             console.log('🔍 Color selections:', JSON.stringify(colorCustomizations, null, 2));
//             return await this.processColorVariantFiles(order, itemIndex, DesignFile, productObjectId, colorCustomizations);
//         }
//     }

//     /**
//      * Process general files for customizable item
//      */
//     private static async processGeneralFiles(order: IOrder, itemIndex: number, DesignFile: any, productObjectId: any): Promise<'auto_delivered' | 'awaiting_customization'> {
//         const generalFiles = await DesignFile.find({
//             productId: productObjectId,
//             isColorVariant: false,
//             isActive: true
//         }).lean();

//         if (generalFiles.length > 0) {
//             console.log(`✅ Found ${generalFiles.length} general files for customizable item`);

//             // Create OrderDesignFile records
//             await this.createOrderDesignFiles(order, generalFiles);

//             // Mark item as auto-delivered
//             await order.markItemAsAutoDelivered(itemIndex, `تم التوصيل التلقائي - ${generalFiles.length} ملف عام متاح`);

//             return 'auto_delivered';
//         } else {
//             console.log('❌ No general files found for customizable item');
//             await order.markItemAsAwaitingCustomization(itemIndex, 'لا توجد ملفات عامة متاحة - يحتاج إضافة ملفات');
//             return 'awaiting_customization';
//         }
//     }

//     /**
//      * Process color variant files for customizable item
//      */
//     private static async processColorVariantFiles(order: IOrder, itemIndex: number, DesignFile: any, productObjectId: any, colorCustomizations: any[]): Promise<'auto_delivered' | 'awaiting_customization'> {
//         const item = order.items[itemIndex];
//         let hasAllColorFiles = true;
//         const allColorFiles = [];

//         for (const color of colorCustomizations) {
//             console.log(`🔍 Checking files for color: ${color.name} (${color.hex})`);
//             console.log(`🔍 Query params:`, {
//                 productId: productObjectId.toString(),
//                 colorVariantHex: color.hex,
//                 isColorVariant: true,
//                 isActive: true
//             });

//             const colorFiles = await DesignFile.find({
//                 productId: productObjectId,
//                 colorVariantHex: color.hex,
//                 isColorVariant: true,
//                 isActive: true
//             }).lean();

//             console.log(`📁 Found ${colorFiles.length} files for color ${color.name}`);
//             console.log(`📁 Files found:`, colorFiles.map(f => ({ fileName: f.fileName, colorVariantHex: f.colorVariantHex })));

//             if (colorFiles.length === 0) {
//                 hasAllColorFiles = false;
//                 break;
//             }
//             allColorFiles.push(...colorFiles);
//         }

//         if (hasAllColorFiles) {
//             console.log(`✅ Found all color variant files (${allColorFiles.length} total)`);

//             // Create OrderDesignFile records
//             await this.createOrderDesignFiles(order, allColorFiles);

//             // Mark item as auto-delivered
//             const colorNames = colorCustomizations.map(c => c.name).join(', ');
//             await order.markItemAsAutoDelivered(itemIndex, `تم التوصيل التلقائي - ملفات الألوان: ${colorNames} (${allColorFiles.length} ملف)`);

//             return 'auto_delivered';
//         } else {
//             console.log('❌ Missing some color variant files');
//             const missingColors = colorCustomizations.map(c => c.name).join(', ');
//             await order.markItemAsAwaitingCustomization(itemIndex, `ملفات الألوان المطلوبة غير متوفرة: ${missingColors}`);
//             return 'awaiting_customization';
//         }
//     }

//     /**
//      * Create OrderDesignFile records for files
//      */
//     private static async createOrderDesignFiles(order: IOrder, files: any[]): Promise<void> {
//         console.log(`📁 Creating ${files.length} OrderDesignFile records`);

//         const operations = files.map(file => ({
//             updateOne: {
//                 filter: { orderId: order._id, designFileId: file._id },
//                 update: {
//                     $setOnInsert: {
//                         orderId: order._id,
//                         designFileId: file._id,
//                         downloadCount: 0,
//                         lastDownloadedAt: null,
//                         isActive: true
//                     }
//                 },
//                 upsert: true,
//             }
//         }));

//         if (operations.length > 0) {
//             await OrderDesignFile.bulkWrite(operations);
//         }

//         console.log('✅ OrderDesignFile records created or verified successfully');
//     }

//     /**
//      * Check if item has real customizations (not just color selections)
//      */
//     private static hasRealCustomizations(item: any): boolean {
//         // Only check for actual customizations (text changes, uploads, notes)
//         return item.customizations && (
//             (item.customizations.textChanges && item.customizations.textChanges.length > 0) ||
//             (item.customizations.uploadedImages && item.customizations.uploadedImages.length > 0) ||
//             (item.customizations.uploadedLogo && item.customizations.uploadedLogo.url && item.customizations.uploadedLogo.url.trim().length > 0) ||
//             (item.customizations.customizationNotes && item.customizations.customizationNotes.trim().length > 0)
//         );
//     }

//     /**
//      * Send delivery notification emails based on the delivery result
//      */
//     static async sendDeliveryNotifications(order: IOrder, deliveryResult: DeliveryResult): Promise<void> {
//         try {
//             const isFreeOrder = order.paymentStatus === 'free';

//             // Case 1: All items auto-delivered (order is complete)
//             if (deliveryResult.orderCompleted) {
//                 console.log('📧 Case 1: All items auto-delivered. Sending completion email.');
//                 await this.sendCompletedOrderEmail(order, isFreeOrder);
//                 return;
//             }

//             // Case 2 & 3: Mixed order or all items need customization
//             const awaitingCustomizationItems = order.items.filter(item => item.deliveryStatus === 'awaiting_customization');

//             if (awaitingCustomizationItems.length > 0) {
//                  console.log(`📧 Case 2/3: ${awaitingCustomizationItems.length} items need customization. Sending 'under review' email.`);

//                 if(isFreeOrder) {
//                     // Send "Under Review" email for free orders needing customization
//                      await EmailService.sendFreeOrderUnderReviewEmail(order.customerEmail, {
//                         orderNumber: order.orderNumber,
//                         customerName: order.customerName,
//                         orderId: order._id.toString(),
//                         createdAt: order.createdAt,
//                     });
//                 } else {
//                     // Send "Customization Processing" for paid orders needing customization
//                     const customWorkItems = awaitingCustomizationItems.map(item => ({
//                         productName: item.productName,
//                         quantity: item.quantity
//                     }));

//                     await EmailService.sendCustomizationProcessingEmail(order.customerEmail, {
//                         orderNumber: order.orderNumber,
//                         customerName: order.customerName,
//                         customWorkItems: customWorkItems,
//                     });
//                 }
//             }

//         } catch (error) {
//             console.error('❌ Error sending delivery notifications:', error);
//         }
//     }

//      /**
//      * Helper to send the correct "completed" email (free or paid)
//      */
//     private static async sendCompletedOrderEmail(order: IOrder, isFreeOrder: boolean): Promise<void> {
//         const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
//         const orderDesignFiles = await OrderDesignFile.find({ orderId: order._id })
//             .populate('designFileId')
//             .lean();

//         const downloadLinks = orderDesignFiles.map((odf: any) => ({
//             fileName: odf.designFileId.fileName,
//             fileUrl: `${baseUrl}/api/design-files/${odf.designFileId._id}/download`,
//             fileSize: odf.designFileId.fileSize,
//             fileType: odf.designFileId.fileType,
//         }));

//         if (isFreeOrder) {
//             await EmailService.sendFreeOrderCompletedEmail(order.customerEmail, {
//                 orderNumber: order.orderNumber,
//                 customerName: order.customerName,
//                 downloadLinks: downloadLinks,
//             });
//         } else {
//             const downloadExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
//             order.downloadExpiry = downloadExpiry;
//             await order.save();

//             await EmailService.sendOrderCompletedEmail(order.customerEmail, {
//                 orderNumber: order.orderNumber,
//                 customerName: order.customerName,
//                 downloadLinks: downloadLinks,
//                 downloadExpiry: downloadExpiry,
//                 totalPrice: order.totalPrice,
//             });
//         }
//     }
// }
/**
 * Item Delivery Service
 *
 * This service handles item-level delivery processing for orders.
 * It processes each item individually and marks them as delivered or awaiting customization.
 *
 * Features:
 * - Item-level delivery state management
 * - Automatic file delivery for available items
 * - Custom work tracking for items requiring customization
 * - Mixed order handling
 * - Order completion when all items are delivered
 */

import { IOrder } from '@/lib/db/models/Order';
import { OrderDesignFile } from '@/lib/db/models';
import { EmailService } from './emailService';
import { DesignFile as DesignFileModel } from '@/lib/db/models';


export interface DeliveryResult {
    autoDeliveredItems: number;
    awaitingCustomizationItems: number;
    totalItems: number;
    orderCompleted: boolean;
}

export class ItemDeliveryService {
    /**
     * Process delivery for all items in an order
     */
    static async processOrderDelivery(order: IOrder): Promise<DeliveryResult> {
        try {
            console.log('🔄 Processing item-level delivery for order:', order.orderNumber);
            const DesignFile = DesignFileModel;
            let autoDeliveredCount = 0;
            let awaitingCustomizationCount = 0;

            for (let i = 0; i < order.items.length; i++) {
                const itemResult = await this.processItemDelivery(order, i, DesignFile);

                if (itemResult === 'auto_delivered') {
                    autoDeliveredCount++;
                } else if (itemResult === 'awaiting_customization') {
                    awaitingCustomizationCount++;
                }
            }

            const allItemsProcessed = (autoDeliveredCount + awaitingCustomizationCount) === order.items.length;
            const orderCompleted = allItemsProcessed && awaitingCustomizationCount === 0;

            if (orderCompleted) {
                order.orderStatus = 'completed';
                order.customizationStatus = 'completed';
                await order.save();
                console.log('✅ Order fully auto-delivered and marked as completed.');
            } else if (awaitingCustomizationCount > 0) {
                order.orderStatus = 'awaiting_customization';
                order.customizationStatus = 'pending';
                await order.save();
                console.log('🎨 Order has items awaiting customization.');
            }


            console.log(`✅ Delivery processing complete: ${autoDeliveredCount} auto-delivered, ${awaitingCustomizationCount} awaiting customization`);

            return {
                autoDeliveredItems: autoDeliveredCount,
                awaitingCustomizationItems: awaitingCustomizationCount,
                totalItems: order.items.length,
                orderCompleted
            };

        } catch (error) {
            console.error('❌ Error processing order delivery:', error);
            throw error;
        }
    }

    /**
     * Process delivery for a single item
     */
    private static async processItemDelivery(order: IOrder, itemIndex: number, DesignFile: any): Promise<'auto_delivered' | 'awaiting_customization'> {
        const item = order.items[itemIndex];

        if (item.EnableCustomizations === false) {
            return await this.processNonCustomizableItem(order, itemIndex, DesignFile);
        }

        const hasRealCustomizations = this.hasRealCustomizations(item);
        if (hasRealCustomizations) {
            await order.markItemAsAwaitingCustomization(itemIndex, 'يحتاج تخصيص مخصص');
            return 'awaiting_customization';
        }

        return await this.processCustomizableItem(order, itemIndex, DesignFile);
    }

    /**
     * Process non-customizable item (always auto-deliver if files exist)
     */
    private static async processNonCustomizableItem(order: IOrder, itemIndex: number, DesignFile: any): Promise<'auto_delivered' | 'awaiting_customization'> {
        const item = order.items[itemIndex];
        const { Types } = await import('mongoose');
        const productObjectId = typeof item.productId === 'string' ? new Types.ObjectId(item.productId) : item.productId;

        const colorCustomizations = item.customizations?.colors;
        if (colorCustomizations && colorCustomizations.length > 0) {
            return await this.processColorVariantFiles(order, itemIndex, DesignFile, productObjectId, colorCustomizations);
        }

        // --- START OF FIX ---
        // Ensure we only find GENERAL product files, NOT order-specific files.
        const generalFiles = await DesignFile.find({
            productId: productObjectId,
            isColorVariant: false,
            isForOrder: false, // CRITICAL: Exclude files meant for specific orders.
            isActive: true
        }).lean();
        // --- END OF FIX ---

        if (generalFiles.length > 0) {
            await this.createOrderDesignFiles(order, generalFiles);
            await order.markItemAsAutoDelivered(itemIndex, `تم التوصيل التلقائي - ${generalFiles.length} ملف متاح`);
            return 'auto_delivered';
        } else {
            await order.markItemAsAwaitingCustomization(itemIndex, 'لا توجد ملفات متاحة - يحتاج إضافة ملفات');
            return 'awaiting_customization';
        }
    }

    /**
     * Process customizable item (check for predefined color variants or general files)
     */
    private static async processCustomizableItem(order: IOrder, itemIndex: number, DesignFile: any): Promise<'auto_delivered' | 'awaiting_customization'> {
        const item = order.items[itemIndex];
        const { Types } = await import('mongoose');
        const productObjectId = typeof item.productId === 'string' ? new Types.ObjectId(item.productId) : item.productId;

        const colorCustomizations = item.customizations?.colors;
        if (!colorCustomizations || colorCustomizations.length === 0) {
            return await this.processGeneralFiles(order, itemIndex, DesignFile, productObjectId);
        } else {
            return await this.processColorVariantFiles(order, itemIndex, DesignFile, productObjectId, colorCustomizations);
        }
    }

    /**
     * Process general files for customizable item
     */
    private static async processGeneralFiles(order: IOrder, itemIndex: number, DesignFile: any, productObjectId: any): Promise<'auto_delivered' | 'awaiting_customization'> {
        // --- START OF FIX ---
        // Ensure we only find GENERAL product files, NOT order-specific files.
        const generalFiles = await DesignFile.find({
            productId: productObjectId,
            isColorVariant: false,
            isForOrder: false, // CRITICAL: Exclude files meant for specific orders.
            isActive: true
        }).lean();
        // --- END OF FIX ---

        if (generalFiles.length > 0) {
            await this.createOrderDesignFiles(order, generalFiles);
            await order.markItemAsAutoDelivered(itemIndex, `تم التوصيل التلقائي - ${generalFiles.length} ملف عام متاح`);
            return 'auto_delivered';
        } else {
            await order.markItemAsAwaitingCustomization(itemIndex, 'لا توجد ملفات عامة متاحة - يحتاج إضافة ملفات');
            return 'awaiting_customization';
        }
    }

    /**
     * Process color variant files for customizable item
     */
    private static async processColorVariantFiles(order: IOrder, itemIndex: number, DesignFile: any, productObjectId: any, colorCustomizations: any[]): Promise<'auto_delivered' | 'awaiting_customization'> {
        let hasAllColorFiles = true;
        const allColorFiles = [];

        for (const color of colorCustomizations) {
            // --- START OF FIX ---
            // Ensure we only find GENERAL color variant files, NOT order-specific files.
            const colorFiles = await DesignFile.find({
                productId: productObjectId,
                colorVariantHex: color.hex,
                isColorVariant: true,
                isForOrder: false, // CRITICAL: Exclude files meant for specific orders.
                isActive: true
            }).lean();
            // --- END OF FIX ---

            if (colorFiles.length === 0) {
                hasAllColorFiles = false;
                break;
            }
            allColorFiles.push(...colorFiles);
        }

        if (hasAllColorFiles) {
            await this.createOrderDesignFiles(order, allColorFiles);
            const colorNames = colorCustomizations.map(c => c.name).join(', ');
            await order.markItemAsAutoDelivered(itemIndex, `تم التوصيل التلقائي - ملفات الألوان: ${colorNames} (${allColorFiles.length} ملف)`);
            return 'auto_delivered';
        } else {
            const missingColors = colorCustomizations.map(c => c.name).join(', ');
            await order.markItemAsAwaitingCustomization(itemIndex, `ملفات الألوان المطلوبة غير متوفرة: ${missingColors}`);
            return 'awaiting_customization';
        }
    }

    /**
     * Create OrderDesignFile records for files
     */
    private static async createOrderDesignFiles(order: IOrder, files: any[]): Promise<void> {
        console.log(`📁 Creating ${files.length} OrderDesignFile records`);

        const operations = files.map(file => ({
            updateOne: {
                filter: { orderId: order._id, designFileId: file._id },
                update: {
                    $setOnInsert: {
                        orderId: order._id,
                        designFileId: file._id,
                        downloadCount: 0,
                        lastDownloadedAt: null,
                        isActive: true
                    }
                },
                upsert: true,
            }
        }));

        if (operations.length > 0) {
            await OrderDesignFile.bulkWrite(operations);
        }
    }

    /**
     * Check if item has real customizations (not just color selections)
     */
    private static hasRealCustomizations(item: any): boolean {
        return item.customizations && (
            (item.customizations.textChanges && item.customizations.textChanges.length > 0) ||
            (item.customizations.uploadedImages && item.customizations.uploadedImages.length > 0) ||
            (item.customizations.uploadedLogo && item.customizations.uploadedLogo.url && item.customizations.uploadedLogo.url.trim().length > 0) ||
            (item.customizations.customizationNotes && item.customizations.customizationNotes.trim().length > 0)
        );
    }

    /**
     * Send delivery notification emails based on the delivery result
     */
    static async sendDeliveryNotifications(order: IOrder, deliveryResult: DeliveryResult): Promise<void> {
        try {
            const isFreeOrder = order.paymentStatus === 'free';

            if (deliveryResult.orderCompleted) {
                await this.sendCompletedOrderEmail(order, isFreeOrder);
                return;
            }

            const awaitingCustomizationItems = order.items.filter(item => item.deliveryStatus === 'awaiting_customization');
            if (awaitingCustomizationItems.length > 0) {
                if (isFreeOrder) {
                    await EmailService.sendFreeOrderUnderReviewEmail(order.customerEmail, {
                        orderNumber: order.orderNumber,
                        customerName: order.customerName,
                        orderId: order._id.toString(),
                        createdAt: order.createdAt,
                    });
                } else {
                    const customWorkItems = awaitingCustomizationItems.map(item => ({
                        productName: item.productName,
                        quantity: item.quantity
                    }));

                    await EmailService.sendCustomizationProcessingEmail(order.customerEmail, {
                        orderNumber: order.orderNumber,
                        customerName: order.customerName,
                        customWorkItems: customWorkItems,
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error sending delivery notifications:', error);
        }
    }

    /**
     * Helper to send the correct "completed" email (free or paid)
     */
    private static async sendCompletedOrderEmail(order: IOrder, isFreeOrder: boolean): Promise<void> {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const orderDesignFiles = await OrderDesignFile.find({ orderId: order._id })
            .populate('designFileId')
            .lean();

        const downloadLinks = orderDesignFiles.map((odf: any) => ({
            fileName: odf.designFileId.fileName,
            fileUrl: `${baseUrl}/api/design-files/${odf.designFileId._id}/download`,
            fileSize: odf.designFileId.fileSize,
            fileType: odf.designFileId.fileType,
        }));

        if (isFreeOrder) {
            await EmailService.sendFreeOrderCompletedEmail(order.customerEmail, {
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                downloadLinks: downloadLinks,
            });
        } else {
            const downloadExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            order.downloadExpiry = downloadExpiry;
            await order.save();

            await EmailService.sendOrderCompletedEmail(order.customerEmail, {
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                downloadLinks: downloadLinks,
                downloadExpiry: downloadExpiry,
                totalPrice: order.totalPrice,
            });
        }
    }
}