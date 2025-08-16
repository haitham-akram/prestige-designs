import { NextResponse } from 'next/server';
import { DesignFile } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';

export async function GET() {
    try {
        await connectDB();
        
        // Check all design files
        const allFiles = await DesignFile.find({}).lean();
        console.log('Total design files:', allFiles.length);
        
        // Check color variant files for red
        const redColorFiles = await DesignFile.find({
            isColorVariant: true,
            colorVariantHex: '#f50000'
        }).lean();
        
        console.log('Red color variant files:', redColorFiles.length);
        
        // Check all color variant files
        const allColorFiles = await DesignFile.find({
            isColorVariant: true
        }).lean();
        
        return NextResponse.json({
            success: true,
            data: {
                totalFiles: allFiles.length,
                redColorFiles: redColorFiles.length,
                totalColorVariantFiles: allColorFiles.length,
                redFiles: redColorFiles.map(file => ({
                    fileName: file.fileName,
                    productId: file.productId,
                    colorName: file.colorVariantName,
                    colorHex: file.colorVariantHex,
                    isActive: file.isActive
                })),
                allColorVariants: allColorFiles.map(file => ({
                    fileName: file.fileName,
                    productId: file.productId,
                    colorName: file.colorVariantName,
                    colorHex: file.colorVariantHex,
                    isActive: file.isActive
                }))
            }
        });
        
    } catch (error) {
        console.error('Error fetching design files:', error);
        return NextResponse.json({
            error: 'Failed to fetch design files'
        }, { status: 500 });
    }
}
