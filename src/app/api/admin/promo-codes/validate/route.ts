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
        const { code, productId, orderAmount, cartItems } = body

        // Define cart item interface
        interface CartItem {
            productId?: string
            _id?: string
            [key: string]: unknown
        }

        // Validate required fields
        if (!code) {
            return NextResponse.json(
                { error: 'Code is required' },
                { status: 400 }
            )
        }

        console.log('Debug - Validation input:', {
            code,
            productId,
            orderAmount,
            cartItems: cartItems ? cartItems.map(item => ({ productId: item.productId, _id: item._id, name: item.name })) : 'undefined'
        })

        // Find the promo code
        const promoCode = await PromoCode.findOne({
            code: code.toUpperCase()
        }).lean() as Record<string, unknown>

        console.log('Debug - Found promo code:', {
            code: promoCode?.code,
            applyToAllProducts: promoCode?.applyToAllProducts,
            productIds: promoCode?.productIds,
            productId: promoCode?.productId
        })

        if (!promoCode) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: 'Promo code not found'
            })
        }

        // Check if the promo code applies to products in cart
        let appliesToProducts = false
        let applicableProductIds: string[] = []

        console.log('Debug - Starting product matching...')

        // Check if applies to all products
        if (promoCode.applyToAllProducts) {
            console.log('Debug - Applies to all products')
            appliesToProducts = true
            // If we have cartItems, collect their IDs
            if (cartItems && Array.isArray(cartItems)) {
                applicableProductIds = cartItems.map((item: CartItem) => item.productId || item._id).filter(Boolean) as string[]
                console.log('Debug - All products - applicable IDs:', applicableProductIds)
            } else if (productId) {
                applicableProductIds = [productId]
                console.log('Debug - All products - single product ID:', applicableProductIds)
            }
        }
        // Check new productIds array
        else if (promoCode.productIds && Array.isArray(promoCode.productIds)) {
            console.log('Debug - Checking specific product IDs:', promoCode.productIds)
            if (productId) {
                appliesToProducts = (promoCode.productIds as string[]).includes(productId)
                if (appliesToProducts) {
                    applicableProductIds = [productId]
                }
                console.log('Debug - Single product check result:', appliesToProducts, applicableProductIds)
            } else if (cartItems && Array.isArray(cartItems)) {
                // Check if any cart items match the promo code products
                const cartProductIds = cartItems.map((item: CartItem) => item.productId || item._id).filter(Boolean) as string[]
                console.log('Debug - Cart product IDs:', cartProductIds)
                console.log('Debug - Promo product IDs:', promoCode.productIds)
                applicableProductIds = cartProductIds.filter(id => (promoCode.productIds as string[]).includes(id))
                appliesToProducts = applicableProductIds.length > 0
                console.log('Debug - Multi-product check result:', appliesToProducts, applicableProductIds)
            }
        }
        // Legacy single productId support
        else if (promoCode.productId) {
            console.log('Debug - Checking legacy single product ID:', promoCode.productId)
            if (productId && promoCode.productId === productId) {
                appliesToProducts = true
                applicableProductIds = [productId]
                console.log('Debug - Legacy single product match')
            } else if (cartItems && Array.isArray(cartItems)) {
                const cartProductIds = cartItems.map((item: CartItem) => item.productId || item._id).filter(Boolean) as string[]
                console.log('Debug - Cart product IDs for legacy check:', cartProductIds)
                if (cartProductIds.includes(promoCode.productId as string)) {
                    appliesToProducts = true
                    applicableProductIds = [promoCode.productId as string]
                    console.log('Debug - Legacy cart product match')
                }
            }
        }

        console.log('Debug - Final matching result:', { appliesToProducts, applicableProductIds })

        if (!appliesToProducts) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: 'Promo code does not apply to products in cart'
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
        if (promoCode.startDate && new Date(promoCode.startDate as string) > now) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: 'Promo code is not yet active',
                startDate: promoCode.startDate
            })
        }

        // Check end date
        if (promoCode.endDate && new Date(promoCode.endDate as string) < now) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: 'Promo code has expired',
                endDate: promoCode.endDate
            })
        }

        // Check usage limit
        if (promoCode.usageLimit && Number(promoCode.usageCount) >= Number(promoCode.usageLimit)) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: 'Promo code usage limit reached'
            })
        }

        // Check minimum order amount if provided
        if (orderAmount !== undefined && promoCode.minimumOrderAmount) {
            if (orderAmount < Number(promoCode.minimumOrderAmount)) {
                return NextResponse.json({
                    success: false,
                    valid: false,
                    error: `Minimum order amount of $${promoCode.minimumOrderAmount} required`,
                    minimumOrderAmount: promoCode.minimumOrderAmount
                })
            }
        }

        // Get product details if needed
        let products: Record<string, unknown>[] = []
        if (applicableProductIds.length > 0) {
            products = await Product.find({ _id: { $in: applicableProductIds } })
                .select('_id name slug price images')
                .lean()
        } else if (productId) {
            const product = await Product.findById(productId)
                .select('_id name slug price images')
                .lean()
            if (product) {
                products = [product]
            }
        }

        // For backward compatibility, if we only have one product, use it as 'product'
        const product = products.length === 1 ? products[0] : null

        // Calculate discount amount based on qualifying items
        let discountAmount = 0
        let totalQualifyingItems = 0
        const discountValue = Number(promoCode.discountValue) || 0

        // Count qualifying items from cart
        if (cartItems && Array.isArray(cartItems)) {
            if (promoCode.applyToAllProducts) {
                // All items qualify
                totalQualifyingItems = cartItems.reduce((total, item: CartItem) => total + (item.quantity || 1), 0)
            } else if (promoCode.productIds && Array.isArray(promoCode.productIds)) {
                // Only items with matching product IDs qualify
                totalQualifyingItems = cartItems
                    .filter((item: CartItem) => (promoCode.productIds as string[]).includes(item.productId || item._id || ''))
                    .reduce((total, item: CartItem) => total + (item.quantity || 1), 0)
            } else if (promoCode.productId) {
                // Legacy single product ID support
                totalQualifyingItems = cartItems
                    .filter((item: CartItem) => item.productId === promoCode.productId || item._id === promoCode.productId)
                    .reduce((total, item: CartItem) => total + (item.quantity || 1), 0)
            }
        } else if (productId) {
            // Single product validation (backward compatibility)
            totalQualifyingItems = 1
        }

        console.log('Debug - Qualifying items calculation:', {
            totalQualifyingItems,
            discountValue,
            discountType: promoCode.discountType,
            cartItems: cartItems ? cartItems.map((item: CartItem) => ({
                productId: item.productId || item._id,
                quantity: item.quantity || 1
            })) : 'undefined'
        })

        if (orderAmount !== undefined && totalQualifyingItems > 0) {
            if (promoCode.discountType === 'percentage') {
                discountAmount = orderAmount * (discountValue / 100)

                // Apply max discount cap if set
                if (promoCode.maxDiscountAmount && discountAmount > Number(promoCode.maxDiscountAmount)) {
                    discountAmount = Number(promoCode.maxDiscountAmount)
                }
            } else {
                // Fixed amount discount per qualifying item
                discountAmount = discountValue * totalQualifyingItems

                // Apply max discount cap if set
                if (promoCode.maxDiscountAmount && discountAmount > Number(promoCode.maxDiscountAmount)) {
                    discountAmount = Number(promoCode.maxDiscountAmount)
                }
            }

            // Ensure discount doesn't exceed order amount
            discountAmount = Math.min(discountAmount, orderAmount)
        }

        console.log('Validation response data:', {
            success: true,
            valid: true,
            code: promoCode.code,
            discount: discountValue,
            type: promoCode.discountType,
            discountAmount,
            totalQualifyingItems,
            orderAmount
        }) // Debug log

        return NextResponse.json({
            success: true,
            valid: true,
            code: promoCode.code,
            discount: discountValue, // This should be the discount percentage or fixed amount per item
            type: promoCode.discountType,
            discountAmount, // This is the calculated total discount amount
            totalQualifyingItems, // Number of items this promo applies to
            data: {
                promoCode: {
                    ...promoCode,
                    product: product,
                    products: products
                },
                discountAmount,
                totalQualifyingItems,
                discountType: promoCode.discountType,
                discountValue: promoCode.discountValue,
                maxDiscountAmount: promoCode.maxDiscountAmount,
                minimumOrderAmount: promoCode.minimumOrderAmount,
                usageCount: promoCode.usageCount,
                usageLimit: promoCode.usageLimit,
                usagePercentage: promoCode.usageLimit
                    ? Math.round((Number(promoCode.usageCount) / Number(promoCode.usageLimit)) * 100)
                    : 0
            }
        })

    } catch (error) {
        console.error('Error validating promo code:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}