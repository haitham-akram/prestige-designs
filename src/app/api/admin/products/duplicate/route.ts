/**
 * Product Duplication API Route
 * 
 * POST /api/admin/products/duplicate
 * Creates a duplicate of an existing product with modified name and slug
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import { Product } from '@/lib/db/models';
import { generateSlug } from '@/lib/utils/productUtils';

export const POST = withAdmin(async (request: NextRequest) => {
    try {
        await connectDB();

        const { productId } = await request.json();

        if (!productId) {
            return NextResponse.json({
                success: false,
                message: 'معرف المنتج مطلوب'
            }, { status: 400 });
        }

        // Find the original product
        const originalProduct = await Product.findById(productId).populate('categoryId');

        if (!originalProduct) {
            return NextResponse.json({
                success: false,
                message: 'المنتج غير موجود'
            }, { status: 404 });
        }

        // Generate new name and slug with "copy" suffix
        const newName = `${originalProduct.name} copy`;
        let newSlug = generateSlug(`${originalProduct.slug}-copy`);

        // Ensure slug uniqueness
        let counter = 1;
        while (await Product.findOne({ slug: newSlug })) {
            newSlug = generateSlug(`${originalProduct.slug}-copy-${counter}`);
            counter++;
        }

        // Create duplicate product data
        const duplicateData = {
            name: newName,
            slug: newSlug,
            description: originalProduct.description,
            price: originalProduct.price,
            discountAmount: originalProduct.discountAmount,
            discountPercentage: originalProduct.discountPercentage,
            categoryId: originalProduct.categoryId, // Use categoryId directly
            images: originalProduct.images, // Copy image references
            youtubeLink: originalProduct.youtubeLink,
            isActive: false, // Start as inactive for review
            isFeatured: false, // Don't duplicate featured status

            // Copy customization settings
            EnableCustomizations: originalProduct.EnableCustomizations,
            allowColorChanges: originalProduct.allowColorChanges,
            allowTextEditing: originalProduct.allowTextEditing,
            allowImageReplacement: originalProduct.allowImageReplacement,
            allowLogoUpload: originalProduct.allowLogoUpload,

            // Copy color themes (but not the files - those would need manual re-upload)
            colors: originalProduct.colors?.map((color: { name: string; hex: string; description?: string }) => ({
                name: color.name,
                hex: color.hex,
                description: color.description
                // Note: uploadedFiles are not copied - admin needs to upload new files
            })) || [],

            // Don't copy design files - admin needs to upload new ones
            designFiles: [],

            // Reset counters
            purchaseCount: 0,
            views: 0
        };

        // Create the duplicate product
        const duplicateProduct = new Product(duplicateData);
        await duplicateProduct.save();

        // Populate the response
        await duplicateProduct.populate('categoryId');

        return NextResponse.json({
            success: true,
            message: 'تم تكرار المنتج بنجاح',
            data: {
                _id: duplicateProduct._id,
                name: duplicateProduct.name,
                slug: duplicateProduct.slug,
                originalProductId: productId
            }
        });

    } catch (error) {
        console.error('Error duplicating product:', error);
        return NextResponse.json({
            success: false,
            message: 'حدث خطأ أثناء تكرار المنتج'
        }, { status: 500 });
    }
});
