/**
 * 
 * 
 * This file handles design file downloads for customers.
 * 
 * Routes:
 * - GET /api/design-files/[id]/download - Download a specific design file
 * 
 * Features:
 * - Customer authentication required
 * - Order-based access control
 * - Download tracking
 * - Temporary download URLs
 * - Security validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import DesignFile from '@/lib/db/models/DesignFile';
import OrderDesignFile from '@/lib/db/models/OrderDesignFile';
import connectDB from '@/lib/db/connection';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import Order from '@/lib/db/models/Order';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { id: designFileId } = await params;

        // Find the design file
        const designFile = await DesignFile.findById(designFileId);
        if (!designFile) {
            return NextResponse.json({ error: 'Design file not found' }, { status: 404 });
        }

        // Check if file is active
        if (!designFile.isActive) {
            return NextResponse.json({ error: 'Design file is not available' }, { status: 404 });
        }

        // Check if file has expired
        if (designFile.expiresAt && new Date() > designFile.expiresAt) {
            return NextResponse.json({ error: 'Design file has expired' }, { status: 410 });
        }

        // For admin users, allow direct access
        if (session.user.role === 'admin') {
            return await serveFile(designFile);
        }
        console.log('session.user.id :>> ', session.user.id);

        // First, let's check if the design file belongs directly to any of the user's orders
        const userOrderIds = await getUserOrderIds(session.user.id);
        console.log('User order IDs:', userOrderIds);

        // Check if the design file is directly attached to any of the user's orders
        const orderWithFile = await Order.findOne({
            _id: { $in: userOrderIds },
            $or: [
                { 'designFiles._id': designFileId },
                { 'items.designFiles._id': designFileId }
            ]
        });

        console.log('Order with file found:', !!orderWithFile);

        if (orderWithFile) {
            // User has access through direct order attachment
            return await serveFile(designFile);
        }

        // For customers, check if they have access to this file through an order
        const orderDesignFile = await OrderDesignFile.findOne({
            designFileId: designFileId,
            orderId: { $in: userOrderIds },
            isActive: true
        });

        console.log('OrderDesignFile found:', !!orderDesignFile);

        if (!orderDesignFile) {
            console.log('Access denied - no OrderDesignFile found for user:', session.user.id, 'designFile:', designFileId);
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check if customer's access has expired (only if using OrderDesignFile)
        if (orderDesignFile && orderDesignFile.expiresAt && new Date() > orderDesignFile.expiresAt) {
            return NextResponse.json({ error: 'Your access to this file has expired' }, { status: 410 });
        }

        // Check download limits (only if using OrderDesignFile)
        if (orderDesignFile && designFile.maxDownloads && orderDesignFile.downloadCount >= designFile.maxDownloads) {
            return NextResponse.json({ error: 'Download limit reached' }, { status: 429 });
        }

        // Increment download count (only if using OrderDesignFile)
        if (orderDesignFile) {
            orderDesignFile.downloadCount += 1;
            orderDesignFile.lastDownloadedAt = new Date();
            if (!orderDesignFile.firstDownloadedAt) {
                orderDesignFile.firstDownloadedAt = new Date();
            }
            await orderDesignFile.save();
        }

        // Serve the file
        return await serveFile(designFile);

    } catch (error) {
        console.error('Error downloading design file:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

interface DesignFile {
    _id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
}

async function serveFile(designFile: DesignFile) {
    try {
        // Convert URL to file path
        // const filePath = path.join(process.cwd(), 'public', designFile.fileUrl.substring(1));
        const projectRoot = path.join(process.cwd());
        const filePath = path.join(projectRoot, 'public', designFile.fileUrl.substring(1));
        console.log('Attempting to serve file from:', filePath);
        // Check if file exists
        try {
            await stat(filePath);
        } catch (fileError) {
            console.error('File not found:', filePath, fileError);
            return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
        }

        // Read file
        const fileBuffer = await readFile(filePath);

        // Handle Arabic and special characters in filename
        // Use RFC 6266 encoding for non-ASCII filenames
        const sanitizedFileName = designFile.fileName.replace(/[^\w\s\-_.]/g, '');
        const encodedFileName = encodeURIComponent(designFile.fileName);

        // Set appropriate headers
        const headers = new Headers();
        headers.set('Content-Type', designFile.mimeType || 'application/octet-stream');

        // Use RFC 6266 standard for Unicode filenames
        headers.set('Content-Disposition',
            `attachment; filename="${sanitizedFileName}"; filename*=UTF-8''${encodedFileName}`
        );

        headers.set('Content-Length', fileBuffer.length.toString());
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        headers.set('Pragma', 'no-cache');
        headers.set('Expires', '0');

        return new Response(new Uint8Array(fileBuffer), {
            status: 200,
            headers
        });

    } catch (error) {
        console.error('Error serving file:', error);
        return NextResponse.json(
            { error: 'Error serving file' },
            { status: 500 }
        );
    }
}

async function getUserOrderIds(userId: string): Promise<string[]> {
    try {
        const orders = await Order.find({
            customerId: userId,
            orderStatus: { $in: ['completed', 'processing', 'awaiting_customization', 'under_customization'] },
            paymentStatus: { $in: ['paid', 'free'] }
        }).select('_id');

        console.log('Found orders for user:', userId, '- count:', orders.length);
        return orders.map(order => order._id.toString());
    } catch (error) {
        console.error('Error getting user order IDs:', error);
        return [];
    }
} 