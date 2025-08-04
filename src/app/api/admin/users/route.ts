import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import User from '@/lib/db/models/User'
import Order from '@/lib/db/models/Order'
import connectDB from '@/lib/db/connection'

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
        const role = searchParams.get('role') || ''
        const status = searchParams.get('status') || ''

        // Build query
        const query: any = {}

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ]
        }

        if (role && role !== 'all') {
            query.role = role
        }

        if (status && status !== 'all') {
            // Convert 'active'/'inactive' to true/false
            if (status === 'active') {
                // For active filter, include users with isActive: true OR users without isActive field (legacy users)
                query.$or = [
                    { isActive: true },
                    { isActive: { $exists: false } }
                ]
            } else if (status === 'inactive') {
                query.isActive = false
            }
        }

        // Calculate pagination
        const skip = (page - 1) * limit

        // Execute queries
        const [users, total] = await Promise.all([
            User.find(query)
                .select('name email role isActive createdAt lastLoginAt avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query),
        ])





        // Get purchase counts for each user
        const purchaseCounts = await Promise.all(
            users.map(async (user) => {
                const count = await Order.countDocuments({ userId: user._id })
                return { userId: user._id, count }
            })
        )

        // Create a map for quick lookup
        const purchaseCountMap = purchaseCounts.reduce((acc, { userId, count }) => {
            acc[userId.toString()] = count
            return acc
        }, {} as Record<string, number>)

        // Add default values for missing fields
        const usersWithDefaults = users.map(user => ({
            ...user,
            isActive: user.isActive !== undefined ? user.isActive : true,
            lastLogin: user.lastLoginAt || null,
            avatar: user.avatar || null,
            purchaseCount: purchaseCountMap[user._id.toString()] || 0
        }))

        const totalPages = Math.ceil(total / limit)

        const responseData = {
            success: true,
            data: {
                users: usersWithDefaults,
                total,
                page,
                limit,
                totalPages,
            },
        }

        return NextResponse.json(responseData)
    } catch (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 