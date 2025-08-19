import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import dbConnect from '@/lib/db/connection'
import Review from '@/lib/db/models/Review'

export async function GET() {
    try {
        await dbConnect()

        const reviews = await Review.find({ isActive: true })
            .sort({ order: 1, createdAt: -1 })
            .lean()

        return NextResponse.json({
            success: true,
            data: reviews,
        })
    } catch (error) {
        console.error('Error fetching reviews:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch reviews',
            },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        // Check if user is authenticated
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Unauthorized - Please login',
                },
                { status: 401 }
            )
        }

        await dbConnect()

        const body = await request.json()
        const { rating, text, orderId } = body

        // Use user session data for name and avatar
        const userName = session.user?.name || 'مستخدم'
        const userAvatar = session.user?.image || ''

        // Validation
        if (!rating || !text) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Rating and review text are required',
                },
                { status: 400 }
            )
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Rating must be between 1 and 5',
                },
                { status: 400 }
            )
        }

        // Create the review
        const review = new Review({
            name: userName,
            rating: parseInt(rating),
            text: text.trim(),
            avatar: userAvatar,
            isActive: false, // Reviews need admin approval
            order: 0,
            orderId: orderId || null,
            userId: session.user.id,
        })

        await review.save()

        return NextResponse.json({
            success: true,
            message: 'تم إرسال تقييمك بنجاح! سيتم مراجعته من قبل الإدارة قبل النشر.',
            data: {
                id: review._id,
                name: review.name,
                rating: review.rating,
                text: review.text,
            },
        })
    } catch (error) {
        console.error('Error creating review:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to create review',
            },
            { status: 500 }
        )
    }
}
