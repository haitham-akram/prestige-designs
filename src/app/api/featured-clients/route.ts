import { NextResponse } from 'next/server'
// import { connectToDatabase } from '@/src/lib/db/connection'
import connectDB from '@/lib/db/connection';
import { FeaturedClient } from '@/lib/db/models'

export async function GET() {
    await connectDB()
    const items = await FeaturedClient.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean()
    return NextResponse.json({ data: items })
}

