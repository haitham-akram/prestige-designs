import { useState } from 'react'

export interface UploadProgress {
    progress: number
    status: 'idle' | 'uploading' | 'success' | 'error'
    message?: string
    result?: any
}

export interface UseFileUploadOptions {
    onSuccess?: (result: any, fileInfo?: any) => void
    onError?: (error: string) => void
    onProgress?: (progress: number) => void
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
        progress: 0,
        status: 'idle'
    })

    const uploadFile = async (
        file: File,
        uploadUrl: string,
        additionalData?: Record<string, any>,
        fileInfo?: any
    ) => {
        try {
            setUploadProgress({
                progress: 0,
                status: 'uploading',
                message: 'جاري رفع الملف...'
            })

            const formData = new FormData()
            formData.append('file', file)

            // Add additional data
            if (additionalData) {
                Object.entries(additionalData).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        formData.append(key, value.toString())
                    } else if (value === '') {
                        // Handle empty strings explicitly
                        formData.append(key, '')
                    }
                })
            }

            const xhr = new XMLHttpRequest()

            // Progress tracking
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100
                    setUploadProgress(prev => ({
                        ...prev,
                        progress
                    }))
                    options.onProgress?.(progress)
                }
            })

            // Response handling
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText)
                        setUploadProgress({
                            progress: 100,
                            status: 'success',
                            message: 'تم رفع الملف بنجاح',
                            result
                        })
                        options.onSuccess?.(result, fileInfo)
                    } catch (error) {
                        setUploadProgress({
                            progress: 0,
                            status: 'error',
                            message: 'خطأ في تحليل الاستجابة'
                        })
                        options.onError?.('خطأ في تحليل الاستجابة')
                    }
                } else {
                    setUploadProgress({
                        progress: 0,
                        status: 'error',
                        message: `خطأ في الرفع: ${xhr.status} ${xhr.statusText}`
                    })
                    options.onError?.(`خطأ في الرفع: ${xhr.status} ${xhr.statusText}`)
                }
            })

            // Error handling
            xhr.addEventListener('error', () => {
                setUploadProgress({
                    progress: 0,
                    status: 'error',
                    message: 'خطأ في الاتصال بالخادم'
                })
                options.onError?.('خطأ في الاتصال بالخادم')
            })

            // Network error handling
            xhr.addEventListener('abort', () => {
                setUploadProgress({
                    progress: 0,
                    status: 'error',
                    message: 'تم إلغاء الرفع'
                })
                options.onError?.('تم إلغاء الرفع')
            })

            // Start upload
            xhr.open('POST', uploadUrl)
            xhr.send(formData)

        } catch (error) {
            setUploadProgress({
                progress: 0,
                status: 'error',
                message: error instanceof Error ? error.message : 'خطأ غير معروف'
            })
            options.onError?.(error instanceof Error ? error.message : 'خطأ غير معروف')
        }
    }

    const resetUpload = () => {
        setUploadProgress({
            progress: 0,
            status: 'idle'
        })
    }

    return {
        uploadProgress,
        uploadFile,
        resetUpload
    }
} 