/**
 * Admin Delete Color Folder API Route
 * 
 * This endpoint handles deleting a color-specific folder and all its files
 * when the admin removes a color from the product.
 * 
 * DELETE /api/admin/upload/delete-color-folder
 * 
 * Body:
 * {
 *   productSlug: string,
 *   colorName: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   deletedFiles: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/middleware'
import { SessionUser, ApiRouteContext } from '@/lib/auth/types'
import { unlink, rmdir, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { z } from 'zod'

const deleteColorFolderSchema = z.object({
    productSlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    colorName: z.string().min(1).regex(/^[a-z0-9]+$/)
})

async function deleteColorFolder(req: NextRequest, _context: ApiRouteContext, user: SessionUser) {
    try {
        const body = await req.json()
        const validatedData = deleteColorFolderSchema.parse(body)
        const { productSlug, colorName } = validatedData

        const baseUploadDir = join(process.cwd(), 'public', 'uploads', 'designs')
        const colorDir = join(baseUploadDir, productSlug, colorName)

        // Check if directory exists
        if (!existsSync(colorDir)) {
            return NextResponse.json({
                success: false,
                message: `Color directory '${colorName}' does not exist`
            }, { status: 404 })
        }

        // Safety check: ensure we're within the uploads directory
        const uploadsDir = join(process.cwd(), 'public', 'uploads')
        if (!colorDir.startsWith(uploadsDir)) {
            return NextResponse.json({
                success: false,
                message: 'Invalid directory path'
            }, { status: 400 })
        }

        let deletedFiles = 0

        try {
            // Get all files in the directory
            const files = await readdir(colorDir)

            // Delete each file if any exist
            for (const file of files) {
                const filePath = join(colorDir, file)
                const fileStat = await stat(filePath)

                if (fileStat.isFile()) {
                    await unlink(filePath)
                    deletedFiles++
                    console.log(`Deleted file: ${filePath}`)
                }
            }

            // Remove the empty directory
            await rmdir(colorDir)
            console.log(`Deleted directory: ${colorDir}`)

        } catch (dirError) {
            console.error('Error deleting directory contents:', dirError)
            return NextResponse.json({
                success: false,
                message: 'Error deleting directory contents'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Successfully deleted color folder '${colorName}' and ${deletedFiles} files`,
            deletedFiles
        })

    } catch (error) {
        console.error('Error in deleteColorFolder:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                message: 'Invalid input data',
                errors: error.errors
            }, { status: 400 })
        }

        return NextResponse.json({
            success: false,
            message: 'Internal server error'
        }, { status: 500 })
    }
}

export const DELETE = withAdmin(deleteColorFolder) 