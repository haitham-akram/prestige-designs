/**
 * Admin Email Detection Utility
 * 
 * Test utility to check admin email detection logic
 */

import { User } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';

export async function testAdminEmailDetection() {
    try {
        await connectDB();
        console.log('🔍 Testing admin email detection...');

        // Check environment variables first
        const envAdminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
        console.log('📧 Environment admin email:', envAdminEmail || 'Not set');

        // Find admin users in database
        const adminUsers = await User.find({
            role: 'admin',
            isActive: true,
            isEmailVerified: true
        }).select('email name role isActive isEmailVerified preferences').lean();

        console.log(`👥 Found ${adminUsers.length} admin users:`);
        adminUsers.forEach(admin => {
            console.log(`   - ${admin.name} (${admin.email})`);
            console.log(`     Active: ${admin.isActive}, Verified: ${admin.isEmailVerified}`);
            console.log(`     Email Notifications: ${admin.preferences?.emailNotifications !== false}`);
        });

        // Find admin users with notifications enabled
        const notificationEnabledAdmins = await User.find({
            role: 'admin',
            isActive: true,
            isEmailVerified: true,
            'preferences.emailNotifications': true
        }).select('email name').lean();

        console.log(`📧 Admin users with notifications enabled: ${notificationEnabledAdmins.length}`);
        notificationEnabledAdmins.forEach(admin => {
            console.log(`   - ${admin.name} (${admin.email})`);
        });

        return {
            envAdminEmail,
            totalAdmins: adminUsers.length,
            notificationEnabledAdmins: notificationEnabledAdmins.length,
            adminEmails: adminUsers.map(admin => admin.email)
        };

    } catch (error) {
        console.error('❌ Error testing admin email detection:', error);
        throw error;
    }
}

// Export for use in API routes or scripts
export default testAdminEmailDetection;
