import { NextRequest, NextResponse } from 'next/server';
import { DiscordWebhookService } from '@/lib/services/discordWebhookService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';

/**
 * Test Discord Webhook
 * POST /api/admin/test-discord-webhook
 */
export async function POST(request: NextRequest) {
    try {
        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 401 }
            );
        }

        console.log('🧪 Testing Discord webhook...');

        const result = await DiscordWebhookService.testWebhook();

        if (result.success) {
            console.log('✅ Discord webhook test successful');
            return NextResponse.json({
                success: true,
                message: 'Discord webhook test sent successfully!'
            });
        } else {
            console.error('❌ Discord webhook test failed:', result.error);
            return NextResponse.json(
                {
                    success: false,
                    error: result.error,
                    message: 'Discord webhook test failed'
                },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('❌ Error testing Discord webhook:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Failed to test Discord webhook'
            },
            { status: 500 }
        );
    }
}
