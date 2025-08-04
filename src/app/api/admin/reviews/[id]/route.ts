import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import Review from '@/lib/db/models/Review'
import connectDB from '@/lib/db/connection'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await connectDB()

        const { id } = await params
        const body = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'Review ID is required' }, { status: 400 })
        }

        if (typeof body.isApproved !== 'boolean') {
            return NextResponse.json({ error: 'isApproved field is required and must be boolean' }, { status: 400 })
        }

        // Find and update the review
        const review = await Review.findByIdAndUpdate(
            id,
            { isApproved: body.isApproved },
            { new: true }
        )

        if (!review) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            message: `Review ${body.isApproved ? 'approved' : 'disapproved'} successfully`,
            data: review
        })

    } catch (error) {
        console.error('Error updating review status:', error)
        return NextResponse.json({ error: 'Failed to update review status' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await connectDB()

        const { id } = await params

        if (!id) {
            return NextResponse.json({ error: 'Review ID is required' }, { status: 400 })
        }

        // Find and delete the review
        const review = await Review.findByIdAndDelete(id)

        if (!review) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            message: 'Review deleted successfully'
        })

    } catch (error) {
        console.error('Error deleting review:', error)
        return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
    }
} 