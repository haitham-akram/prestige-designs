/**
 * Public Products API Routes
 * 
 * This file handles public product operations for customers.
 * 
 * Routes:
 * - GET /api/products - List active products with pagination and filtering
 * 
 * Features:
 * - Public access (no authentication required)
 * - Active products only
 * - Advanced filtering and search
 * - Pagination support
 * - Category filtering
 * - Price range filtering
 * - Featured products
 * - Search functionality
 * - Sorting options
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { Product } from '@/lib/db/models'

export async function GET(request: NextRequest) {
    try {
        await connectDB()

        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const limit = parseInt(searchParams.get('limit') || '10')
        const page = parseInt(searchParams.get('page') || '1')
        const isActive = searchParams.get('isActive')
        const isFeatured = searchParams.get('isFeatured')

        // Build filter object
        const filter: any = {}

        if (category) {
            // Find category by slug first
            const Category = (await import('@/lib/db/models/Category')).default
            const categoryDoc = await Category.findOne({ slug: category })
            if (categoryDoc) {
                filter.categoryId = categoryDoc._id
            }
        }

        if (isActive !== null) {
            filter.isActive = isActive === 'true'
        }

        if (isFeatured !== null) {
            filter.isFeatured = isFeatured === 'true'
        }

        // Calculate skip for pagination
        const skip = (page - 1) * limit

        // Execute query
        const [products, total] = await Promise.all([
            Product.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(filter)
        ])

        const totalPages = Math.ceil(total / limit)

        return NextResponse.json({
            success: true,
            data: products,
            pagination: {
                page,
                limit,
                total,
                pages: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        })

    } catch (error) {
        console.error('Get products error:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch products'
            },
            { status: 500 }
        )
    }
} 