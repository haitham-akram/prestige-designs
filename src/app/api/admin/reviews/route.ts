import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import Review from '@/lib/db/models/Review'
import Product from '@/lib/db/models/Product'
import connectDB from '@/lib/db/connection'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await connectDB()

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const searchTerm = searchParams.get('search') || ''
        const statusFilter = searchParams.get('status') || 'all'
        const ratingFilter = searchParams.get('rating') || 'all'

        // Build query
        const query: any = {}

        // Search functionality
        if (searchTerm) {
            query.$or = [
                { customerName: { $regex: searchTerm, $options: 'i' } },
                { customerEmail: { $regex: searchTerm, $options: 'i' } },
                { title: { $regex: searchTerm, $options: 'i' } },
                { comment: { $regex: searchTerm, $options: 'i' } }
            ]
        }

        // Status filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'accepted') {
                query.isApproved = true
            } else if (statusFilter === 'rejected') {
                query.isApproved = false
            }
        }

        // Rating filter
        if (ratingFilter !== 'all') {
            query.rating = parseInt(ratingFilter)
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * limit

        // Get reviews with product details
        const reviews = await Review.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()

        // Get product details for each review
        const reviewsWithProducts = await Promise.all(
            reviews.map(async (review) => {
                const product = await Product.findById(review.productId)
                    .select('name slug images')
                    .lean()

                return {
                    ...review,
                    product: product || { name: 'Product Not Found', slug: '', images: [] }
                }
            })
        )

        // Get total count for pagination
        const total = await Review.countDocuments(query)
        const totalPages = Math.ceil(total / limit)

        return NextResponse.json({
            success: true,
            data: {
                reviews: reviewsWithProducts,
                total,
                page,
                limit,
                totalPages
            }
        })

    } catch (error) {
        console.error('Error fetching reviews:', error)
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }
} 