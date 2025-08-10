import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { FAQItem } from '@/lib/db/models'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

async function requireAdmin() {
    const session = await getServerSession(authOptions)
    return !!(session && session.user.role === 'admin')
}

export async function GET() {
    await connectDB()
    const items = await FAQItem.find({}).sort({ order: 1, createdAt: 1 }).lean()
    return NextResponse.json({ data: items })
}

export async function POST(req: NextRequest) {
    if (!(await requireAdmin())) return new NextResponse('Unauthorized', { status: 401 })
    await connectDB()
    const body = await req.json()
    const created = await FAQItem.create(body)
    return NextResponse.json({ data: created })
}

