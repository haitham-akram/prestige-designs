import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import PromoCode from '@/lib/db/models/PromoCode'
import Product from '@/lib/db/models/Product'
import connectDB from '@/lib/db/connection'

// POST /api/admin/promo-codes/validate - Validate promo code
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await connectDB()

        const body = await request.json()
        const { code, productId, orderAmount, userId } = body

        // Validate required fields
        if (!code || !productId) {
            return NextResponse.json(
                { error: 'Code and productId are required' },
                { status: 400 }
            )
        }

        // Find the promo code
        const promoCode = await PromoCode.findOne({
            code: code.toUpperCase(),
            productId
        }).lean()

        if (!promoCode) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: 'Promo code not found for this product'
            })
        }

        // Check if promo code is active
        if (!promoCode.isActive) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: 'Promo code is inactive'
            })
        }

        const now = new Date()

        // Check start date
        if (promoCode.startDate && promoCode.startDate > now) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: 'Promo code is not yet active',
                startDate: promoCode.startDate
            })
        }

        // Check end date
        if (promoCode.endDate && promoCode.endDate < now) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: 'Promo code has expired',
                endDate: promoCode.endDate
            })
        }

        // Check usage limit
        if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: 'Promo code usage limit reached'
            })
        }

        // Check minimum order amount if provided
        if (orderAmount !== undefined && promoCode.minimumOrderAmount) {
            if (orderAmount < promoCode.minimumOrderAmount) {
                return NextResponse.json({
                    success: false,
                    valid: false,
                    error: `Minimum order amount of $${promoCode.minimumOrderAmount} required`,
                    minimumOrderAmount: promoCode.minimumOrderAmount
                })
            }
        }

        // Get product details
        const product = await Product.findById(productId)
            .select('_id name slug price images')
            .lean()

        if (!product) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: 'Product not found'
            })
        }

        // Calculate discount amount
        let discountAmount = 0
        if (orderAmount !== undefined) {
            if (promoCode.discountType === 'percentage') {
                discountAmount = orderAmount * (promoCode.discountValue / 100)

                // Apply max discount cap if set
                if (promoCode.maxDiscountAmount && discountAmount > promoCode.maxDiscountAmount) {
                    discountAmount = promoCode.maxDiscountAmount
                }
            } else {
                discountAmount = promoCode.discountValue
            }

            // Ensure discount doesn't exceed order amount
            discountAmount = Math.min(discountAmount, orderAmount)
        }

        // Prepare response data
        const responseData = {
            promoCode: {
                ...promoCode,
                product: product
            },
            discountAmount,
            discountType: promoCode.discountType,
            discountValue: promoCode.discountValue,
            maxDiscountAmount: promoCode.maxDiscountAmount,
            minimumOrderAmount: promoCode.minimumOrderAmount,
            usageCount: promoCode.usageCount,
            usageLimit: promoCode.usageLimit,
            usagePercentage: promoCode.usageLimit
                ? Math.round((promoCode.usageCount / promoCode.usageLimit) * 100)
                : 0
        }

        return NextResponse.json({
            success: true,
            valid: true,
            data: responseData
        })

    } catch (error) {
        console.error('Error validating promo code:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
} 