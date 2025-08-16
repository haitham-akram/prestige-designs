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
        const promoCode = await PromoCode.findById(id).lean() as Record<string, unknown>

        if (!promoCode) {
            return NextResponse.json(
                { error: 'Promo code not found' },
                { status: 404 }
            )
        }

        // Get product details
        let products: Record<string, unknown>[] = []

        // Handle legacy single productId
        if (promoCode.productId && !promoCode.productIds && !promoCode.applyToAllProducts) {
            const product = await Product.findById(promoCode.productId)
                .select('_id name slug price images description')
                .lean()
            products = product ? [product] : []
        }
        // Handle new productIds array
        else if (promoCode.productIds && Array.isArray(promoCode.productIds) && promoCode.productIds.length > 0) {
            products = await Product.find({ _id: { $in: promoCode.productIds } })
                .select('_id name slug price images description')
                .lean()
        }
        // Handle apply to all products
        else if (promoCode.applyToAllProducts) {
            products = await Product.find({ isActive: true })
                .select('_id name slug price images description')
                .lean()
        }

        const now = new Date()

        const responseData = {
            ...promoCode,
            products: products || [],
            isExpired: promoCode.endDate ? new Date(promoCode.endDate as string) < now : false,
            isNotYetActive: promoCode.startDate ? new Date(promoCode.startDate as string) > now : false,
            usagePercentage: promoCode.usageLimit
                ? Math.round((Number(promoCode.usageCount) / Number(promoCode.usageLimit)) * 100)
                : 0,
            isCurrentlyValid: promoCode.isActive &&
                (!promoCode.startDate || new Date(promoCode.startDate as string) <= now) &&
                (!promoCode.endDate || new Date(promoCode.endDate as string) >= now) &&
                (!promoCode.usageLimit || Number(promoCode.usageCount) < Number(promoCode.usageLimit))
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

        // Check if products exist for multi-product support
        if (body.productIds && Array.isArray(body.productIds)) {
            const products = await Product.find({ _id: { $in: body.productIds } })
            if (products.length !== body.productIds.length) {
                return NextResponse.json(
                    { error: 'One or more products not found' },
                    { status: 404 }
                )
            }
        }

        // Validate applyToAllProducts logic
        if (body.applyToAllProducts && body.productIds && body.productIds.length > 0) {
            return NextResponse.json(
                { error: 'Cannot specify specific products when applying to all products' },
                { status: 400 }
            )
        }

        // Legacy single product support
        if (body.productId && !body.productIds && !body.applyToAllProducts) {
            const product = await Product.findById(body.productId)
            if (!product) {
                return NextResponse.json(
                    { error: 'Product not found' },
                    { status: 404 }
                )
            }
            // Convert to new multi-product format
            body.productIds = [body.productId]
            delete body.productId
        }

        // Check for duplicate code if code is being updated
        if (body.code && body.code.toUpperCase() !== existingPromoCode.code) {
            const duplicateCode = await PromoCode.findOne({
                code: body.code.toUpperCase(),
                _id: { $ne: id }
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
        ).lean() as Record<string, unknown>

        if (!updatedPromoCode) {
            return NextResponse.json(
                { error: 'Failed to update promo code' },
                { status: 500 }
            )
        }

        // Get product details for response
        let products: Record<string, unknown>[] = []

        // Handle legacy single productId
        if (updatedPromoCode.productId && !updatedPromoCode.productIds && !updatedPromoCode.applyToAllProducts) {
            const product = await Product.findById(updatedPromoCode.productId)
                .select('_id name slug price images')
                .lean()
            products = product ? [product] : []
        }
        // Handle new productIds array
        else if (updatedPromoCode.productIds && Array.isArray(updatedPromoCode.productIds) && updatedPromoCode.productIds.length > 0) {
            products = await Product.find({ _id: { $in: updatedPromoCode.productIds } })
                .select('_id name slug price images')
                .lean()
        }
        // Handle apply to all products
        else if (updatedPromoCode.applyToAllProducts) {
            products = await Product.find({ isActive: true })
                .select('_id name slug price images')
                .lean()
        }

        const now = new Date()

        const responseData = {
            ...updatedPromoCode,
            products: products || [],
            isExpired: updatedPromoCode.endDate ? new Date(updatedPromoCode.endDate as string) < now : false,
            isNotYetActive: updatedPromoCode.startDate ? new Date(updatedPromoCode.startDate as string) > now : false,
            usagePercentage: updatedPromoCode.usageLimit
                ? Math.round((Number(updatedPromoCode.usageCount) / Number(updatedPromoCode.usageLimit)) * 100)
                : 0,
            isCurrentlyValid: updatedPromoCode.isActive &&
                (!updatedPromoCode.startDate || new Date(updatedPromoCode.startDate as string) <= now) &&
                (!updatedPromoCode.endDate || new Date(updatedPromoCode.endDate as string) >= now) &&
                (!updatedPromoCode.usageLimit || Number(updatedPromoCode.usageCount) < Number(updatedPromoCode.usageLimit))
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