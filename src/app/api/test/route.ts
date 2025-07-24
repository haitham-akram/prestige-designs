/**
 * Quick Test API Route
 * 
 * This file provides a simple test endpoint to verify that the backend
 * is working correctly with database connection and authentication.
 * 
 * Features:
 * - Database connection test
 * - User model test
 * - Environment validation
 * - Health check endpoint
 * 
 * Route: /api/test
 * Method: GET
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';

export async function GET() {
    try {
        // Test database connection
        await connectDB();

        // Test user model
        const userCount = await User.countDocuments();

        // Check environment variables
        const envCheck = {
            mongodb: !!process.env.MONGODB_URI,
            nextauth: !!process.env.NEXTAUTH_SECRET,
            google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
            twitter: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
            jwt: !!process.env.JWT_SECRET
        };

        return NextResponse.json({
            success: true,
            message: 'Backend is working correctly!',
            data: {
                database: 'Connected to MongoDB',
                userCount,
                environment: envCheck,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Test API error:', error);

        return NextResponse.json({
            success: false,
            message: 'Backend test failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
