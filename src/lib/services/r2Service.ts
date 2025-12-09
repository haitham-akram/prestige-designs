/**
 * Cloudflare R2 Storage Service
 * 
 * Handles all R2 operations for file storage
 * R2 is S3-compatible, so we use AWS SDK
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export interface R2File {
    key: string;
    size: number;
    contentType: string;
    uploadedAt: Date;
    url?: string;
}

export class R2Service {
    private static client: S3Client | null = null;
    private static readonly BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'prestige-designs-files';
    private static readonly ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;

    private static initializeClient(): S3Client | null {
        try {
            const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
            const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
            const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;

            if (!accessKeyId || !secretAccessKey || !accountId) {
                console.warn('⚠️ R2 credentials not configured');
                return null;
            }

            const client = new S3Client({
                region: 'auto',
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
                endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            });

            console.log('✅ Cloudflare R2 client initialized successfully');
            return client;

        } catch (error) {
            console.error('❌ Error initializing R2 client:', error);
            return null;
        }
    }

    /**
     * Upload file to R2
     */
    static async uploadFile(
        fileBuffer: Buffer,
        fileName: string,
        folderPath: string,
        contentType: string = 'application/octet-stream'
    ): Promise<R2File> {
        try {
            if (!this.client) {
                this.client = this.initializeClient();
            }

            if (!this.client) {
                throw new Error('R2 client not initialized');
            }

            // Build the full key (path) for the file
            const key = folderPath ? `${folderPath}/${fileName}` : fileName;

            console.log(`📤 Uploading file to R2: ${key}`);

            const command = new PutObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: key,
                Body: fileBuffer,
                ContentType: contentType,
                Metadata: {
                    'uploaded-by': 'prestige-designs',
                    'uploaded-at': new Date().toISOString(),
                },
            });

            await this.client.send(command);

            console.log(`✅ File uploaded successfully to R2: ${key}`);

            return {
                key,
                size: fileBuffer.length,
                contentType,
                uploadedAt: new Date(),
                url: this.getPublicUrl(key),
            };

        } catch (error) {
            console.error('❌ Error uploading file to R2:', fileName, error);
            await this.notifyAdminError(`R2 File Upload Error: ${fileName}`, error);
            throw error;
        }
    }

    /**
     * Download file from R2
     */
    static async downloadFile(fileKey: string): Promise<Readable> {
        try {
            if (!this.client) {
                this.client = this.initializeClient();
            }

            if (!this.client) {
                throw new Error('R2 client not initialized');
            }

            console.log(`📥 Downloading file from R2: ${fileKey}`);

            const command = new GetObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: fileKey,
            });

            const response = await this.client.send(command);

            console.log(`✅ File stream ready for download: ${fileKey}`);

            return response.Body as Readable;

        } catch (error) {
            console.error('❌ Error downloading file from R2:', fileKey, error);
            await this.notifyAdminError(`R2 File Download Error: ${fileKey}`, error);
            throw error;
        }
    }

    /**
     * Delete file from R2
     */
    static async deleteFile(fileKey: string): Promise<void> {
        try {
            if (!this.client) {
                this.client = this.initializeClient();
            }

            if (!this.client) {
                throw new Error('R2 client not initialized');
            }

            console.log(`🗑️ Deleting file from R2: ${fileKey}`);

            const command = new DeleteObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: fileKey,
            });

            await this.client.send(command);

            console.log(`✅ File deleted successfully from R2: ${fileKey}`);

        } catch (error) {
            console.error('❌ Error deleting file from R2:', fileKey, error);
        }
    }

    /**
     * Get file metadata
     */
    static async getFileMetadata(fileKey: string): Promise<R2File | null> {
        try {
            if (!this.client) {
                this.client = this.initializeClient();
            }

            if (!this.client) {
                throw new Error('R2 client not initialized');
            }

            const command = new HeadObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: fileKey,
            });

            const response = await this.client.send(command);

            return {
                key: fileKey,
                size: response.ContentLength || 0,
                contentType: response.ContentType || 'application/octet-stream',
                uploadedAt: response.LastModified || new Date(),
                url: this.getPublicUrl(fileKey),
            };

        } catch (error) {
            console.error('❌ Error getting file metadata from R2:', fileKey, error);
            return null;
        }
    }

    /**
     * Test R2 connection
     */
    static async testConnection(): Promise<{ success: boolean; message: string; bucket?: string }> {
        try {
            if (!this.client) {
                this.client = this.initializeClient();
            }

            if (!this.client) {
                return {
                    success: false,
                    message: 'R2 client not initialized. Check credentials in environment variables.',
                };
            }

            console.log('🧪 Testing R2 connection...');

            // Try to head the bucket (simple connectivity test)
            const testKey = '.connection-test';
            const testBuffer = Buffer.from('test');

            const uploadCommand = new PutObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: testKey,
                Body: testBuffer,
            });

            await this.client.send(uploadCommand);

            // Clean up test file
            const deleteCommand = new DeleteObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: testKey,
            });

            await this.client.send(deleteCommand);

            console.log('✅ R2 connection successful');

            return {
                success: true,
                message: `✅ R2 connection successful`,
                bucket: this.BUCKET_NAME,
            };

        } catch (error) {
            console.error('❌ R2 connection failed:', error);
            return {
                success: false,
                message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Check if R2 is configured
     */
    static isConfigured(): boolean {
        return !!(
            process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
            process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
            process.env.CLOUDFLARE_R2_ACCOUNT_ID
        );
    }

    /**
     * Generate public URL for a file
     */
    private static getPublicUrl(key: string): string {
        if (!this.ACCOUNT_ID) {
            return `https://r2.cloudflarestorage.com/${this.BUCKET_NAME}/${key}`;
        }
        return `https://${this.ACCOUNT_ID}.r2.cloudflarestorage.com/${this.BUCKET_NAME}/${key}`;
    }

    /**
     * Notify admin of errors
     */
    private static async notifyAdminError(title: string, error: unknown): Promise<void> {
        try {
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            console.error(`❌ R2 Error [${title}]:`, errorMessage);
            // Error notifications could be extended here in the future
        } catch (notifyError) {
            console.error('❌ Failed to log R2 error:', notifyError);
        }
    }

    /**
     * Get storage quota status (R2 doesn't have quotas like personal storage)
     */
    static async getQuotaStatus(): Promise<{ used: string; total: string } | null> {
        try {
            console.log('ℹ️ R2 storage has no quota limits. You pay only for what you use.');

            return {
                used: 'N/A',
                total: 'Unlimited (Pay-as-you-go)',
            };

        } catch (error) {
            console.error('⚠️ Could not retrieve quota status:', error);
            return {
                used: 'N/A',
                total: 'Unlimited (Pay-as-you-go)',
            };
        }
    }
}
