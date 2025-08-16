import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';

export async function POST(request: NextRequest) {
    try {
        const { orderId } = await request.json();
        await connectDB();

        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        console.log('🧪 SIMPLIFIED DELIVERY TEST');
        console.log('Order:', order.orderNumber);
        console.log('Items:', order.items.length);

        const results = [];

        for (const item of order.items) {
            console.log('🔍 Processing item:', item.productName);
            console.log('  hasCustomizations:', item.hasCustomizations);
            console.log('  customizations:', JSON.stringify(item.customizations, null, 2));

            // Step 1: Check hasRealCustomizations logic
            console.log('  🔍 Detailed customizations analysis:');
            console.log('    item.hasCustomizations:', item.hasCustomizations, typeof item.hasCustomizations);
            console.log('    item.customizations:', item.customizations, typeof item.customizations);

            if (item.customizations) {
                console.log('    textChanges:', item.customizations.textChanges, 'length:', item.customizations.textChanges?.length);
                console.log('    uploadedImages:', item.customizations.uploadedImages, 'length:', item.customizations.uploadedImages?.length);
                console.log('    uploadedLogo:', item.customizations.uploadedLogo);
                console.log('    customizationNotes:', item.customizations.customizationNotes);
                console.log('    All keys in customizations:', Object.keys(item.customizations));
            }

            const textChangesCondition = item.customizations?.textChanges && item.customizations.textChanges.length > 0;
            const uploadedImagesCondition = item.customizations?.uploadedImages && item.customizations.uploadedImages.length > 0;
            const uploadedLogoCondition = item.customizations?.uploadedLogo;
            const customizationNotesCondition = item.customizations?.customizationNotes && item.customizations.customizationNotes.trim().length > 0;

            console.log('    textChanges condition:', textChangesCondition);
            console.log('    uploadedImages condition:', uploadedImagesCondition);
            console.log('    uploadedLogo condition:', uploadedLogoCondition);
            console.log('    customizationNotes condition:', customizationNotesCondition);

            const customizationsCondition = item.customizations && (
                textChangesCondition ||
                uploadedImagesCondition ||
                uploadedLogoCondition ||
                customizationNotesCondition
            );

            console.log('    overall customizations condition:', customizationsCondition);

            const hasRealCustomizations = item.hasCustomizations || customizationsCondition;

            console.log('  hasRealCustomizations result:', hasRealCustomizations);

            if (!hasRealCustomizations) {
                // Step 2: Check color customizations
                const colorCustomizations = item.customizations?.colors;
                console.log('  colorCustomizations:', JSON.stringify(colorCustomizations, null, 2));

                if (!colorCustomizations || colorCustomizations.length === 0) {
                    console.log('  ➡️ No color selections - checking general files');
                    results.push({
                        item: item.productName,
                        flow: 'general_files',
                        hasRealCustomizations,
                        colorCustomizations: null
                    });
                } else {
                    console.log('  ➡️ Has color selections - checking color variant files');

                    // Step 3: Check each color
                    const colorResults = [];
                    for (const color of colorCustomizations) {
                        console.log(`  🎨 Checking color: ${color.name} (${color.hex})`);

                        const DesignFile = (await import('@/lib/db/models')).DesignFile;
                        const colorFiles = await DesignFile.find({
                            productId: item.productId,
                            colorVariantHex: color.hex,
                            isColorVariant: true,
                            isActive: true
                        }).lean();

                        console.log(`  📁 Found ${colorFiles.length} files for color ${color.name}`);
                        colorResults.push({
                            color: color.name,
                            hex: color.hex,
                            filesFound: colorFiles.length
                        });
                    }

                    results.push({
                        item: item.productName,
                        flow: 'color_variant_files',
                        hasRealCustomizations,
                        colorCustomizations,
                        colorResults
                    });
                }
            } else {
                console.log('  ➡️ Has real customizations - requires custom work');
                results.push({
                    item: item.productName,
                    flow: 'custom_work',
                    hasRealCustomizations,
                    reason: 'Real customizations detected'
                });
            }
        }

        return NextResponse.json({
            success: true,
            orderNumber: order.orderNumber,
            testResults: results
        });

    } catch (error) {
        console.error('Error in simplified test:', error);
        return NextResponse.json({
            error: 'Test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
