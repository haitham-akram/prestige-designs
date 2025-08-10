import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection';
import { SiteSettings } from '@/lib/db/models'

export async function GET() {
    await connectDB()
    const doc = await SiteSettings.findOne({}).lean()
    return NextResponse.json({ data: doc || {} })
}

