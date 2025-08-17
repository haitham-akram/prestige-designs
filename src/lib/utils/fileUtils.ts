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

import { writeFile, mkdir, unlink, stat, access } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface FileUploadResult {
    fileName: string;
    fileUrl: string;
    filePath: string;
    fileSize: number;
}

export interface UploadOptions {
    orderId?: string;
    orderNumber?: string;
    productId?: string;
    productSlug?: string;
    colorName?: string;
}

export class FileUtils {
    /**
     * Upload a file to local storage
     */
    static async uploadFile(
        file: Buffer,
        originalName: string,
        uploadPath: string
    ): Promise<FileUploadResult> {
        try {
            // Create directory structure
            const fullUploadPath = path.join(process.cwd(), 'public', uploadPath);
            await mkdir(fullUploadPath, { recursive: true });

            // Generate unique filename
            const timestamp = Date.now();
            const fileExtension = path.extname(originalName);
            const fileName = `${timestamp}_${originalName}`;
            const filePath = path.join(fullUploadPath, fileName);

            // Write file to local storage
            await writeFile(filePath, file);

            // Create relative URL for database
            const relativePath = path.join(uploadPath, fileName);
            const fileUrl = `/${relativePath.replace(/\\/g, '/')}`;

            return {
                fileName: originalName,
                fileUrl,
                filePath,
                fileSize: file.length
            };
        } catch (error) {
            console.error('Error uploading file:', error);
            throw new Error(`Failed to upload file: ${error}`);
        }
    }

    /**
     * Upload design file for an order with simple color-based structure
     */
    static async uploadDesignFile(
        file: Buffer,
        originalName: string,
        options: UploadOptions
    ): Promise<FileUploadResult> {
        const uploadPath = this.generateUploadPath(options);
        return this.uploadFile(file, originalName, uploadPath);
    }

    /**
     * Generate simple upload path: base folder or color subfolder
     */
    static generateUploadPath(options: UploadOptions): string {
        const { orderId, orderNumber, productId, productSlug, colorName } = options;

        // Determine the order identifier (prefer orderNumber over orderId)
        const orderIdentifier = orderNumber || orderId;
        if (!orderIdentifier) {
            throw new Error('Either orderNumber or orderId is required');
        }

        // Determine the product identifier (prefer productSlug over productId)
        const productIdentifier = productSlug || productId;
        if (!productIdentifier) {
            throw new Error('Either productSlug or productId is required');
        }

        // Base path: uploads/orders/{orderNumber}/{productSlug} or uploads/designs/orders/{orderId}/{productId}
        let uploadPath;
        if (orderNumber && productSlug) {
            // New structure: uploads/orders/{orderNumber}/{productSlug}
            uploadPath = path.join('uploads', 'orders', orderNumber, productSlug);
        } else {
            // Legacy structure: uploads/designs/orders/{orderId}/{productId}
            uploadPath = path.join('uploads', 'designs', 'orders', orderId, productId);
        }

        // Add color folder only if colorName is provided and not empty
        if (colorName && colorName.trim()) {
            uploadPath = path.join(uploadPath, colorName);
        }

        return uploadPath;
    }

    /**
     * Upload design file for an order (legacy method for backward compatibility)
     */
    static async uploadDesignFileLegacy(
        file: Buffer,
        originalName: string,
        orderId: string,
        productId: string,
        colorName?: string
    ): Promise<FileUploadResult> {
        const options: UploadOptions = {
            orderId,
            productId,
            colorName
        };
        return this.uploadDesignFile(file, originalName, options);
    }

    /**
     * Get file path for a specific order and product
     */
    static getOrderProductPath(orderId: string, productId: string, colorName?: string): string {
        const basePath = path.join('uploads', 'designs', 'orders', orderId, productId);

        if (colorName && colorName.trim()) {
            return path.join(basePath, colorName);
        }

        return basePath;
    }

    /**
     * List all files for a specific order and product
     */
    static async listOrderFiles(orderId: string, productId: string): Promise<string[]> {
        // This would scan the directory and return all file URLs
        // Implementation would depend on your needs
        console.log('List files function not implemented');
        return [];
    }

    /**
     * Delete a file from local storage
             */
    static async deleteFile(fileUrl: string): Promise<boolean> {
        try {
            const filePath = path.join(process.cwd(), 'public', fileUrl.substring(1));

            // Check if file exists
            try {
                await stat(filePath);
            } catch (error) {
                console.log('File not found for deletion:', filePath);
                return false;
            }

            // Delete the file
            await unlink(filePath);
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    /**
             * Check if file exists
             */
    static async fileExists(fileUrl: string): Promise<boolean> {
        try {
            const filePath = path.join(process.cwd(), 'public', fileUrl.substring(1));
            await stat(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
             * Get file size
             */
    static async getFileSize(fileUrl: string): Promise<number> {
        try {
            const filePath = path.join(process.cwd(), 'public', fileUrl.substring(1));
            const stats = await stat(filePath);
            return stats.size;
        } catch (error) {
            console.error('Error getting file size:', error);
            return 0;
        }
    }

    /**
     * Format file size for display
     */
    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
             * Get file extension from filename
             */
    static getFileExtension(filename: string): string {
        return path.extname(filename).toLowerCase();
    }

    /**
     * Validate file type
     */
    static isValidDesignFile(filename: string): boolean {
        const allowedExtensions = [
            '.psd', '.ai', '.eps', '.pdf', '.svg',
            '.zip', '.rar', '.png', '.jpg', '.jpeg',
            '.gif', '.webp', '.mp4', '.avi', '.mov',
            '.wmv', '.flv', '.webm', '.mkv'
        ];

        const extension = this.getFileExtension(filename);
        return allowedExtensions.includes(extension);
    }

    /**
     * Get MIME type from file extension
     */
    static getMimeType(filename: string): string {
        const extension = this.getFileExtension(filename);

        const mimeTypes: Record<string, string> = {
            '.psd': 'image/vnd.adobe.photoshop',
            '.ai': 'application/postscript',
            '.eps': 'application/postscript',
            '.pdf': 'application/pdf',
            '.svg': 'image/svg+xml',
            '.zip': 'application/zip',
            '.rar': 'application/vnd.rar',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.wmv': 'video/x-ms-wmv',
            '.flv': 'video/x-flv',
            '.webm': 'video/webm',
            '.mkv': 'video/x-matroska'
        };

        return mimeTypes[extension] || 'application/octet-stream';
    }

    /**
     * Clean up orphaned files
     */
    static async cleanupOrphanedFiles(): Promise<number> {
        // This function would scan the uploads directory and remove files
        // that don't have corresponding database records
        // Implementation would depend on your specific needs
        console.log('Cleanup function not implemented');
        return 0;
    }
}

// Utility functions for video streaming and file operations
export function isVideoFile(fileName: string): boolean {
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const extension = path.extname(fileName).toLowerCase().substring(1);
    return videoExtensions.includes(extension);
}

export function getDesignFilePath(fileUrl: string): string {
    // Remove leading slash if present and construct full path
    const relativePath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
    return path.join(process.cwd(), 'public', relativePath);
}

export function fileExists(filePath: string): boolean {
    return existsSync(filePath);
} 