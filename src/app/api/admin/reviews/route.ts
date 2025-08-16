import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import dbConnect from '@/lib/db/connection'
import Review from '@/lib/db/models/Review'

// GET - Fetch all reviews (admin)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const status = searchParams.get('status') || 'all'
        const rating = searchParams.get('rating') || 'all'

        // Build query
        const query: any = {}

        // Search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { text: { $regex: search, $options: 'i' } },
            ]
        }

        // Status filter
        if (status !== 'all') {
            query.isActive = status === 'true'
        }

        // Rating filter
        if (rating !== 'all') {
            query.rating = parseInt(rating)
        }

        const reviews = await Review.find(query).sort({ order: 1, createdAt: -1 }).lean()

        return NextResponse.json({
            success: true,
            data: reviews,
        })
    } catch (error) {
        console.error('Error fetching reviews:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to fetch reviews' },
            { status: 500 }
        )
    }
}

// POST - Create new review (admin)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()
        const body = await request.json()

        const review = new Review(body)
        await review.save()

        return NextResponse.json({
            success: true,
            data: review,
        })
    } catch (error) {
        console.error('Error creating review:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to create review' },
            { status: 500 }
        )
    }
} 