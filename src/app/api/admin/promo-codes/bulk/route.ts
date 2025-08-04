import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import PromoCode from '@/lib/db/models/PromoCode'
import connectDB from '@/lib/db/connection'

// POST /api/admin/promo-codes/bulk - Bulk operations on promo codes
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await connectDB()

        const body = await request.json()
        const { action, promoCodeIds } = body

        // Validate required fields
        if (!action || !promoCodeIds || !Array.isArray(promoCodeIds) || promoCodeIds.length === 0) {
            return NextResponse.json(
                { error: 'Action and promoCodeIds array are required' },
                { status: 400 }
            )
        }

        let result: any = {}

        switch (action) {
            case 'delete':
                // Check if any promo codes have been used
                const usedPromoCodes = await PromoCode.find({
                    _id: { $in: promoCodeIds },
                    usageCount: { $gt: 0 }
                }).select('_id code usageCount')

                if (usedPromoCodes.length > 0) {
                    return NextResponse.json({
                        error: 'Cannot delete promo codes that have been used',
                        usedPromoCodes: usedPromoCodes.map(pc => ({
                            id: pc._id,
                            code: pc.code,
                            usageCount: pc.usageCount
                        }))
                    }, { status: 400 })
                }

                result = await PromoCode.deleteMany({
                    _id: { $in: promoCodeIds }
                })

                return NextResponse.json({
                    success: true,
                    message: `Successfully deleted ${result.deletedCount} promo codes`,
                    deletedCount: result.deletedCount
                })

            case 'activate':
                result = await PromoCode.updateMany(
                    { _id: { $in: promoCodeIds } },
                    { isActive: true }
                )

                return NextResponse.json({
                    success: true,
                    message: `Successfully activated ${result.modifiedCount} promo codes`,
                    modifiedCount: result.modifiedCount
                })

            case 'deactivate':
                result = await PromoCode.updateMany(
                    { _id: { $in: promoCodeIds } },
                    { isActive: false }
                )

                return NextResponse.json({
                    success: true,
                    message: `Successfully deactivated ${result.modifiedCount} promo codes`,
                    modifiedCount: result.modifiedCount
                })

            default:
                return NextResponse.json(
                    { error: 'Invalid action. Supported actions: delete, activate, deactivate' },
                    { status: 400 }
                )
        }

    } catch (error) {
        console.error('Error performing bulk operation:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
} 