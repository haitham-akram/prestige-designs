/**
 * Public R2 Test Connection API
 * 
 * Tests Cloudflare R2 API connection without requiring authentication
 * Used for initial setup verification
 */

import { NextResponse } from 'next/server';
import { R2Service } from '@/lib/services/r2Service';

export async function GET() {
    try {
        console.log('🧪 Testing R2 connection...');

        // Check if configured
        if (!R2Service.isConfigured()) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'R2 service not configured',
                    configured: false,
                    nextSteps: [
                        '1. Create Cloudflare account at https://www.cloudflare.com',
                        '2. Go to R2 and create a bucket named "prestige-designs-files"',
                        '3. Generate R2 API token with read/write permissions',
                        '4. Add credentials to .env.local:',
                        '   - CLOUDFLARE_R2_ACCESS_KEY_ID',
                        '   - CLOUDFLARE_R2_SECRET_ACCESS_KEY',
                        '   - CLOUDFLARE_R2_ACCOUNT_ID'
                    ]
                },
                { status: 400 }
            );
        }

        // Test connection
        const result = await R2Service.testConnection();
        const quota = await R2Service.getQuotaStatus();

        return NextResponse.json({
            success: result.success,
            message: result.message,
            bucket: result.bucket,
            quota: quota,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ R2 test connection error:', errorMessage);

        return NextResponse.json(
            {
                success: false,
                message: `Test failed: ${errorMessage}`,
                configured: R2Service.isConfigured(),
                troubleshooting: {
                    checkCredentials: 'Verify R2 credentials in .env.local',
                    checkBucket: 'Ensure bucket "prestige-designs-files" exists',
                    checkPermissions: 'Verify API token has read/write permissions',
                    checkEndpoint: 'Verify account ID is correct'
                }
            },
            { status: 500 }
        );
    }
}
