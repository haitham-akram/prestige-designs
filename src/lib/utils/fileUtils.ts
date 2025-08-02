/**
 * File Management Utilities
 * 
 * This file contains utility functions for local file storage operations.
 * 
 * Features:
 * - File deletion and cleanup
 * - File validation
 * - Directory management
 * - Security checks
 * - File organization
 */

import { unlink, rmdir, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Allowed file types for design files and videos
export const ALLOWED_DESIGN_FILE_TYPES = {
    // Design files
    'psd': 'image/vnd.adobe.photoshop',
    'ai': 'application/postscript',
    'eps': 'application/postscript',
    'pdf': 'application/pdf',
    'svg': 'image/svg+xml',
    'zip': 'application/zip',
    'rar': 'application/vnd.rar',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    // Video files
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska'
} as const;

// File size limits
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Delete a file from local storage
 * @param filePath - The file path to delete
 * @returns Promise<boolean> - Success status
 */
export async function deleteFile(filePath: string): Promise<boolean> {
    try {
        // Ensure the path is within the uploads directory for security
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        const fullPath = join(process.cwd(), 'public', filePath);

        if (!fullPath.startsWith(uploadsDir)) {
            console.error('Attempted to delete file outside uploads directory:', filePath);
            return false;
        }

        if (existsSync(fullPath)) {
            await unlink(fullPath);
            console.log(`File deleted successfully: ${filePath}`);
            return true;
        } else {
            console.log(`File not found: ${filePath}`);
            return true; // File doesn't exist, consider it "deleted"
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
}

/**
 * Delete all files for a specific product
 * @param productId - The product ID
 * @returns Promise<boolean> - Success status
 */
export async function deleteProductFiles(productId: string): Promise<boolean> {
    try {
        const productDir = join(process.cwd(), 'public', 'uploads', 'designs', productId);

        if (!existsSync(productDir)) {
            console.log(`Product directory not found: ${productDir}`);
            return true;
        }

        // Get all files in the directory
        const files = await readdir(productDir);

        // Delete each file
        for (const file of files) {
            const filePath = join(productDir, file);
            await unlink(filePath);
        }

        // Remove the directory
        await rmdir(productDir);

        console.log(`Deleted all files for product: ${productId}`);
        return true;
    } catch (error) {
        console.error('Error deleting product files:', error);
        return false;
    }
}

/**
 * Validate file type
 * @param fileName - The file name
 * @returns boolean - Whether file type is allowed
 */
export function isValidFileType(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? extension in ALLOWED_DESIGN_FILE_TYPES : false;
}

/**
 * Get MIME type for file
 * @param fileName - The file name
 * @returns string - MIME type or 'application/octet-stream'
 */
export function getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? ALLOWED_DESIGN_FILE_TYPES[extension as keyof typeof ALLOWED_DESIGN_FILE_TYPES] || 'application/octet-stream' : 'application/octet-stream';
}

/**
 * Validate file size
 * @param fileSize - File size in bytes
 * @returns boolean - Whether file size is within limits
 */
export function isValidFileSize(fileSize: number): boolean {
    return fileSize > 0 && fileSize <= MAX_FILE_SIZE;
}

/**
 * Generate unique filename
 * @param productId - The product ID
 * @param originalFileName - The original file name
 * @returns string - Unique filename
 */
export function generateUniqueFileName(productId: string, originalFileName: string): string {
    const timestamp = Date.now();
    const uniqueFileName = `${productId}_${timestamp}_${originalFileName}`;
    return uniqueFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Get file path for a design file
 * @param productId - The product ID
 * @param fileName - The file name
 * @returns string - Full file path
 */
export function getDesignFilePath(productId: string, fileName: string): string {
    return join(process.cwd(), 'public', 'uploads', 'designs', productId, fileName);
}

/**
 * Get public URL for a design file
 * @param productId - The product ID
 * @param fileName - The file name
 * @returns string - Public URL
 */
export function getDesignFileUrl(productId: string, fileName: string): string {
    return `/uploads/designs/${productId}/${fileName}`;
}

/**
 * Check if file exists
 * @param filePath - The file path
 * @returns boolean - Whether file exists
 */
export function fileExists(filePath: string): boolean {
    return existsSync(filePath);
}

/**
 * Get file size in human readable format
 * @param bytes - File size in bytes
 * @returns string - Human readable file size
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file is a video
 * @param fileName - The file name
 * @returns boolean - Whether file is a video
 */
export function isVideoFile(fileName: string): boolean {
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? videoExtensions.includes(extension) : false;
}

/**
 * Check if file is an image
 * @param fileName - The file name
 * @returns boolean - Whether file is an image
 */
export function isImageFile(fileName: string): boolean {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? imageExtensions.includes(extension) : false;
}

/**
 * Check if file is a design file (PSD, AI, etc.)
 * @param fileName - The file name
 * @returns boolean - Whether file is a design file
 */
export function isDesignFile(fileName: string): boolean {
    const designExtensions = ['psd', 'ai', 'eps', 'pdf', 'svg'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? designExtensions.includes(extension) : false;
}

/**
 * Check if file is an archive (ZIP, RAR)
 * @param fileName - The file name
 * @returns boolean - Whether file is an archive
 */
export function isArchiveFile(fileName: string): boolean {
    const archiveExtensions = ['zip', 'rar'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? archiveExtensions.includes(extension) : false;
}

/**
 * Get file category (video, image, design, archive)
 * @param fileName - The file name
 * @returns string - File category
 */
export function getFileCategory(fileName: string): string {
    if (isVideoFile(fileName)) return 'video';
    if (isImageFile(fileName)) return 'image';
    if (isDesignFile(fileName)) return 'design';
    if (isArchiveFile(fileName)) return 'archive';
    return 'other';
}

/**
 * Clean up orphaned files (files not referenced in database)
 * @param referencedFiles - Array of file URLs that are referenced in database
 * @returns Promise<number> - Number of files deleted
 */
export async function cleanupOrphanedFiles(referencedFiles: string[]): Promise<number> {
    try {
        const designsDir = join(process.cwd(), 'public', 'uploads', 'designs');
        let deletedCount = 0;

        if (!existsSync(designsDir)) {
            return 0;
        }

        // Get all product directories
        const productDirs = await readdir(designsDir);

        for (const productDir of productDirs) {
            const productPath = join(designsDir, productDir);
            const files = await readdir(productPath);

            for (const file of files) {
                const fileUrl = `/uploads/designs/${productDir}/${file}`;

                // If file is not referenced, delete it
                if (!referencedFiles.includes(fileUrl)) {
                    const filePath = join(productPath, file);
                    await unlink(filePath);
                    deletedCount++;
                    console.log(`Deleted orphaned file: ${fileUrl}`);
                }
            }

            // Remove empty product directories
            const remainingFiles = await readdir(productPath);
            if (remainingFiles.length === 0) {
                await rmdir(productPath);
                console.log(`Removed empty product directory: ${productDir}`);
            }
        }

        return deletedCount;
    } catch (error) {
        console.error('Error cleaning up orphaned files:', error);
        return 0;
    }
}

/**
 * Get total storage usage for design files
 * @returns Promise<number> - Total size in bytes
 */
export async function getDesignFilesStorageUsage(): Promise<number> {
    try {
        const designsDir = join(process.cwd(), 'public', 'uploads', 'designs');
        let totalSize = 0;

        if (!existsSync(designsDir)) {
            return 0;
        }

        // This is a simplified implementation
        // In a production environment, you might want to store file sizes in the database
        // or implement a more sophisticated file size calculation

        const { statSync } = await import('fs');
        const productDirs = await readdir(designsDir);

        for (const productDir of productDirs) {
            const productPath = join(designsDir, productDir);
            const files = await readdir(productPath);

            for (const file of files) {
                const filePath = join(productPath, file);
                const stats = statSync(filePath);
                totalSize += stats.size;
            }
        }

        return totalSize;
    } catch (error) {
        console.error('Error calculating storage usage:', error);
        return 0;
    }
} 