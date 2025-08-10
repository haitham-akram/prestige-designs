import { NextResponse } from 'next/server'
// import { connectToDatabase } from '@/src/lib/db/connection'
import connectDB from '@/lib/db/connection';
import { HeroSlide } from '@/lib/db/models'

export async function GET() {
    await connectDB()
    const slides = await HeroSlide.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean()
    return NextResponse.json({ data: slides })
}

