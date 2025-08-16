import { NextResponse } from 'next/server'
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
