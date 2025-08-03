/**
 * Admin Move Color Files API Route
 * 
 * This endpoint handles moving files from one color folder to another
 * when the admin changes a color name. It moves all files from the old
 * color folder to the new color folder and updates the file URLs.
 * 
 * POST /api/admin/upload/move-color-files
 * 
 * Body:
 * {
 *   productSlug: string,
 *   oldColorName: string,
 *   newColorName: string,
 *   files: Array<{fileName: string, oldUrl: string}>
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   files: Array<{fileName: string, oldUrl: string, newUrl: string}>
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/middleware'
import { SessionUser, ApiRouteContext } from '@/lib/auth/types'
import { rename, mkdir, access, readdir, rmdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { z } from 'zod'

const moveColorFilesSchema = z.object({
    productSlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    oldColorName: z.string().min(1).regex(/^[a-z0-9]+$/),
    newColorName: z.string().min(1).regex(/^[a-z0-9]+$/),
    files: z.array(z.object({
        fileName: z.string().min(1),
        oldUrl: z.string().min(1)
    })).min(1)
})

async function moveColorFiles(req: NextRequest, _context: ApiRouteContext, user: SessionUser) {
    try {
        const body = await req.json()
        const validatedData = moveColorFilesSchema.parse(body)
        const { productSlug, oldColorName, newColorName, files } = validatedData

        // Don't move if names are the same
        if (oldColorName === newColorName) {
            return NextResponse.json({
                success: true,
                message: 'Color names are the same, no files to move',
                files: files.map(file => ({ ...file, newUrl: file.oldUrl }))
            })
        }

        const baseUploadDir = join(process.cwd(), 'public', 'uploads', 'designs')
        const oldDir = join(baseUploadDir, productSlug, oldColorName)
        const newDir = join(baseUploadDir, productSlug, newColorName)

        // Check if old directory exists
        if (!existsSync(oldDir)) {
            return NextResponse.json({
                success: false,
                message: `Source color directory '${oldColorName}' does not exist`
            }, { status: 404 })
        }

        // Create new directory if it doesn't exist
        if (!existsSync(newDir)) {
            await mkdir(newDir, { recursive: true })
        }

        const movedFiles = []

        // Move each file
        for (const file of files) {
            const fileName = file.oldUrl.split('/').pop()
            if (!fileName) continue

            const oldFilePath = join(oldDir, fileName)
            const newFilePath = join(newDir, fileName)

            // Check if source file exists
            try {
                await access(oldFilePath)
            } catch (error) {
                console.error(`Source file does not exist: ${oldFilePath}`)
                continue
            }

            // Move the file
            await rename(oldFilePath, newFilePath)

            const newUrl = `/uploads/designs/${productSlug}/${newColorName}/${fileName}`
            movedFiles.push({
                fileName: file.fileName,
                oldUrl: file.oldUrl,
                newUrl: newUrl
            })

            console.log(`Moved color file: ${oldFilePath} -> ${newFilePath}`)
        }

        // Remove old directory if empty
        try {
            const remainingFiles = await readdir(oldDir)
            if (remainingFiles.length === 0) {
                await rmdir(oldDir)
                console.log(`Removed empty directory: ${oldDir}`)
            }
        } catch (dirError) {
            console.error('Error checking/removing old directory:', dirError)
        }

        return NextResponse.json({
            success: true,
            message: `Successfully moved ${movedFiles.length} files from color '${oldColorName}' to '${newColorName}'`,
            files: movedFiles
        })

    } catch (error) {
        console.error('Error in moveColorFiles:', error)

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

export const POST = withAdmin(moveColorFiles) 