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
        const period = searchParams.get('period') || '30'; // days
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Calculate date range
        let dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        } else {
            // For testing, show all orders regardless of date
            // In production, you might want to use the date filter below
            dateFilter = {};

            // Uncomment the lines below for production date filtering
            // const daysAgo = new Date();
            // daysAgo.setDate(daysAgo.getDate() - parseInt(period));
            // dateFilter = {
            //     createdAt: { $gte: daysAgo }
            // };
        }

        // Get basic stats
        const [
            totalOrders,
            totalRevenue,
            completedOrders,
            pendingOrders,
            processingOrders,
            cancelledOrders,
            customizationOrders,
            avgOrderValue
        ] = await Promise.all([
            // Total orders
            Order.countDocuments(dateFilter),

            // Total revenue (only paid orders)
            Order.aggregate([
                { $match: { ...dateFilter, paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalPrice' } } }
            ]),

            // Completed orders
            Order.countDocuments({ ...dateFilter, orderStatus: 'completed' }),

            // Pending orders
            Order.countDocuments({ ...dateFilter, orderStatus: 'pending' }),

            // Processing orders
            Order.countDocuments({ ...dateFilter, orderStatus: 'processing' }),

            // Cancelled orders
            Order.countDocuments({ ...dateFilter, orderStatus: 'cancelled' }),

            // Orders with customizations
            Order.countDocuments({ ...dateFilter, hasCustomizableProducts: true }),

            // Average order value
            Order.aggregate([
                { $match: { ...dateFilter, paymentStatus: 'paid' } },
                { $group: { _id: null, avg: { $avg: '$totalPrice' } } }
            ])
        ]);

        // Get daily stats for the last 30 days
        const dailyStats = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' },
                    customizations: {
                        $sum: { $cond: ['$hasCustomizableProducts', 1, 0] }
                    }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        // Get status distribution
        const statusDistribution = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get customization status distribution
        const customizationStatusDistribution = await Order.aggregate([
            { $match: { ...dateFilter, hasCustomizableProducts: true } },
            {
                $group: {
                    _id: '$customizationStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get top products by order count
        const topProducts = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    productName: { $first: '$items.productName' },
                    orderCount: { $sum: 1 },
                    totalRevenue: { $sum: '$items.totalPrice' }
                }
            },
            { $sort: { orderCount: -1 } },
            { $limit: 10 }
        ]);

        // Calculate processing time for completed orders
        const processingTimeStats = await Order.aggregate([
            {
                $match: {
                    ...dateFilter,
                    orderStatus: 'completed',
                    processedAt: { $exists: true }
                }
            },
            {
                $addFields: {
                    processingTime: {
                        $divide: [
                            { $subtract: ['$processedAt', '$createdAt'] },
                            1000 * 60 * 60 // Convert to hours
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgProcessingTime: { $avg: '$processingTime' },
                    minProcessingTime: { $min: '$processingTime' },
                    maxProcessingTime: { $max: '$processingTime' }
                }
            }
        ]);

        // Format the results
        const stats = {
            overview: {
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                completedOrders,
                pendingOrders,
                processingOrders,
                cancelledOrders,
                customizationOrders,
                avgOrderValue: avgOrderValue[0]?.avg || 0
            },
            dailyStats: dailyStats.map(day => ({
                date: `${day._id.year}-${String(day._id.month).padStart(2, '0')}-${String(day._id.day).padStart(2, '0')}`,
                orders: day.orders,
                revenue: day.revenue,
                customizations: day.customizations
            })),
            statusDistribution: statusDistribution.reduce((acc, status) => {
                acc[status._id] = status.count;
                return acc;
            }, {} as Record<string, number>),
            customizationStatusDistribution: customizationStatusDistribution.reduce((acc, status) => {
                acc[status._id] = status.count;
                return acc;
            }, {} as Record<string, number>),
            topProducts,
            processingTime: processingTimeStats[0] || {
                avgProcessingTime: 0,
                minProcessingTime: 0,
                maxProcessingTime: 0
            }
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error('Error fetching order stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 