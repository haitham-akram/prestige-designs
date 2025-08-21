import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Order from '@/lib/db/models/Order'
import OrderDesignFile from '@/lib/db/models/OrderDesignFile'
import DesignFile from '@/lib/db/models/DesignFile' // Ensure DesignFile is registered

// GET /api/orders/customer - Get orders for the current customer
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            console.log('❌ No session found')
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        console.log('🔍 Fetching orders for user:', session.user.id, 'email:', session.user.email)

        await connectDB()

        // Ensure DesignFile model is registered for population
        // This forces the import to be used and registers the model
        console.log('📁 DesignFile model available:', !!DesignFile)

        // Find orders for the current user - try both possible user ID formats
        const orders = await Order.find({
            $or: [
                { customerId: session.user.id },
                { customerId: session.user.email },
                { customerEmail: session.user.email }
            ]
        })
            .populate('items.productId', 'name image')
            .sort({ createdAt: -1 }) // Most recent first


        // For each order, fetch associated design files through OrderDesignFile junction
        const ordersWithFiles = await Promise.all(
            orders.map(async (order) => {
                const orderDesignFiles = await OrderDesignFile.find({
                    orderId: order._id
                }).populate('designFileId', 'fileName fileUrl fileType')

                const designFiles = orderDesignFiles.map(odf => odf.designFileId).filter(file => file)

                return {
                    ...order.toObject(),
                    designFiles
                }
            })
        )

        console.log('✅ Orders with design files prepared')

        return NextResponse.json({
            success: true,
            orders: ordersWithFiles
        })

    } catch (error) {
        console.error('❌ Error fetching customer orders:', error)
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        )
    }
}
