/**
 * Test Admin Email Detection API Route
 * 
 * Route: GET /api/test/admin-emails
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import testAdminEmailDetection from '@/lib/utils/testAdminEmails';

export async function GET() {
    try {
        // Check if user is authenticated and is admin
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        console.log('🧪 Testing admin email detection...');

        const result = await testAdminEmailDetection();

        return NextResponse.json({
            success: true,
            message: 'Admin email detection test completed',
            ...result
        });

    } catch (error) {
        console.error('❌ Error in admin email test:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to test admin email detection',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
