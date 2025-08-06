import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import Order from '@/lib/db/models/Order';
import connectDB from '@/lib/db/connection';

export async function GET(request: NextRequest) {
    try {
        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const status = searchParams.get('status');
        const paymentStatus = searchParams.get('paymentStatus');
        const customizationStatus = searchParams.get('customizationStatus');
        const search = searchParams.get('search');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        // Build filter object
        const filter: any = {};

        if (status && status !== 'all') {
            filter.orderStatus = status;
        }

        if (paymentStatus && paymentStatus !== 'all') {
            filter.paymentStatus = paymentStatus;
        }

        if (customizationStatus && customizationStatus !== 'all') {
            filter.customizationStatus = customizationStatus;
        }

        if (search) {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } }
            ];
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Build sort object
        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Execute queries
        const [orders, totalCount] = await Promise.all([
            Order.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(filter)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return NextResponse.json({
            orders,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNextPage,
                hasPrevPage
            }
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

