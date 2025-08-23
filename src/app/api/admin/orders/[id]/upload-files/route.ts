// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth/config';
// import { Order, OrderDesignFile, DesignFile } from '@/lib/db/models';
// import connectDB from '@/lib/db/connection';
// import { FileUtils, UploadOptions } from '@/lib/utils/fileUtils';

// export async function POST(
//     request: NextRequest,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     try {
//         console.log('🚀 Starting file upload process...');

//         // Check admin authentication
//         const session = await getServerSession(authOptions);
//         if (!session?.user?.role || session.user.role !== 'admin') {
//             console.log('❌ Unauthorized access attempt');
//             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//         }

//         console.log('✅ Admin authenticated:', session.user.email);

//         await connectDB();
//         console.log('✅ Database connected');

//         const { id: orderId } = await params;
//         console.log('📦 Order ID:', orderId);

//         // Find the order
//         const order = await Order.findById(orderId);
//         if (!order) {
//             console.log('❌ Order not found:', orderId);
//             return NextResponse.json({ error: 'Order not found' }, { status: 404 });
//         }

//         console.log('✅ Order found:', order.orderNumber);
//         console.log('📋 Order has customizable products:', order.hasCustomizableProducts);

//         // Check if order has customizations
//         if (!order.hasCustomizableProducts) {
//             console.log('❌ Order does not require custom design files');
//             return NextResponse.json(
//                 { error: 'This order does not require custom design files' },
//                 { status: 400 }
//             );
//         }

//         // Parse request body
//         const contentType = request.headers.get('content-type');
//         let productId: string;
//         let colorName: string;
//         let description: string;
//         let files: Array<{
//             fileName: string;
//             fileUrl: string;
//             fileType: string;
//             fileSize: number;
//         }>;

//         if (contentType?.includes('application/json')) {
//             // JSON request (files already uploaded)
//             const body = await request.json();
//             productId = body.productId;
//             colorName = body.colorName;
//             description = body.description;
//             files = body.files || [];

//             console.log('📁 Files data received:', files.length);
//             console.log('🏷️ Product ID:', productId);
//             console.log('🎨 Color name:', colorName);
//             console.log('📝 Description:', description);
//         } else {
//             // Form data request (legacy)
//             const formData = await request.formData();
//             const formFiles = formData.getAll('files') as File[];
//             productId = formData.get('productId') as string;
//             colorName = formData.get('colorName') as string;
//             description = formData.get('notes') as string;

//             console.log('📁 Form files received:', formFiles.length);
//             console.log('🏷️ Product ID:', productId);
//             console.log('🎨 Color name:', colorName);
//             console.log('📝 Description:', description);

//             if (!formFiles || formFiles.length === 0) {
//                 console.log('❌ No files provided');
//                 return NextResponse.json(
//                     { error: 'No files provided' },
//                     { status: 400 }
//                 );
//             }

//             // Convert form files to file data
//             files = await Promise.all(formFiles.map(async (file) => {
//                 const bytes = await file.arrayBuffer();
//                 const buffer = Buffer.from(bytes);

//                 // Create upload options
//                 const uploadOptions: UploadOptions = {
//                     orderId,
//                     productId,
//                     colorName: colorName || undefined
//                 };

//                 // Upload file using FileUtils
//                 const uploadResult = await FileUtils.uploadDesignFile(
//                     buffer,
//                     file.name,
//                     uploadOptions
//                 );

//                 return {
//                     fileName: uploadResult.fileName,
//                     fileUrl: uploadResult.fileUrl,
//                     fileType: FileUtils.getFileExtension(file.name).substring(1),
//                     fileSize: uploadResult.fileSize
//                 };
//             }));
//         }

//         if (!productId) {
//             console.log('❌ Product ID is required');
//             return NextResponse.json(
//                 { error: 'Product ID is required' },
//                 { status: 400 }
//             );
//         }

//         // Find the order item
//         const orderItem = order.items.find(item => item.productId === productId);
//         if (!orderItem) {
//             return NextResponse.json(
//                 { error: 'Product not found in this order' },
//                 { status: 400 }
//             );
//         }

//         const uploadedFiles: Array<{
//             id: string;
//             fileName: string;
//             fileUrl: string;
//             fileSize: number;
//             uploadedAt: Date;
//         }> = [];

//         // Process each file (already uploaded or need to be uploaded)
//         for (const fileData of files) {
//             try {
//                 console.log(`📤 Processing file: ${fileData.fileName} (${fileData.fileSize} bytes)`);
//                 console.log(`🔗 File URL: ${fileData.fileUrl}`);
//                 console.log(`📁 File type: ${fileData.fileType}`);

//                 // Create design file record
//                 console.log('💾 Creating design file record...');
//                 console.log('🔧 Creating DesignFile with data:', {
//                     productId,
//                     fileName: fileData.fileName,
//                     fileUrl: fileData.fileUrl,
//                     fileType: fileData.fileType,
//                     fileSize: fileData.fileSize,
//                     mimeType: FileUtils.getMimeType(fileData.fileName),
//                     description: description || `Custom design for order ${order.orderNumber}`,
//                     createdBy: session.user.id || 'admin'
//                 });

//                 const designFile = new DesignFile({
//                     productId: productId,
//                     fileName: fileData.fileName,
//                     fileUrl: fileData.fileUrl,
//                     fileType: fileData.fileType,
//                     fileSize: fileData.fileSize,
//                     mimeType: FileUtils.getMimeType(fileData.fileName),
//                     description: description || `Custom design for order ${order.orderNumber}`,
//                     isActive: true,
//                     isPublic: false, // Private files for orders
//                     maxDownloads: 10, // Allow 10 downloads per customer
//                     expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
//                     createdBy: session.user.id || 'admin'
//                 });

//                 console.log('💾 Attempting to save DesignFile...');
//                 await designFile.save();
//                 console.log('✅ Design file saved to database:', designFile._id);

//                 // Create order-design file relationship
//                 console.log('🔗 Creating order-design file relationship...');
//                 const orderDesignFile = new OrderDesignFile({
//                     orderId: orderId,
//                     designFileId: designFile._id,
//                     downloadCount: 0,
//                     isActive: true,
//                     expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for customer access
//                 });

//                 await orderDesignFile.save();
//                 console.log('✅ Order-design file relationship saved');

//                 uploadedFiles.push({
//                     id: designFile._id,
//                     fileName: designFile.fileName,
//                     fileUrl: designFile.fileUrl,
//                     fileSize: designFile.fileSize,
//                     uploadedAt: designFile.createdAt
//                 });

//             } catch (uploadError) {
//                 console.error('Error processing file:', uploadError);
//                 return NextResponse.json(
//                     { error: `Failed to process file ${fileData.fileName}` },
//                     { status: 500 }
//                 );
//             }
//         }

//         // Update order status to processing (admin will manually mark as complete later)
//         // Only update the specific fields we need, don't touch uploadedImages
//         const updateData = {
//             customizationStatus: 'processing',
//             orderStatus: 'processing',
//             $push: {
//                 orderHistory: {
//                     status: 'files_uploaded',
//                     timestamp: new Date(),
//                     note: `تم رفع ملفات التصميم للطلب ${order.orderNumber}`,
//                     changedBy: session.user.name || 'admin'
//                 }
//             }
//         };

//         await Order.findByIdAndUpdate(orderId, updateData, { new: true });

//         // Update the local order object for response
//         order.customizationStatus = 'processing';
//         order.orderStatus = 'processing';

//         console.log('🎉 All files uploaded successfully!');
//         console.log('📊 Final response:', {
//             message: 'Files uploaded successfully',
//             filesCount: uploadedFiles.length,
//             orderStatus: order.orderStatus,
//             customizationStatus: order.customizationStatus
//         });

//         return NextResponse.json({
//             message: 'Files uploaded successfully',
//             files: uploadedFiles,
//             orderStatus: order.orderStatus,
//             customizationStatus: order.customizationStatus
//         });

//     } catch (error) {
//         console.error('Error uploading files:', error);
//         return NextResponse.json(
//             { error: 'Internal server error' },
//             { status: 500 }
//         );
//     }
// }

// export async function GET(
//     request: NextRequest,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     try {
//         // Check admin authentication
//         const session = await getServerSession(authOptions);
//         if (!session?.user?.role || session.user.role !== 'admin') {
//             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//         }

//         await connectDB();

//         const { id: orderId } = await params;

//         // Get all design files for this order
//         const orderDesignFiles = await OrderDesignFile.find({ orderId })
//             .populate<{ designFileId: { _id: string; fileName: string; fileUrl: string; fileSize: number; fileType: string; productId: string; description: string; createdAt: Date } }>('designFileId')
//             .lean();

//         const files = orderDesignFiles.map(odf => ({
//             id: odf.designFileId._id,
//             fileName: odf.designFileId.fileName,
//             fileUrl: odf.designFileId.fileUrl,
//             fileSize: odf.designFileId.fileSize,
//             fileType: odf.designFileId.fileType,
//             productId: odf.designFileId.productId,
//             description: odf.designFileId.description,
//             uploadedAt: odf.designFileId.createdAt,
//             downloadCount: odf.downloadCount,
//             lastDownloadedAt: odf.lastDownloadedAt,
//             expiresAt: odf.expiresAt
//         }));

//         return NextResponse.json({ files });

//     } catch (error) {
//         console.error('Error fetching order files:', error);
//         return NextResponse.json(
//             { error: 'Internal server error' },
//             { status: 500 }
//         );
//     }
// } 

// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth/config';
// import { Order, OrderDesignFile, DesignFile } from '@/lib/db/models';
// import connectDB from '@/lib/db/connection';
// import { FileUtils, UploadOptions } from '@/lib/utils/fileUtils';
// import mongoose from 'mongoose';


// export async function POST(
//     request: NextRequest,
//     { params }: { params: { id: string } }
// ) {
//     try {
//         const session = await getServerSession(authOptions);
//         if (!session?.user?.role || session.user.role !== 'admin') {
//             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//         }

//         await connectDB();
//         const { id: orderId } = params;
//         const order = await Order.findById(orderId);

//         if (!order) {
//             return NextResponse.json({ error: 'Order not found' }, { status: 404 });
//         }

//         const body = await request.json();
//         const { productId, colorName, description, files } = body;

//         if (!productId) {
//             return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
//         }
//         if (!files || files.length === 0) {
//             return NextResponse.json({ error: 'No files provided' }, { status: 400 });
//         }

//         const uploadedFiles: any[] = [];

//         for (const fileData of files) {
//             // --- START OF FIX ---
//             // Create a design file record specifically for this order
//             const designFile = new DesignFile({
//                 productId: new mongoose.Types.ObjectId(productId),
//                 orderId: new mongoose.Types.ObjectId(orderId), // Link to the specific order
//                 isForOrder: true, // Mark this file as order-specific
//                 fileName: fileData.fileName,
//                 fileUrl: fileData.fileUrl,
//                 fileType: fileData.fileType,
//                 fileSize: fileData.fileSize,
//                 mimeType: FileUtils.getMimeType(fileData.fileName),
//                 description: description || `ملف مخصص للطلب ${order.orderNumber}`,
//                 isActive: true,
//                 isPublic: false, // Order files should NEVER be public
//                 createdBy: session.user.id || 'admin',
//                 // Add color info if provided
//                 ...(colorName && {
//                     isColorVariant: true,
//                     colorVariantName: colorName,
//                 }),
//             });
//             // --- END OF FIX ---

//             await designFile.save();

//             // Create the link between the order and the new design file
//             const orderDesignFile = new OrderDesignFile({
//                 orderId: orderId,
//                 designFileId: designFile._id,
//             });
//             await orderDesignFile.save();

//             uploadedFiles.push({
//                 id: designFile._id,
//                 fileName: designFile.fileName,
//                 fileUrl: designFile.fileUrl,
//                 fileSize: designFile.fileSize,
//                 uploadedAt: designFile.createdAt,
//             });
//         }

//         // Update order status
//         order.customizationStatus = 'processing';
//         if (order.orderStatus !== 'processing') {
//             order.orderStatus = 'processing';
//         }

//         order.orderHistory.push({
//             status: 'files_uploaded',
//             timestamp: new Date(),
//             note: `تم رفع ${files.length} ملفات تصميم للطلب`,
//             changedBy: session.user.name || 'admin'
//         });

//         await order.save();

//         return NextResponse.json({
//             message: 'Files uploaded and linked to the order successfully',
//             files: uploadedFiles,
//             orderStatus: order.orderStatus,
//             customizationStatus: order.customizationStatus
//         });

//     } catch (error) {
//         console.error('Error uploading files for order:', error);
//         return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//     }
// }

// export async function GET(
//     request: NextRequest,
//     { params }: { params: { id: string } }
// ) {
//     try {
//         const session = await getServerSession(authOptions);
//         if (!session?.user?.role || session.user.role !== 'admin') {
//             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//         }

//         await connectDB();
//         const { id: orderId } = params;

//         const orderDesignFiles = await OrderDesignFile.find({ orderId })
//             .populate('designFileId')
//             .lean();

//         const files = orderDesignFiles.map((odf: any) => ({
//             id: odf.designFileId._id,
//             fileName: odf.designFileId.fileName,
//             fileUrl: odf.designFileId.fileUrl,
//             fileSize: odf.designFileId.fileSize,
//             fileType: odf.designFileId.fileType,
//             productId: odf.designFileId.productId,
//             description: odf.designFileId.description,
//             uploadedAt: odf.designFileId.createdAt,
//             downloadCount: odf.downloadCount,
//             lastDownloadedAt: odf.lastDownloadedAt,
//         }));

//         return NextResponse.json({ files });

//     } catch (error) {
//         console.error('Error fetching order files:', error);
//         return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//     }
// }


import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/config';
import { Order, DesignFile, OrderDesignFile } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';
import { FileUtils } from '@/lib/utils/fileUtils';
import { is } from 'zod/v4/locales';

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