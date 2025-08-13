import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { SiteSettings } from '@/lib/db/models'
import type { ISiteSettings } from '@/lib/db/models/SiteSettings'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { deleteImage } from '@/lib/cloudinary/config'

async function requireAdmin() {
    const session = await getServerSession(authOptions)
    console.log(session)
    if (!session || session.user.role !== 'admin') {
        return false
    }
    return true
}

export async function GET() {
    await connectDB()
    const doc = await SiteSettings.findOne({}).lean()
    return NextResponse.json({ data: doc || {} })
}

export async function PUT(req: NextRequest) {
    console.log('PUT request received')

    if (!(await requireAdmin())) return new NextResponse('Unauthorized', { status: 401 })
    await connectDB()
    const body = await req.json()

    // Read existing document to detect image replacements
    const existing = (await SiteSettings.findOne({}).lean()) as Partial<ISiteSettings> | null
    // Build a partial $set update so that missing sections are not wiped out
    const setUpdate: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: body.updatedBy,
    }

    if (body.branding) {
        for (const [key, value] of Object.entries(body.branding)) {
            setUpdate[`branding.${key}`] = value
        }
    }

    if (body.social) {
        for (const [key, value] of Object.entries(body.social)) {
            setUpdate[`social.${key}`] = value
        }
    }

    if (body.discordBanner) {
        for (const [key, value] of Object.entries(body.discordBanner)) {
            setUpdate[`discordBanner.${key}`] = value
        }
    }

    if (body.categoriesBanner) {
        for (const [key, value] of Object.entries(body.categoriesBanner)) {
            setUpdate[`categoriesBanner.${key}`] = value
        }
    }

    const doc = await SiteSettings.findOneAndUpdate(
        {},
        { $set: setUpdate },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    // Cloudinary cleanup for replaced images
    try {
        // Branding logo
        const newLogoPublicId = body?.branding?.logoPublicId
        const oldLogoPublicId = existing?.branding?.logoPublicId
        if (newLogoPublicId && oldLogoPublicId && newLogoPublicId !== oldLogoPublicId) {
            await deleteImage(oldLogoPublicId)
        }
        // Branding favicon
        const newFaviconPublicId = body?.branding?.faviconPublicId
        const oldFaviconPublicId = existing?.branding?.faviconPublicId
        if (newFaviconPublicId && oldFaviconPublicId && newFaviconPublicId !== oldFaviconPublicId) {
            await deleteImage(oldFaviconPublicId)
        }
        // Discord banner
        const newDiscordPublicId = body?.discordBanner?.imagePublicId
        const oldDiscordPublicId = existing?.discordBanner?.imagePublicId
        if (newDiscordPublicId && oldDiscordPublicId && newDiscordPublicId !== oldDiscordPublicId) {
            await deleteImage(oldDiscordPublicId)
        }
        // Categories banner
        const newCategoriesPublicId = body?.categoriesBanner?.imagePublicId
        const oldCategoriesPublicId = existing?.categoriesBanner?.imagePublicId
        if (newCategoriesPublicId && oldCategoriesPublicId && newCategoriesPublicId !== oldCategoriesPublicId) {
            await deleteImage(oldCategoriesPublicId)
        }
    } catch (e) {
        console.error('Cloudinary cleanup error (settings):', e)
        // Do not fail the request if cleanup fails
    }
    return NextResponse.json({ data: doc })
}

