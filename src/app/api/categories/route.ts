import { NextRequest, NextResponse } from 'next/server';
import Category from '@/lib/db/models/Category';
import connectDB from '@/lib/db/connection';

/**
 * GET /api/categories
 * Public endpoint to get all active categories for customer navigation
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        // Get query parameters for filtering
        const { searchParams } = new URL(request.url);
        const featured = searchParams.get('featured');
        const limit = searchParams.get('limit');

        // Build query
        let query: any = { isActive: true };

        if (featured === 'true') {
            query.isFeatured = true;
        }

        // Execute query
        let categoriesQuery = Category.find(query).sort({ order: 1 });

        if (limit) {
            categoriesQuery = categoriesQuery.limit(parseInt(limit));
        }

        const categories = await categoriesQuery.lean();

        // Transform data for customer use (remove sensitive fields)
        const transformedCategories = categories.map(category => ({
            _id: category._id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            image: category.image,
            icon: category.icon,
            color: category.color,
            order: category.order,
            isFeatured: category.isFeatured,
            designCount: category.designCount,
            viewCount: category.viewCount
        }));

        return NextResponse.json({
            success: true,
            data: transformedCategories,
            count: transformedCategories.length
        });

    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch categories',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
