import { useState } from 'react'

export interface UploadProgress {
    progress: number
    status: 'idle' | 'uploading' | 'success' | 'error'
    message?: string
    result?: Record<string, unknown>
}

export interface UseFileUploadOptions {
    onSuccess?: (result: Record<string, unknown>, fileInfo?: Record<string, unknown>) => void
    onError?: (error: string) => void
    onProgress?: (progress: number) => void
    timeout?: number // Timeout in milliseconds
    maxRetries?: number // Maximum number of retry attempts
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
        progress: 0,
        status: 'idle'
    })

    const [retryCount, setRetryCount] = useState(0)
    const maxRetries = options.maxRetries || 3
    const timeout = options.timeout || 300000 // 5 minutes default timeout

    const uploadFile = async (
        file: File,
        uploadUrl: string,
        additionalData?: Record<string, unknown>,
        fileInfo?: Record<string, unknown>
    ) => {
        const attemptUpload = async (attempt: number): Promise<void> => {
            return new Promise((resolve, reject) => {
                try {
                    setUploadProgress({
                        progress: 0,
                        status: 'uploading',
                        message: attempt > 1 ? `محاولة رفع ${attempt}/${maxRetries}...` : 'جاري رفع الملف...'
                    })

                    const formData = new FormData()
                    formData.append('file', file)

                    // Add additional data
                    if (additionalData) {
                        Object.entries(additionalData).forEach(([key, value]) => {
                            if (value !== null && value !== undefined) {
                                formData.append(key, value.toString())
                            }
                        })
                    }

                    const xhr = new XMLHttpRequest()
                    let timeoutId: NodeJS.Timeout

                    // Set timeout for large files
                    if (timeout > 0) {
                        timeoutId = setTimeout(() => {
                            xhr.abort()
                            reject(new Error('انتهت مهلة رفع الملف'))
                        }, timeout)
                    }

                    // Progress tracking with more frequent updates for large files
                    xhr.upload.addEventListener('progress', (event) => {
                        if (timeoutId) clearTimeout(timeoutId)

                        if (event.lengthComputable) {
                            const progress = (event.loaded / event.total) * 100
                            setUploadProgress(prev => ({
                                ...prev,
                                progress,
                                message: `جاري رفع الملف... ${Math.round(progress)}%`
                            }))
                            options.onProgress?.(progress)
                        }
                    })

                    // Response handling
                    xhr.addEventListener('load', () => {
                        if (timeoutId) clearTimeout(timeoutId)

                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const result = JSON.parse(xhr.responseText)
                                setUploadProgress({
                                    progress: 100,
                                    status: 'success',
                                    message: 'تم رفع الملف بنجاح',
                                    result
                                })
                                setRetryCount(0)
                                options.onSuccess?.(result, fileInfo)
                                resolve()
                            } catch {
                                reject(new Error('خطأ في تحليل الاستجابة'))
                            }
                        } else {
                            reject(new Error(`خطأ في الرفع: ${xhr.status} ${xhr.statusText}`))
                        }
                    })

                    // Error handling
                    xhr.addEventListener('error', () => {
                        if (timeoutId) clearTimeout(timeoutId)
                        reject(new Error('خطأ في الاتصال بالخادم'))
                    })

                    // Network error handling
                    xhr.addEventListener('abort', () => {
                        if (timeoutId) clearTimeout(timeoutId)
                        reject(new Error('تم إلغاء الرفع'))
                    })

                    // Start upload
                    xhr.open('POST', uploadUrl)
                    xhr.send(formData)

                } catch (error) {
                    reject(error instanceof Error ? error : new Error('خطأ غير معروف'))
                }
            })
        }

        // Main upload function with retry logic
        try {
            setRetryCount(0)
            await attemptUpload(1)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'

            // Check if we should retry
            if (retryCount < maxRetries && (
                errorMessage.includes('انتهت مهلة') ||
                errorMessage.includes('خطأ في الاتصال') ||
                errorMessage.includes('تم إلغاء')
            )) {
                setRetryCount(prev => prev + 1)

                // Wait before retry (exponential backoff)
                const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000)
                await new Promise(resolve => setTimeout(resolve, waitTime))

                try {
                    await attemptUpload(retryCount + 1)
                } catch (retryError) {
                    const retryErrorMessage = retryError instanceof Error ? retryError.message : 'خطأ غير معروف'
                    setUploadProgress({
                        progress: 0,
                        status: 'error',
                        message: `فشل رفع الملف بعد ${maxRetries} محاولات: ${retryErrorMessage}`
                    })
                    options.onError?.(retryErrorMessage)
                }
            } else {
                setUploadProgress({
                    progress: 0,
                    status: 'error',
                    message: errorMessage
                })
                options.onError?.(errorMessage)
            }
        }
    }

    const resetUpload = () => {
        setUploadProgress({
            progress: 0,
            status: 'idle'
        })
        setRetryCount(0)
    }

    return {
        uploadProgress,
        uploadFile,
        resetUpload,
        retryCount
    }
} 