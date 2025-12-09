import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/config';
import { Order, DesignFile, OrderDesignFile } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { FileUtils } from '@/lib/utils/fileUtils';

// You need to define the IDesignFile interface or import it if it's in another file
// This ensures TypeScript knows the shape of your populated document.
interface IDesignFile {
    _id: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;
    isForOrder: boolean;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    description?: string;
    createdAt: Date;
    colorVariantName?: string;
    // Add any other fields from your DesignFile model here
}

/**
 * Handles POST requests to upload new design files and create customer access records.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { id: orderId } = await params;

        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const body = await request.json();
        const { productId, colorName, description, files } = body;
        if (!productId || !files || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json({ error: 'Product ID and a valid files array are required' }, { status: 400 });
        }

        for (const fileData of files) {
            // Step 1: Create the main file asset record (DesignFile)
            // It's linked to the product AND the specific order.
            const designFile = new DesignFile({
                productId: new mongoose.Types.ObjectId(productId),
                orderId: new mongoose.Types.ObjectId(orderId), // Link to the order for internal tracking
                isForOrder: true,                              // Mark as an order-specific file
                fileName: fileData.fileName,
                fileUrl: fileData.fileUrl,
                fileType: fileData.fileType,
                fileSize: fileData.fileSize,
                mimeType: FileUtils.getMimeType(fileData.fileName),
                description: description || `ملف مخصص للطلب رقم ${order.orderNumber}`,
                isActive: true,
                isPublic: false,
                createdBy: session.user.id || 'admin',
                ...(colorName && { colorVariantName: colorName }),
            });
            await designFile.save();

            // Step 2: Create the customer access record (OrderDesignFile)
            // This links the order to the file asset and controls customer access.
            const orderDesignFile = new OrderDesignFile({
                orderId: order._id,
                designFileId: designFile._id,
                downloadCount: 0,
                isActive: true,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30-day access for customer
            });
            await orderDesignFile.save();
        }
        //here
        
        // Update order status
        order.customizationStatus = 'processing';
        if (order.orderStatus !== 'processing') {
            order.orderStatus = 'processing';
        }

        order.orderHistory.push({
            status: 'files_uploaded',
            timestamp: new Date(),
            note: `تم رفع ${files.length} ملفات تصميم للطلب`,
            changedBy: session.user.name || 'admin'
        });

        await order.save();
        return NextResponse.json({ message: `Successfully created files and access records for order ${order.orderNumber}` });

    } catch (error) {
        console.error('Error in POST /upload-files:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


/**
 * Handles GET requests to fetch all design files a customer has access to for an order.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { id: orderId } = await params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return NextResponse.json({ error: 'Invalid Order ID format' }, { status: 400 });
        }

        // Correct Logic: Find the "access tickets" and get the file details
        // 1. Find all OrderDesignFile documents for this order.
        // 2. Use .populate() to automatically fetch the full data for each linked DesignFile.
        const accessRecords = await OrderDesignFile.find({ orderId: orderId })
            .populate<{ designFileId: mongoose.Document<unknown, {}, IDesignFile> & IDesignFile }>('designFileId')
            .lean();

        // Filter out any records where the linked design file might have been deleted
        const validRecords = accessRecords.filter(record => record.designFileId);

        const files = validRecords.map(record => ({
            id: record.designFileId._id.toString(),
            fileName: record.designFileId.fileName,
            fileUrl: record.designFileId.fileUrl,
            fileSize: record.designFileId.fileSize,
            fileType: record.designFileId.fileType,
            productId: record.designFileId.productId.toString(),
            orderId: record.orderId.toString(),
            isForOrder: record.designFileId.isForOrder,
            description: record.designFileId.description,
            uploadedAt: record.designFileId.createdAt,
            colorName: record.designFileId.colorVariantName,
            downloadCount: record.downloadCount,
            accessExpiresAt: record.expiresAt,

        }));

        return NextResponse.json({ files });

    } catch (error) {
        console.error('Error fetching order files:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}