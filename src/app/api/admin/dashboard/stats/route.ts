import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import User from '@/lib/db/models/User'
import Category from '@/lib/db/models/Category'
import Product from '@/lib/db/models/Product'
import PromoCode from '@/lib/db/models/PromoCode'
import Order from '@/lib/db/models/Order'
import connectDB from '@/lib/db/connection'

// GET /api/admin/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await connectDB()

        // Get counts for all entities
        const [
            totalUsers,
            totalCustomers,
            totalAdmins,
            totalCategories,
            totalProducts,
            totalPromoCodes,
            totalOrders
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'customer' }),
            User.countDocuments({ role: 'admin' }),
            Category.countDocuments(),
            Product.countDocuments(),
            PromoCode.countDocuments(),
            Order.countDocuments()
        ])

        const stats = {
            totalUsers,
            totalCustomers,
            totalAdmins,
            totalCategories,
            totalProducts,
            totalPromoCodes,
            totalOrders
        }

        return NextResponse.json({
            success: true,
            data: stats
        })

    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
} 