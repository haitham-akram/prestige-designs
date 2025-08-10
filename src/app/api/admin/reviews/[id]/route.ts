import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import dbConnect from '@/lib/db/connection'
import Review from '@/lib/db/models/Review'

// GET - Fetch single review (admin)
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        const review = await Review.findById(params.id).lean()
        if (!review) {
            return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: review,
        })
    } catch (error) {
        console.error('Error fetching review:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to fetch review' },
            { status: 500 }
        )
    }
}

// PUT - Update review (admin)
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()
        const body = await request.json()

        const review = await Review.findByIdAndUpdate(params.id, body, { new: true })
        if (!review) {
            return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: review,
        })
    } catch (error) {
        console.error('Error updating review:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to update review' },
            { status: 500 }
        )
    }
}

// DELETE - Delete review (admin)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        const review = await Review.findByIdAndDelete(params.id)
        if (!review) {
            return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            message: 'Review deleted successfully',
        })
    } catch (error) {
        console.error('Error deleting review:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to delete review' },
            { status: 500 }
        )
    }
} 