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

        const item = order.items[0]; // Get first item

        // Test each condition separately
        const hasCustomizations = item.hasCustomizations;
        const hasTextChanges = Boolean(item.customizations?.textChanges && item.customizations.textChanges.length > 0);
        const hasUploadedImages = Boolean(item.customizations?.uploadedImages && item.customizations.uploadedImages.length > 0);
        const hasUploadedLogo = Boolean(item.customizations?.uploadedLogo && item.customizations.uploadedLogo.url && item.customizations.uploadedLogo.url.trim().length > 0);
        const hasCustomizationNotes = Boolean(item.customizations?.customizationNotes && item.customizations.customizationNotes.trim().length > 0);

        const anyRealCustomizations = hasTextChanges || hasUploadedImages || hasUploadedLogo || hasCustomizationNotes;
        const hasRealCustomizations = hasCustomizations || anyRealCustomizations;

        return NextResponse.json({
            success: true,
            orderNumber: order.orderNumber,
            itemName: item.productName,
            debugging: {
                hasCustomizations,
                hasCustomizationsType: typeof hasCustomizations,
                hasTextChanges,
                hasUploadedImages,
                hasUploadedLogo,
                hasCustomizationNotes,
                anyRealCustomizations,
                hasRealCustomizations,
                hasRealCustomizationsType: typeof hasRealCustomizations,
                customizations: item.customizations,
                textChangesRaw: item.customizations?.textChanges,
                uploadedImagesRaw: item.customizations?.uploadedImages,
                uploadedLogoRaw: item.customizations?.uploadedLogo,
                customizationNotesRaw: item.customizations?.customizationNotes
            }
        });

    } catch (error) {
        console.error('Error in boolean test:', error);
        return NextResponse.json({
            error: 'Test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
