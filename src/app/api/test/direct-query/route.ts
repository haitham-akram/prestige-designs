import { NextResponse } from 'next/server';
import { DesignFile } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';

export async function GET() {
    try {
        await connectDB();

        // Direct query with the exact parameters from the failing order
        const productId = "68a05cee53797a6f2cee5d17";
        const colorHex = "#f50000";

        console.log('🔍 Direct query test');
        console.log('ProductId:', productId, typeof productId);
        console.log('ColorHex:', colorHex, typeof colorHex);

        // Test 1: Query as string
        const stringQuery = await DesignFile.find({
            productId: productId,
            colorVariantHex: colorHex,
            isColorVariant: true,
            isActive: true
        }).lean();

        console.log('String query result:', stringQuery.length);

        // Test 2: Query with ObjectId conversion
        const mongoose = await import('mongoose');
        const objectId = new mongoose.Types.ObjectId(productId);

        const objectIdQuery = await DesignFile.find({
            productId: objectId,
            colorVariantHex: colorHex,
            isColorVariant: true,
            isActive: true
        }).lean();

        console.log('ObjectId query result:', objectIdQuery.length);

        // Test 3: Query without color filter to see if files exist at all for this product
        const allProductFiles = await DesignFile.find({
            productId: productId
        }).lean();

        const allProductFilesObjectId = await DesignFile.find({
            productId: objectId
        }).lean();

        console.log('All files for product (string):', allProductFiles.length);
        console.log('All files for product (ObjectId):', allProductFilesObjectId.length);

        // Test 4: Show exact database records
        const sampleRecords = await DesignFile.find({
            isColorVariant: true
        }).limit(3).lean();

        return NextResponse.json({
            success: true,
            queryTest: {
                productIdInput: productId,
                colorHexInput: colorHex,
                stringQueryResults: stringQuery.length,
                objectIdQueryResults: objectIdQuery.length,
                allProductFilesString: allProductFiles.length,
                allProductFilesObjectId: allProductFilesObjectId.length,
                stringQueryFiles: stringQuery.map(f => ({
                    fileName: f.fileName,
                    productId: f.productId,
                    colorVariantHex: f.colorVariantHex,
                    productIdType: typeof f.productId
                })),
                objectIdQueryFiles: objectIdQuery.map(f => ({
                    fileName: f.fileName,
                    productId: f.productId,
                    colorVariantHex: f.colorVariantHex,
                    productIdType: typeof f.productId
                })),
                sampleDatabaseRecords: sampleRecords.map(f => ({
                    fileName: f.fileName,
                    productId: f.productId,
                    colorVariantHex: f.colorVariantHex,
                    isColorVariant: f.isColorVariant,
                    isActive: f.isActive,
                    productIdType: typeof f.productId,
                    productIdString: f.productId.toString()
                }))
            }
        });

    } catch (error) {
        console.error('Error in direct query test:', error);
        return NextResponse.json({
            error: 'Direct query test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
