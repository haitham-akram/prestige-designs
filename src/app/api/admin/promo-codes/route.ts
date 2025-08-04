import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import PromoCode from '@/lib/db/models/PromoCode'
import Product from '@/lib/db/models/Product'
import connectDB from '@/lib/db/connection'

// GET /api/admin/promo-codes - List all promo codes with filters
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
        const search = searchParams.get('search') || ''
        const status = searchParams.get('status') || ''
        const productId = searchParams.get('productId') || ''
        const sortBy = searchParams.get('sortBy') || 'createdAt'
        const sortOrder = searchParams.get('sortOrder') || 'desc'

        // Build query
        const query: any = {}

        if (search) {
            query.$or = [
                { code: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        }

        if (status) {
            if (status === 'active') {
                query.isActive = true
            } else if (status === 'inactive') {
                query.isActive = false
            } else if (status === 'expired') {
                query.endDate = { $lt: new Date() }
            } else if (status === 'not_active') {
                query.startDate = { $gt: new Date() }
            }
        }

        if (productId) {
            query.productId = productId
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * limit

        // Build sort object
        const sort: any = {}
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1

        // Execute query with pagination
        const [promoCodes, total] = await Promise.all([
            PromoCode.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            PromoCode.countDocuments(query)
        ])

        // Get product details for each promo code
        const productIds = [...new Set(promoCodes.map(pc => pc.productId))]
        const products = await Product.find({ _id: { $in: productIds } })
            .select('_id name slug price images')
            .lean()

        const productMap = new Map(products.map(p => [p._id, p]))

        // Enhance promo codes with product info and calculated fields
        const enhancedPromoCodes = promoCodes.map(promoCode => {
            const product = productMap.get(promoCode.productId)
            const now = new Date()

            return {
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
        })

        // Calculate pagination info
        const totalPages = Math.ceil(total / limit)
        const hasNextPage = page < totalPages
        const hasPrevPage = page > 1

        return NextResponse.json({
            success: true,
            data: enhancedPromoCodes,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage,
                hasPrevPage
            }
        })

    } catch (error) {
        console.error('Error fetching promo codes:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/admin/promo-codes - Create new promo code
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await connectDB()

        const body = await request.json()

        // Validate required fields
        const requiredFields = ['code', 'productId', 'discountType', 'discountValue']
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json(
                    { error: `${field} is required` },
                    { status: 400 }
                )
            }
        }

        // Validate discount value based on type
        if (body.discountType === 'percentage' && body.discountValue > 100) {
            return NextResponse.json(
                { error: 'Percentage discount cannot exceed 100%' },
                { status: 400 }
            )
        }

        if (body.discountValue <= 0) {
            return NextResponse.json(
                { error: 'Discount value must be greater than 0' },
                { status: 400 }
            )
        }

        // Check if product exists
        const product = await Product.findById(body.productId)
        if (!product) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            )
        }

        // Check if promo code already exists
        const existingPromoCode = await PromoCode.findOne({
            code: body.code.toUpperCase()
        })

        if (existingPromoCode) {
            return NextResponse.json(
                { error: 'Promo code already exists' },
                { status: 409 }
            )
        }

        // Validate date logic
        if (body.startDate && body.endDate) {
            const startDate = new Date(body.startDate)
            const endDate = new Date(body.endDate)

            if (startDate >= endDate) {
                return NextResponse.json(
                    { error: 'End date must be after start date' },
                    { status: 400 }
                )
            }
        }

        // Create promo code
        const promoCode = new PromoCode({
            ...body,
            code: body.code.toUpperCase(),
            usageCount: 0
        })

        await promoCode.save()

        // Get product details for response
        const productDetails = await Product.findById(promoCode.productId)
            .select('_id name slug price images')
            .lean()

        const responseData = {
            ...promoCode.toObject(),
            product: productDetails
        }

        return NextResponse.json({
            success: true,
            message: 'Promo code created successfully',
            data: responseData
        }, { status: 201 })

    } catch (error) {
        console.error('Error creating promo code:', error)

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