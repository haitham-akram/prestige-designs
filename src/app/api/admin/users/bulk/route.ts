import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import User from '@/lib/db/models/User'
import connectDB from '@/lib/db/connection'

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await connectDB()

        const { userIds, action } = await request.json()

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'Invalid user IDs' }, { status: 400 })
        }

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 })
        }

        let updateData: any = {}
        let result

        switch (action) {
            case 'activate':
                updateData = { isActive: true }
                result = await User.updateMany(
                    { _id: { $in: userIds } },
                    { $set: updateData }
                )
                break

            case 'deactivate':
                updateData = { isActive: false }
                result = await User.updateMany(
                    { _id: { $in: userIds } },
                    { $set: updateData }
                )
                break

            case 'makeAdmin':
                updateData = { role: 'admin' }
                result = await User.updateMany(
                    { _id: { $in: userIds } },
                    { $set: updateData }
                )
                break

            case 'makeCustomer':
                updateData = { role: 'customer' }
                result = await User.updateMany(
                    { _id: { $in: userIds } },
                    { $set: updateData }
                )
                break

            case 'delete':
                result = await User.deleteMany({ _id: { $in: userIds } })
                break

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: `Successfully ${action}ed ${result.modifiedCount || result.deletedCount} users`,
            data: {
                modifiedCount: result.modifiedCount || result.deletedCount,
            },
        })
    } catch (error) {
        console.error('Error performing bulk action:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 