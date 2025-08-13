import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload to Cloudinary with customer-specific folder
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: 'customer-uploads',
                    resource_type: 'auto',
                    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
                    transformation: [
                        { quality: 'auto:good' },
                        { fetch_format: 'auto' }
                    ]
                },
                (error, result) => {
                    if (error) reject(error)
                    else resolve(result)
                }
            ).end(buffer)
        })

        return NextResponse.json({
            success: true,
            url: (result as any).secure_url,
            publicId: (result as any).public_id,
            width: (result as any).width,
            height: (result as any).height
        })

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { publicId } = await request.json()

        if (!publicId) {
            return NextResponse.json({ error: 'No public ID provided' }, { status: 400 })
        }

        // Delete from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId)

        return NextResponse.json({
            success: true,
            result
        })

    } catch (error) {
        console.error('Delete error:', error)
        return NextResponse.json(
            { error: 'Failed to delete image' },
            { status: 500 }
        )
    }
}
