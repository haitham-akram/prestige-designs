import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { HeroSlide } from '@/lib/db/models'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

async function requireAdmin() {
    const session = await getServerSession(authOptions)
    return !!(session && session.user.role === 'admin')
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    if (!(await requireAdmin())) return new NextResponse('Unauthorized', { status: 401 })
    await connectDB()
    const body = await req.json()
    const updated = await HeroSlide.findByIdAndUpdate(params.id, body, { new: true })
    return NextResponse.json({ data: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    if (!(await requireAdmin())) return new NextResponse('Unauthorized', { status: 401 })
    await connectDB()
    await HeroSlide.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
}

