import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import PromoCode from '@/lib/db/models/PromoCode'
import Product from '@/lib/db/models/Product'
import connectDB from '@/lib/db/connection'

// GET /api/admin/promo-codes/stats - Get promo codes statistics
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await connectDB()

        const { searchParams } = new URL(request.url)
        const period = searchParams.get('period') || 'all' // all, today, week, month, year

        // Calculate date range based on period
        let dateFilter: any = {}
        const now = new Date()

        if (period !== 'all') {
            const startDate = new Date()

            switch (period) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0)
                    break
                case 'week':
                    startDate.setDate(startDate.getDate() - 7)
                    break
                case 'month':
                    startDate.setMonth(startDate.getMonth() - 1)
                    break
                case 'year':
                    startDate.setFullYear(startDate.getFullYear() - 1)
                    break
            }

            dateFilter = { createdAt: { $gte: startDate, $lte: now } }
        }

        // Get basic counts
        const [
            totalPromoCodes,
            activePromoCodes,
            inactivePromoCodes,
            expiredPromoCodes,
            notYetActivePromoCodes,
            usedPromoCodes,
            unusedPromoCodes
        ] = await Promise.all([
            PromoCode.countDocuments(dateFilter),
            PromoCode.countDocuments({ ...dateFilter, isActive: true }),
            PromoCode.countDocuments({ ...dateFilter, isActive: false }),
            PromoCode.countDocuments({ ...dateFilter, endDate: { $lt: now } }),
            PromoCode.countDocuments({ ...dateFilter, startDate: { $gt: now } }),
            PromoCode.countDocuments({ ...dateFilter, usageCount: { $gt: 0 } }),
            PromoCode.countDocuments({ ...dateFilter, usageCount: 0 })
        ])

        // Get usage statistics
        const usageStats = await PromoCode.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalUsage: { $sum: '$usageCount' },
                    avgUsage: { $avg: '$usageCount' },
                    maxUsage: { $max: '$usageCount' },
                    totalDiscountValue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$discountType', 'percentage'] },
                                { $multiply: ['$discountValue', 0.01] }, // Convert percentage to decimal
                                '$discountValue'
                            ]
                        }
                    }
                }
            }
        ])

        // Get top used promo codes
        const topUsedPromoCodes = await PromoCode.find(dateFilter)
            .sort({ usageCount: -1 })
            .limit(5)
            .select('_id code usageCount usageLimit discountType discountValue description')
            .lean()

        // Get expiring soon promo codes (next 7 days)
        const expiringSoon = await PromoCode.find({
            ...dateFilter,
            endDate: {
                $gte: now,
                $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            },
            isActive: true
        })
            .sort({ endDate: 1 })
            .limit(10)
            .select('_id code endDate usageCount usageLimit')
            .lean()

        // Get discount type distribution
        const discountTypeStats = await PromoCode.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$discountType',
                    count: { $sum: 1 },
                    totalUsage: { $sum: '$usageCount' }
                }
            }
        ])

        // Get monthly creation trend (last 12 months)
        const monthlyTrend = await PromoCode.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(now.getFullYear() - 1, 0, 1) }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    usage: { $sum: '$usageCount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ])

        // Get products with most promo codes
        const productsWithPromoCodes = await PromoCode.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$productId',
                    promoCodeCount: { $sum: 1 },
                    totalUsage: { $sum: '$usageCount' }
                }
            },
            { $sort: { promoCodeCount: -1 } },
            { $limit: 10 }
        ])

        // Get product details for top products
        const productIds = productsWithPromoCodes.map(p => p._id)
        const products = await Product.find({ _id: { $in: productIds } })
            .select('_id name slug price')
            .lean()

        const productMap = new Map(products.map(p => [p._id, p]))
        const productsWithDetails = productsWithPromoCodes.map(item => ({
            ...item,
            product: productMap.get(item._id) || null
        }))

        const stats = {
            overview: {
                total: totalPromoCodes,
                active: activePromoCodes,
                inactive: inactivePromoCodes,
                expired: expiredPromoCodes,
                notYetActive: notYetActivePromoCodes,
                used: usedPromoCodes,
                unused: unusedPromoCodes
            },
            usage: {
                totalUsage: usageStats[0]?.totalUsage || 0,
                averageUsage: Math.round(usageStats[0]?.avgUsage || 0),
                maxUsage: usageStats[0]?.maxUsage || 0,
                totalDiscountValue: usageStats[0]?.totalDiscountValue || 0
            },
            topUsed: topUsedPromoCodes.map(pc => ({
                ...pc,
                usagePercentage: pc.usageLimit
                    ? Math.round((pc.usageCount / pc.usageLimit) * 100)
                    : 0
            })),
            expiringSoon: expiringSoon.map(pc => ({
                ...pc,
                daysUntilExpiry: Math.ceil((new Date(pc.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
                usagePercentage: pc.usageLimit
                    ? Math.round((pc.usageCount / pc.usageLimit) * 100)
                    : 0
            })),
            discountTypes: discountTypeStats,
            monthlyTrend,
            topProducts: productsWithDetails
        }

        return NextResponse.json({
            success: true,
            data: stats,
            period
        })

    } catch (error) {
        console.error('Error fetching promo codes stats:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
} 