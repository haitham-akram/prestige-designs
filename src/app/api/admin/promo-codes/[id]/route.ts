import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import PromoCode from '@/lib/db/models/PromoCode'
import Product from '@/lib/db/models/Product'
import connectDB from '@/lib/db/connection'

// GET /api/admin/promo-codes/[id] - Get specific promo code
export async function GET(
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
        const promoCode = await PromoCode.findById(id).lean()

        if (!promoCode) {
            return NextResponse.json(
                { error: 'Promo code not found' },
                { status: 404 }
            )
        }

        // Get product details
        const product = await Product.findById(promoCode.productId)
            .select('_id name slug price images description')
            .lean()

        const now = new Date()

        const responseData = {
            ...promoCode,
            product: product || null,
            isExpired: promoCode.endDate ? promoCode.endDate < now : false,
            isNotYetActive: promoCode.startDate ? promoCode.startDate > now : false,
            usagePercentage: promoCode.usageLimit
                ? Math.round((promoCode.usageCount / promoCode.usageLimit) * 100)
                : 0,
            isCurrentlyValid: promoCode.isActive &&
                (!promoCode.startDate || promoCode.startDate <= now) &&
                (!promoCode.endDate || promoCode.endDate >= now) &&
                (!promoCode.usageLimit || promoCode.usageCount < promoCode.usageLimit)
        }

        return NextResponse.json({
            success: true,
            data: responseData
        })

    } catch (error) {
        console.error('Error fetching promo code:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT /api/admin/promo-codes/[id] - Update promo code
export async function PUT(
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

        // Check if promo code exists
        const existingPromoCode = await PromoCode.findById(id)
        if (!existingPromoCode) {
            return NextResponse.json(
                { error: 'Promo code not found' },
                { status: 404 }
            )
        }

        // Validate discount value if being updated
        if (body.discountValue !== undefined) {
            if (body.discountValue <= 0) {
                return NextResponse.json(
                    { error: 'Discount value must be greater than 0' },
                    { status: 400 }
                )
            }

            const discountType = body.discountType || existingPromoCode.discountType
            if (discountType === 'percentage' && body.discountValue > 100) {
                return NextResponse.json(
                    { error: 'Percentage discount cannot exceed 100%' },
                    { status: 400 }
                )
            }
        }

        // Check if product exists if productId is being updated
        if (body.productId && body.productId !== existingPromoCode.productId) {
            const product = await Product.findById(body.productId)
            if (!product) {
                return NextResponse.json(
                    { error: 'Product not found' },
                    { status: 404 }
                )
            }
        }

        // Check for duplicate code if code is being updated
        if (body.code && body.code.toUpperCase() !== existingPromoCode.code) {
            const duplicateCode = await PromoCode.findOne({
                code: body.code.toUpperCase(),
                _id: { $ne: params.id }
            })

            if (duplicateCode) {
                return NextResponse.json(
                    { error: 'Promo code already exists' },
                    { status: 409 }
                )
            }
        }

        // Validate date logic if dates are being updated
        if ((body.startDate || body.endDate)) {
            const startDate = body.startDate ? new Date(body.startDate) : existingPromoCode.startDate
            const endDate = body.endDate ? new Date(body.endDate) : existingPromoCode.endDate

            if (startDate && endDate && startDate >= endDate) {
                return NextResponse.json(
                    { error: 'End date must be after start date' },
                    { status: 400 }
                )
            }
        }

        // Update promo code
        const updateData = { ...body }
        if (body.code) {
            updateData.code = body.code.toUpperCase()
        }

        const updatedPromoCode = await PromoCode.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).lean()

        // Get product details for response
        const product = await Product.findById(updatedPromoCode.productId)
            .select('_id name slug price images')
            .lean()

        const now = new Date()

        const responseData = {
            ...updatedPromoCode,
            product: product || null,
            isExpired: updatedPromoCode.endDate ? updatedPromoCode.endDate < now : false,
            isNotYetActive: updatedPromoCode.startDate ? updatedPromoCode.startDate > now : false,
            usagePercentage: updatedPromoCode.usageLimit
                ? Math.round((updatedPromoCode.usageCount / updatedPromoCode.usageLimit) * 100)
                : 0,
            isCurrentlyValid: updatedPromoCode.isActive &&
                (!updatedPromoCode.startDate || updatedPromoCode.startDate <= now) &&
                (!updatedPromoCode.endDate || updatedPromoCode.endDate >= now) &&
                (!updatedPromoCode.usageLimit || updatedPromoCode.usageCount < updatedPromoCode.usageLimit)
        }

        return NextResponse.json({
            success: true,
            message: 'Promo code updated successfully',
            data: responseData
        })

    } catch (error) {
        console.error('Error updating promo code:', error)

        if (error instanceof Error && error.message.includes('validation failed')) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.message },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE /api/admin/promo-codes/[id] - Delete promo code
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
        const promoCode = await PromoCode.findById(id)

        if (!promoCode) {
            return NextResponse.json(
                { error: 'Promo code not found' },
                { status: 404 }
            )
        }

        // Check if promo code has been used
        if (promoCode.usageCount > 0) {
            return NextResponse.json(
                { error: 'Cannot delete promo code that has been used' },
                { status: 400 }
            )
        }

        await PromoCode.findByIdAndDelete(id)

        return NextResponse.json({
            success: true,
            message: 'Promo code deleted successfully'
        })

    } catch (error) {
        console.error('Error deleting promo code:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
} 