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
        // and organize them by items
        const ordersWithFiles = await Promise.all(
            orders.map(async (order) => {
                const orderDesignFiles = await OrderDesignFile.find({
                    orderId: order._id
                }).populate('designFileId', 'fileName fileUrl fileType productId')

                // Group files by productId (item)
                const filesByItem = new Map()

                orderDesignFiles.forEach(odf => {
                    if (odf.designFileId) {
                        const productId = odf.designFileId.productId?.toString()
                        if (productId) {
                            if (!filesByItem.has(productId)) {
                                filesByItem.set(productId, [])
                            }
                            filesByItem.get(productId).push({
                                _id: odf.designFileId._id,
                                fileName: odf.designFileId.fileName,
                                fileUrl: odf.designFileId.fileUrl,
                                fileType: odf.designFileId.fileType,
                                downloadCount: odf.downloadCount,
                                lastDownloadedAt: odf.lastDownloadedAt
                            })
                        }
                    }
                })

                // Add files to each item in the order
                const itemsWithFiles = order.items.map(item => ({
                    ...item.toObject(),
                    designFiles: filesByItem.get(item.productId) || [],
                    // Include delivery status information
                    deliveryStatus: item.deliveryStatus,
                    deliveredAt: item.deliveredAt,
                    deliveryNotes: item.deliveryNotes
                }))

                return {
                    ...order.toObject(),
                    items: itemsWithFiles,
                    // Keep the old designFiles field for backward compatibility
                    designFiles: orderDesignFiles.map(odf => odf.designFileId).filter(file => file)
                }
            })
        )

        console.log('✅ Orders with files organized by items')

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
