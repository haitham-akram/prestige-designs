/**
 * Client-Safe Utility Functions
 * 
 * This file contains utility functions that can be safely used in client-side components.
 * These functions don't use Node.js modules like 'fs', 'path', etc.
 */

// Allowed file types for design files and videos (client-safe version)
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

/**
 * Get MIME type for file (client-safe version)
 * @param fileName - The file name
 * @returns string - MIME type or 'application/octet-stream'
 */
export function getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? ALLOWED_DESIGN_FILE_TYPES[extension as keyof typeof ALLOWED_DESIGN_FILE_TYPES] || 'application/octet-stream' : 'application/octet-stream';
}

/**
 * Validate file type (client-safe version)
 * @param fileName - The file name
 * @returns boolean - Whether file type is allowed
 */
export function isValidFileType(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? extension in ALLOWED_DESIGN_FILE_TYPES : false;
}

/**
 * Get file size in human readable format (client-safe version)
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
 * Check if file is a video (client-safe version)
 * @param fileName - The file name
 * @returns boolean - Whether file is a video
 */
export function isVideoFile(fileName: string): boolean {
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? videoExtensions.includes(extension) : false;
}

/**
 * Check if file is an image (client-safe version)
 * @param fileName - The file name
 * @returns boolean - Whether file is an image
 */
export function isImageFile(fileName: string): boolean {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? imageExtensions.includes(extension) : false;
}

/**
 * Check if file is a design file (client-safe version)
 * @param fileName - The file name
 * @returns boolean - Whether file is a design file
 */
export function isDesignFile(fileName: string): boolean {
    const designExtensions = ['psd', 'ai', 'eps', 'pdf', 'svg'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? designExtensions.includes(extension) : false;
}

/**
 * Check if file is an archive (client-safe version)
 * @param fileName - The file name
 * @returns boolean - Whether file is an archive
 */
export function isArchiveFile(fileName: string): boolean {
    const archiveExtensions = ['zip', 'rar'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? archiveExtensions.includes(extension) : false;
}

/**
 * Get file category (client-safe version)
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