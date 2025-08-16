import { NextResponse } from 'next/server';
import { OrderDesignFile } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';

export async function GET() {
    try {
        await connectDB();

        // Check OrderDesignFiles
        const orderDesignFiles = await OrderDesignFile.find({}).lean();
        console.log('Total OrderDesignFiles:', orderDesignFiles.length);

        return NextResponse.json({
            success: true,
            data: {
                totalOrderDesignFiles: orderDesignFiles.length,
                orderDesignFiles: orderDesignFiles.map(file => ({
                    orderId: file.orderId,
                    designFileId: file.designFileId,
                    downloadCount: file.downloadCount,
                    firstDownloadedAt: file.firstDownloadedAt,
                    lastDownloadedAt: file.lastDownloadedAt,
                    isActive: file.isActive,
                    createdAt: file.createdAt
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching OrderDesignFiles:', error);
        return NextResponse.json({
            error: 'Failed to fetch OrderDesignFiles'
        }, { status: 500 });
    }
}
