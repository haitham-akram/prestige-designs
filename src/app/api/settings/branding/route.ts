import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { SiteSettings } from '@/lib/db/models'

export async function GET() {
    try {
        await connectDB()
        const settings = await SiteSettings.findOne({}).lean()

        const branding = settings?.branding || {}

        // Return branding data with proper structure
        return NextResponse.json({
            siteName: 'Prestige Designs', // Default site name
            logoUrl: branding.logoUrl,
            faviconUrl: branding.faviconUrl
        })
    } catch (error) {
        console.error('Error fetching branding settings:', error)
        return NextResponse.json({
            siteName: 'Prestige Designs',
            logoUrl: null,
            faviconUrl: null
        })
    }
}
