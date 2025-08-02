'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave, faArrowRight, faUpload, faTrash, faEye, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { useAlerts } from '@/components/ui/Alert'
import Alert from '@/components/ui/Alert'
import FileUpload, { UploadProgress } from '@/components/ui/FileUpload'
import { useFileUpload } from '@/hooks/useFileUpload'
import { getMimeType } from '@/lib/utils/clientUtils'
import '../products.css'

interface Category {
  _id: string
  name: string
  isActive: boolean
}

interface ProductFormData {
  name: string
  slug: string
  description: string
  price: number
  discountAmount?: number
  discountPercentage?: number
  categoryId: string
  images: string[]
  isActive: boolean
  isFeatured: boolean

  // Design customization options (Admin checkboxes)
  EnableCustomizations: boolean
  allowColorChanges: boolean
  allowTextEditing: boolean
  allowImageReplacement: boolean
  allowLogoUpload: boolean
  // Color themes (only shown if allowColorChanges = true)
  colors: {
    name: string
    hex: string
    description?: string
  }[]
  designFiles: {
    fileName: string
    fileType: string
    description: string
    isActive: boolean
    uploadedFiles: {
      fileName: string
      fileType: string
      fileUrl: string
      fileSize: number
      isTemp?: boolean
    }[]
  }[]
}

export default function AddProduct() {
  const { data: session } = useSession()
  const router = useRouter()
  const { alerts, showSuccess, showError, showWarning, showInfo } = useAlerts()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingDesignFiles, setSavingDesignFiles] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [oldSlug, setOldSlug] = useState<string>('') // Track old slug for file migration
  const [originalSlug, setOriginalSlug] = useState<string>('') // Track original slug when files were uploaded
  const [slugChangeTimeout, setSlugChangeTimeout] = useState<NodeJS.Timeout | null>(null) // Debounce timeout
  const currentSlugRef = useRef<string>('') // Track current slug for debouncing
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    price: 0,
    categoryId: '',
    images: [],
    isActive: true,
    isFeatured: false,
    // Design customization options
    EnableCustomizations: false,
    allowColorChanges: false,
    allowTextEditing: false,
    allowImageReplacement: false,
    allowLogoUpload: false,
    // Color themes
    colors: [],
    designFiles: [],
  })

  // Load categories on component mount
  useEffect(() => {
    fetchCategories()
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (slugChangeTimeout) {
        clearTimeout(slugChangeTimeout)
      }
    }
  }, [slugChangeTimeout])

  // Reset original slug when all files are removed
  useEffect(() => {
    const hasFiles = formData.designFiles.some((df) => df.uploadedFiles.length > 0)
    if (!hasFiles && originalSlug) {
      setOriginalSlug('')
      setOldSlug('')
      console.log('All files removed, clearing original slug')
    }
  }, [formData.designFiles, originalSlug])

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true)
      const response = await fetch('/api/admin/categories')
      const data = await response.json()

      if (response.ok) {
        setCategories(data.data || [])
      } else {
        console.error('Categories API error:', data)
      }
    } catch (error) {
      console.error('خطأ في جلب التصنيفات:', error)
    } finally {
      setCategoriesLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProductFormData, value: unknown) => {
    setFormData((prev) => {
      // Auto-generate slug when name changes
      let updatedData = { ...prev, [field]: value }

      if (field === 'name' && typeof value === 'string') {
        // Generate slug from name
        const slug = value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
          .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

        updatedData = { ...updatedData, slug }
      }

      // Auto-format slug when slug field changes
      if (field === 'slug' && typeof value === 'string') {
        // Only format if the value contains spaces or special characters
        let formattedSlug = value

        if (value.includes(' ') || /[^a-z0-9-]/.test(value)) {
          formattedSlug = value
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        }

        // Store original slug when files are first uploaded
        const hasFiles = prev.designFiles.some((df) => df.uploadedFiles.length > 0)
        if (hasFiles && !originalSlug) {
          // This is the first time we have files, store the current slug as original
          setOriginalSlug(prev.slug)
          console.log(`Setting original slug: '${prev.slug}'`) // Debug log
        }

        // Store old slug before updating - this is the key fix
        if (prev.slug && prev.slug !== formattedSlug) {
          console.log(`Storing old slug: '${prev.slug}' -> new slug: '${formattedSlug}'`) // Debug log
          setOldSlug(prev.slug) // Store the actual current slug before change
        }

        updatedData = { ...updatedData, slug: formattedSlug }
      }

      return updatedData
    })

    // Handle slug debouncing outside of setFormData - only if files exist
    if (field === 'slug' && typeof value === 'string') {
      // Only set up debouncing if there are files to move
      const hasFiles = formData.designFiles.some((df) => df.uploadedFiles.length > 0)

      if (hasFiles) {
        // Clear existing timeout
        if (slugChangeTimeout) {
          clearTimeout(slugChangeTimeout)
        }

        // Set new timeout for debounced slug change
        const newTimeout = setTimeout(() => {
          const newSlug = typeof value === 'string' ? value : ''
          if (newSlug.includes(' ') || /[^a-z0-9-]/.test(newSlug)) {
            const formattedSlug = newSlug
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')
            handleSlugChange(formattedSlug)
          } else {
            handleSlugChange(newSlug)
          }
        }, 1000) // Wait 1 second after user stops typing

        setSlugChangeTimeout(newTimeout)
      } else {
        // No files to move, clear any existing timeout
        if (slugChangeTimeout) {
          clearTimeout(slugChangeTimeout)
          setSlugChangeTimeout(null)
        }
      }
    }
  }

  const addColorTheme = () => {
    setFormData((prev) => ({
      ...prev,
      colors: [
        ...prev.colors,
        {
          name: '',
          hex: '#000000',
          description: '',
        },
      ],
    }))
  }

  const removeColorTheme = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index),
    }))
  }

  const handleColorThemeChange = (index: number, field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.map((color, i) => (i === index ? { ...color, [field]: value } : color)),
    }))
  }

  const addDesignFile = () => {
    setFormData((prev) => ({
      ...prev,
      designFiles: [
        ...prev.designFiles,
        {
          fileName: '',
          fileType: 'psd',
          description: '',
          isActive: true,
          uploadedFiles: [],
        },
      ],
    }))
  }

  const removeDesignFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      designFiles: prev.designFiles.filter((_, i) => i !== index),
    }))
  }

  const handleDesignFileChange = (index: number, field: string, value: unknown) => {
    setFormData((prev) => {
      const updatedDesignFiles = prev.designFiles.map((file, i) => (i === index ? { ...file, [field]: value } : file))

      return {
        ...prev,
        designFiles: updatedDesignFiles,
      }
    })
  }

  // Single global upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle')
  const [currentUploadingFile, setCurrentUploadingFile] = useState<{
    fileName: string
    designFileIndex: number
  } | null>(null)

  const { uploadFile: uploadDesignFile } = useFileUpload({
    onSuccess: async (result, fileInfo?: { fileName: string; designFileIndex: number }) => {
      // Add a small delay to ensure file is properly written to disk
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Add the uploaded file to the form data
      setFormData((prev) => {
        const updatedDesignFiles = [...prev.designFiles]

        if (fileInfo) {
          const { designFileIndex } = fileInfo
          const currentFile = updatedDesignFiles[designFileIndex]

          if (currentFile) {
            const updatedUploadedFiles = currentFile.uploadedFiles.map((uploadedFile) => {
              if (uploadedFile.isTemp && uploadedFile.fileName === fileInfo.fileName) {
                return {
                  fileName: result.data.fileName,
                  fileType: result.data.fileType,
                  fileUrl: result.data.fileUrl,
                  fileSize: result.data.fileSize,
                  isTemp: false,
                }
              }
              return uploadedFile
            })

            updatedDesignFiles[designFileIndex] = {
              ...currentFile,
              uploadedFiles: updatedUploadedFiles,
            }
          }
        }

        return {
          ...prev,
          designFiles: updatedDesignFiles,
        }
      })

      // Show success state briefly
      setUploadStatus('success')
      setUploadProgress(100)

      // Reset upload state after a delay
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setUploadStatus('idle')
        setCurrentUploadingFile(null)
      }, 2000)

      showSuccess('تم رفع الملف', 'تم رفع ملف التصميم بنجاح')
    },
    onError: (error) => {
      // Reset upload state
      setIsUploading(false)
      setUploadProgress(0)
      setUploadStatus('idle')
      setCurrentUploadingFile(null)

      // Remove any temporary files
      setFormData((prev) => {
        const updatedDesignFiles = [...prev.designFiles]
        updatedDesignFiles.forEach((designFile, index) => {
          updatedDesignFiles[index] = {
            ...designFile,
            uploadedFiles: designFile.uploadedFiles.filter((file) => !file.isTemp),
          }
        })

        return {
          ...prev,
          designFiles: updatedDesignFiles,
        }
      })

      showError('خطأ في رفع الملف', error)
    },
    onProgress: (progress) => {
      setUploadProgress(progress)
    },
  })

  const handleDesignFileUpload = async (file: File, index: number) => {
    // Check if slug is valid before allowing upload
    if (!isSlugValidForUpload()) {
      showError('رابط المنتج مطلوب', 'يرجى إدخال رابط المنتج أولاً قبل رفع الملفات')
      return
    }

    const fileType = file.name.split('.').pop()?.toLowerCase() || ''

    // Validate file type
    const allowedTypes = [
      'psd',
      'ai',
      'eps',
      'pdf',
      'svg',
      'zip',
      'rar',
      'png',
      'jpg',
      'jpeg',
      'gif',
      'webp',
      'mp4',
      'avi',
      'mov',
      'wmv',
      'flv',
      'webm',
      'mkv',
    ]

    if (!allowedTypes.includes(fileType)) {
      showError('نوع الملف غير مدعوم', 'يرجى اختيار ملف من الأنواع المدعومة')
      return
    }

    // Check if already uploading
    if (isUploading) {
      showWarning('الملف قيد الرفع', 'يرجى الانتظار حتى انتهاء الرفع الحالي')
      return
    }

    // Set upload state
    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus('uploading')
    setCurrentUploadingFile({ fileName: file.name, designFileIndex: index })

    // Add temporary file entry
    setFormData((prev) => {
      const updatedDesignFiles = [...prev.designFiles]
      const currentFile = updatedDesignFiles[index]

      const tempUploadedFile = {
        fileName: file.name,
        fileType,
        fileUrl: '',
        fileSize: file.size,
        isTemp: true,
      }

      updatedDesignFiles[index] = {
        ...currentFile,
        uploadedFiles: [...(currentFile.uploadedFiles || []), tempUploadedFile],
      }

      return {
        ...prev,
        designFiles: updatedDesignFiles,
      }
    })

    // Start upload with slug instead of temp
    const fileInfo = { fileName: file.name, designFileIndex: index }
    await uploadDesignFile(
      file,
      '/api/admin/upload/design-file',
      {
        fileName: file.name,
        fileType,
        description: formData.designFiles[index]?.description || '',
        productId: 'temp', // This will be updated after product creation
        productSlug: formData.slug, // Add slug for proper folder organization
      },
      fileInfo
    )
  }

  const {
    uploadFile: uploadImage,
    uploadProgress: imageProgress,
    resetUpload: resetImageUpload,
  } = useFileUpload({
    onSuccess: (result) => {
      if (result.success && result.urls) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...result.urls],
        }))
        showSuccess('تم رفع الصور', `تم رفع ${result.urls.length} صورة بنجاح!`)
      }
    },
    onError: (error) => {
      showError('خطأ في رفع الصور', error)
    },
  })

  const handleImageUpload = async (file: File) => {
    await uploadImage(file, '/api/admin/upload/image', {
      fileName: file.name,
    })
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  // Function to parse validation errors and return user-friendly messages
  const parseValidationErrors = (errors: Array<{ path?: string[]; message?: string }>): string => {
    const errorMessages: string[] = []

    errors.forEach((error) => {
      const field = error.path?.[0] || 'unknown'
      const message = error.message || 'Invalid value'

      // Map field names to Arabic
      const fieldNames: { [key: string]: string } = {
        name: 'اسم المنتج',
        slug: 'رابط المنتج',
        description: 'وصف المنتج',
        price: 'السعر',
        categoryId: 'التصنيف',
        images: 'الصور',
        youtubeLink: 'رابط اليوتيوب',
        colors: 'الألوان',
        designFiles: 'ملفات التصميم',
      }

      const arabicFieldName = fieldNames[field] || field

      // Map common validation messages to Arabic
      let arabicMessage = message
      if (message.includes('Slug can only contain lowercase letters, numbers, and hyphens')) {
        arabicMessage = 'يجب أن يحتوي رابط المنتج على أحرف إنجليزية صغيرة وأرقام وشرطات فقط'
      } else if (message.includes('must be at least')) {
        arabicMessage = `يجب أن يحتوي ${arabicFieldName} على ${message.match(/\d+/)?.[0] || ''} أحرف على الأقل`
      } else if (message.includes('cannot exceed')) {
        arabicMessage = `لا يمكن أن يتجاوز ${arabicFieldName} ${message.match(/\d+/)?.[0] || ''} حرف`
      } else if (message.includes('is required')) {
        arabicMessage = `${arabicFieldName} مطلوب`
      } else if (message.includes('Please provide a valid')) {
        arabicMessage = `يرجى إدخال ${arabicFieldName} صحيح`
      } else if (message.includes('At least one')) {
        arabicMessage = `يجب إضافة ${arabicFieldName} واحد على الأقل`
      }

      errorMessages.push(`${arabicFieldName}: ${arabicMessage}`)
    })

    return errorMessages.join('\n')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.slug || !formData.description || !formData.price || !formData.categoryId) {
      showWarning('حقول مطلوبة', 'يرجى ملء جميع الحقول المطلوبة')
      return
    }

    // Check if any files are still uploading
    const hasUploadingFiles = formData.designFiles.some((designFile) =>
      designFile.uploadedFiles.some((file) => file.isTemp)
    )

    if (hasUploadingFiles) {
      showWarning('ملفات قيد الرفع', 'يرجى الانتظار حتى انتهاء رفع جميع الملفات قبل حفظ المنتج')
      return
    }

    // Check if any upload is in progress
    if (isUploading) {
      showWarning('رفع قيد التقدم', 'يرجى الانتظار حتى انتهاء عملية الرفع الحالية')
      return
    }

    setSaving(true)
    try {
      // Create the product first
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (response.ok) {
        const productId = data.data._id
        console.log('Product created with ID:', productId)
        console.log('Product data:', data.data)

        // Save design files to database after product creation
        const uploadedFiles = formData.designFiles.flatMap((designFile) =>
          designFile.uploadedFiles.filter((file) => !file.isTemp)
        )

        if (uploadedFiles.length > 0) {
          const designFileErrors: string[] = []
          setSavingDesignFiles(true)

          // Save each design file to database with the correct productId
          for (const designFile of formData.designFiles) {
            const filesToSave = designFile.uploadedFiles.filter((file) => !file.isTemp)

            for (const file of filesToSave) {
              try {
                // Validate file data before sending
                if (!file.fileUrl || !file.fileName || !file.fileType) {
                  const errorMsg = `بيانات الملف غير مكتملة: ${file.fileName}`
                  console.error(errorMsg, file)
                  designFileErrors.push(errorMsg)
                  continue
                }

                const designFileData = {
                  productId: productId, // Use the actual productId
                  fileName: file.fileName,
                  fileUrl: file.fileUrl,
                  fileType: file.fileType,
                  fileSize: file.fileSize,
                  mimeType: getMimeType(file.fileName),
                  description: designFile.description || '',
                  isActive: true,
                  isPublic: false,
                }
                console.log('Saving design file with productId:', productId)
                console.log('Design file data:', designFileData)

                // Retry mechanism for saving design files
                let retryCount = 0
                const maxRetries = 3
                let designFileResponse
                let errorData

                while (retryCount < maxRetries) {
                  try {
                    designFileResponse = await fetch('/api/admin/design-files', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(designFileData),
                    })

                    if (designFileResponse.ok) {
                      console.log(`Successfully saved design file: ${file.fileName}`)
                      break // Success, exit retry loop
                    }

                    // Read response body only once
                    errorData = await designFileResponse.json()

                    // If it's a file not found error, wait a bit and retry
                    if (
                      errorData.message &&
                      errorData.message.includes('File not found') &&
                      retryCount < maxRetries - 1
                    ) {
                      console.log(`File not found, retrying in 1 second... (attempt ${retryCount + 1}/${maxRetries})`)
                      await new Promise((resolve) => setTimeout(resolve, 1000))
                      retryCount++
                      continue
                    }

                    // For other errors, don't retry
                    break
                  } catch (fetchError) {
                    console.error(`Fetch error on attempt ${retryCount + 1}:`, fetchError)
                    if (retryCount < maxRetries - 1) {
                      await new Promise((resolve) => setTimeout(resolve, 1000))
                      retryCount++
                      continue
                    }
                    throw fetchError
                  }
                }

                if (!designFileResponse?.ok) {
                  const errorMsg = `فشل في حفظ ملف التصميم "${file.fileName}": ${errorData?.message || 'خطأ غير معروف'}`
                  console.error('Failed to save design file:', file.fileName)
                  console.error('Error response:', errorData)
                  designFileErrors.push(errorMsg)
                }
              } catch (error) {
                const errorMsg = `خطأ في حفظ ملف التصميم "${file.fileName}": ${
                  error instanceof Error ? error.message : 'خطأ غير معروف'
                }`
                console.error('Error saving design file:', error)
                designFileErrors.push(errorMsg)
              }
            }
          }

          // Show warnings for any design file errors
          if (designFileErrors.length > 0) {
            showWarning(
              'تحذير: بعض ملفات التصميم',
              `تم إنشاء المنتج بنجاح، لكن حدثت أخطاء في حفظ بعض ملفات التصميم:\n${designFileErrors.join('\n')}`
            )
            // Still redirect even with warnings since the product was created successfully
            setTimeout(() => {
              router.push('/admin/products')
            }, 2000) // Give more time to read the warning
          } else {
            showSuccess('تم إنشاء المنتج', 'تم إنشاء المنتج وملفات التصميم بنجاح!')
            // Wait a moment for the success message to be displayed before redirecting
            setTimeout(() => {
              router.push('/admin/products')
            }, 1000)
          }
        } else {
          showSuccess('تم إنشاء المنتج', 'تم إنشاء المنتج بنجاح!')
          // Wait a moment for the success message to be displayed before redirecting
          setTimeout(() => {
            router.push('/admin/products')
          }, 1000)
        }

        setSavingDesignFiles(false)
      } else {
        // Handle validation errors specifically
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessage = parseValidationErrors(data.errors)
          showError('خطأ في البيانات المدخلة', errorMessage)
        } else {
          showError('خطأ في إنشاء المنتج', data.message || 'حدث خطأ أثناء إنشاء المنتج')
        }
        setSavingDesignFiles(false)
      }
    } catch (error) {
      console.error('خطأ في إنشاء المنتج:', error)
      showError('خطأ في إنشاء المنتج', 'حدث خطأ غير متوقع أثناء إنشاء المنتج')
      setSavingDesignFiles(false)
    } finally {
      setSaving(false)
    }
  }

  const calculateFinalPrice = () => {
    let finalPrice = formData.price
    if (formData.discountAmount) {
      finalPrice -= formData.discountAmount
    }
    if (formData.discountPercentage) {
      finalPrice -= (finalPrice * formData.discountPercentage) / 100
    }
    return Math.max(0, finalPrice)
  }

  // Function to check if all file uploads are complete
  const areAllUploadsComplete = () => {
    // Check if any upload is in progress
    if (isUploading) return false

    // Check if any files are still marked as temporary
    const hasTempFiles = formData.designFiles.some((designFile) => designFile.uploadedFiles.some((file) => file.isTemp))

    return !hasTempFiles
  }

  // Function to check if slug is valid for file upload
  const isSlugValidForUpload = () => {
    return formData.slug && formData.slug.trim().length > 0 && /^[a-z0-9-]+$/.test(formData.slug)
  }

  // Function to handle slug changes and update file paths
  const handleSlugChange = async (newSlug: string) => {
    // Only proceed if there are files to move
    const hasFiles = formData.designFiles.some((df) => df.uploadedFiles.length > 0)
    if (!hasFiles) {
      return // No files to move, just return
    }

    // Use the original slug where files were first uploaded
    const sourceSlug = originalSlug || formData.slug
    if (sourceSlug && sourceSlug !== newSlug) {
      console.log(`Moving files from original slug '${sourceSlug}' to '${newSlug}'`) // Debug log

      try {
        // Call API to move files from old folder to new folder
        const response = await fetch('/api/admin/upload/move-files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oldSlug: sourceSlug,
            newSlug: newSlug,
            files: formData.designFiles
              .flatMap((df) => df.uploadedFiles)
              .map((file) => ({
                fileName: file.fileName,
                oldUrl: file.fileUrl,
              })),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to move files')
        }

        const result = await response.json()

        // Update file paths in state with new URLs
        setFormData((prev) => ({
          ...prev,
          designFiles: prev.designFiles.map((designFile) => ({
            ...designFile,
            uploadedFiles: designFile.uploadedFiles.map((file) => {
              const updatedFile = result.files.find(
                (f: { fileName: string; newUrl: string }) => f.fileName === file.fileName
              )
              return updatedFile ? { ...file, fileUrl: updatedFile.newUrl } : file
            }),
          })),
        }))

        // Clear old slugs after successful migration
        setOldSlug('')
        setOriginalSlug('') // Clear original slug since files are now in new location
        showSuccess('تم تحديث مسارات الملفات', 'تم نقل الملفات بنجاح')
      } catch (error) {
        console.error('Error moving files:', error)
        // Revert slug change on error
        setFormData((prev) => ({ ...prev, slug: sourceSlug }))
        setOldSlug('')
        showError('خطأ في نقل الملفات', 'فشل في نقل الملفات، تم إعادة رابط المنتج')
      }
    }
  }

  return (
    <>
      {/* Alerts Container */}
      <div className="alerts-container">
        {alerts.map((alert, index) => (
          <Alert
            key={index}
            type={alert.type}
            title={alert.title}
            message={alert.message}
            duration={alert.duration}
            onClose={alert.onClose}
          />
        ))}
      </div>

      <div className="products-container">
        {/* Global Upload Progress Bar */}
        {isUploading && (
          <div className="global-upload-progress">
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <span className="progress-text">{Math.round(uploadProgress)}%</span>
            </div>
            <p className="progress-message">جاري رفع الملف...</p>
          </div>
        )}

        {/* Global Design Files Saving Progress */}
        {savingDesignFiles && (
          <div className="global-upload-progress">
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '100%', animation: 'pulse 2s infinite' }} />
              </div>
              <span className="progress-text">جاري المعالجة...</span>
            </div>
            <p className="progress-message">جاري حفظ ملفات التصميم في قاعدة البيانات...</p>
          </div>
        )}

        <div className="products-header">
          <div className="header-content">
            <h1>إضافة منتج جديد</h1>
            <p>إنشاء منتج جديد مع ملفات التصميم والفيديو</p>
          </div>
          <button onClick={() => router.push('/admin/products')} className="back-btn">
            <FontAwesomeIcon icon={faArrowRight} />
            العودة للمنتجات
          </button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-grid">
            {/* Basic Information */}
            <div className="form-section">
              <h2>المعلومات الأساسية</h2>

              <div className="form-group">
                <label htmlFor="name">اسم المنتج *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="أدخل اسم المنتج"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="slug">رابط المنتج (Slug) *</label>
                <input
                  type="text"
                  id="slug"
                  value={formData.slug || ''}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="اسم-المنتج-بالانجليزية"
                  required
                />
                <small className="form-hint">يتم إنشاؤه تلقائياً من اسم المنتج. يمكنك تعديله يدوياً إذا أردت</small>
              </div>

              <div className="form-group">
                <label htmlFor="description">وصف المنتج *</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="أدخل وصف المنتج"
                  rows={4}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">السعر الأساسي *</label>
                  <input
                    type="number"
                    id="price"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00 USD"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">التصنيف *</label>
                  <select
                    id="category"
                    value={formData.categoryId}
                    onChange={(e) => handleInputChange('categoryId', e.target.value)}
                    required
                    disabled={categoriesLoading}
                  >
                    <option value="">{categoriesLoading ? 'جاري التحميل...' : 'اختر التصنيف'}</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && !categoriesLoading && (
                    <small style={{ color: '#f56565', marginTop: '0.5rem', display: 'block' }}>
                      لا توجد تصنيفات متاحة. يرجى إنشاء تصنيف أولاً.
                    </small>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing and Discounts */}
            <div className="form-section">
              <h2>التسعير والخصومات</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="discountAmount">مبلغ الخصم</label>
                  <input
                    type="number"
                    id="discountAmount"
                    value={formData.discountAmount || ''}
                    onChange={(e) => handleInputChange('discountAmount', parseFloat(e.target.value) || undefined)}
                    placeholder="0.00 USD"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="discountPercentage">نسبة الخصم (%)</label>
                  <input
                    type="number"
                    id="discountPercentage"
                    value={formData.discountPercentage || ''}
                    onChange={(e) => handleInputChange('discountPercentage', parseFloat(e.target.value) || undefined)}
                    placeholder="0%"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="price-preview">
                <h3>معاينة السعر</h3>
                <div className="price-breakdown">
                  <div className="price-item">
                    <span>السعر الأساسي:</span>
                    <span>${formData.price.toFixed(2)}</span>
                  </div>
                  {formData.discountAmount && (
                    <div className="price-item discount">
                      <span>خصم مبلغ:</span>
                      <span>-${formData.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {formData.discountPercentage && (
                    <div className="price-item discount">
                      <span>خصم نسبة:</span>
                      <span>-${((formData.price * formData.discountPercentage) / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="price-item final">
                    <span>السعر النهائي:</span>
                    <span>${calculateFinalPrice().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="form-section">
              <h2>صور المنتج</h2>

              <div className="image-upload-section">
                <FileUpload
                  key="image-upload"
                  label="صور المنتج"
                  accept="image/*"
                  maxSize={10}
                  multiple={true}
                  onFileSelect={handleImageUpload}
                  disabled={loading}
                  placeholder="اختر صور المنتج أو اسحبها هنا"
                  className="multiple-upload"
                  externalProgress={imageProgress}
                  onReset={resetImageUpload}
                />
                <p className="upload-hint">يدعم: JPG, PNG, WebP (أقصى 5 صور)</p>
              </div>

              {formData.images.length > 0 && (
                <div className="images-preview">
                  {formData.images.map((image, index) => (
                    <div key={index} className="image-item">
                      <img src={image} alt={`صورة ${index + 1}`} />
                      <button type="button" onClick={() => removeImage(index)} className="remove-image-btn">
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Design Files */}
            <div className="form-section">
              <h2>ملفات التصميم والفيديو</h2>
              <p className="section-description">أضف ملفات التصميم والفيديو التي سيحصل عليها العملاء عند الشراء</p>

              {!isSlugValidForUpload() && (
                <div className="slug-requirement-warning">
                  <p>⚠️ يرجى إدخال رابط المنتج أولاً قبل رفع الملفات</p>
                </div>
              )}

              {formData.designFiles.map((file, index) => {
                return (
                  <div key={index} className="design-file-item">
                    <div className="form-row">
                      <div className="form-group">
                        <label>اسم الملف</label>
                        <input
                          type="text"
                          value={file.fileName}
                          onChange={(e) => handleDesignFileChange(index, 'fileName', e.target.value)}
                          placeholder="مثال: تصميم الشعار.psd"
                        />
                      </div>
                      <div className="form-group">
                        <label>نوع الملف</label>
                        <select
                          value={file.fileType}
                          onChange={(e) => handleDesignFileChange(index, 'fileType', e.target.value)}
                        >
                          <option value="psd">PSD - Photoshop</option>
                          <option value="ai">AI - Illustrator</option>
                          <option value="eps">EPS - Encapsulated PostScript</option>
                          <option value="pdf">PDF - Portable Document</option>
                          <option value="svg">SVG - Scalable Vector</option>
                          <option value="zip">ZIP - Archive</option>
                          <option value="rar">RAR - Archive</option>
                          <option value="png">PNG - Image</option>
                          <option value="jpg">JPG - Image</option>
                          <option value="jpeg">JPEG - Image</option>
                          <option value="gif">GIF - Image</option>
                          <option value="webp">WebP - Image</option>
                          <option value="mp4">MP4 - Video</option>
                          <option value="avi">AVI - Video</option>
                          <option value="mov">MOV - Video</option>
                          <option value="wmv">WMV - Video</option>
                          <option value="flv">FLV - Video</option>
                          <option value="webm">WebM - Video</option>
                          <option value="mkv">MKV - Video</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>وصف الملف</label>
                      <textarea
                        value={file.description}
                        onChange={(e) => handleDesignFileChange(index, 'description', e.target.value)}
                        placeholder="وصف مختصر للملف وما يحتويه"
                        rows={2}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={file.isActive}
                          onChange={(e) => handleDesignFileChange(index, 'isActive', e.target.checked)}
                        />
                        الملف متاح للعملاء
                      </label>
                    </div>

                    <div className="form-group">
                      <FileUpload
                        key={`design-file-upload-${index}`}
                        label="رفع الملف"
                        accept=".psd,.ai,.eps,.pdf,.svg,.zip,.rar,.png,.jpg,.jpeg,.gif,.webp,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv"
                        maxSize={0}
                        multiple={true}
                        onFileSelect={(file) => handleDesignFileUpload(file, index)}
                        disabled={loading || isUploading || !isSlugValidForUpload()}
                        placeholder={
                          !isSlugValidForUpload() ? 'يرجى إدخال رابط المنتج أولاً' : 'اختر ملفات التصميم أو الفيديو'
                        }
                        externalProgress={
                          isUploading || uploadStatus === 'success'
                            ? {
                                progress: uploadProgress,
                                status: uploadStatus,
                                message: uploadStatus === 'success' ? 'تم رفع الملف بنجاح' : 'جاري رفع الملف...',
                              }
                            : undefined
                        }
                        uploadedFiles={formData.designFiles[index]?.uploadedFiles || []}
                        onFileRemove={async (fileName) => {
                          // Find the file to get its URL
                          const fileToDelete = formData.designFiles[index]?.uploadedFiles.find(
                            (f) => f.fileName === fileName
                          )

                          if (fileToDelete?.fileUrl) {
                            try {
                              // Delete file from server
                              const response = await fetch('/api/admin/upload/delete-file', {
                                method: 'DELETE',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  fileUrl: fileToDelete.fileUrl,
                                }),
                              })

                              const result = await response.json()

                              if (!result.success) {
                                showError('خطأ في حذف الملف', result.message || 'فشل في حذف الملف من الخادم')
                                return
                              }
                            } catch (error) {
                              console.error('Error deleting file:', error)
                              showError('خطأ في حذف الملف', 'حدث خطأ أثناء حذف الملف من الخادم')
                              return
                            }
                          }

                          // Remove file from UI state
                          setFormData((prev) => {
                            const updatedDesignFiles = [...prev.designFiles]
                            if (updatedDesignFiles[index]) {
                              updatedDesignFiles[index] = {
                                ...updatedDesignFiles[index],
                                uploadedFiles: updatedDesignFiles[index].uploadedFiles.filter(
                                  (f) => f.fileName !== fileName
                                ),
                              }
                            }
                            return {
                              ...prev,
                              designFiles: updatedDesignFiles,
                            }
                          })

                          showSuccess('تم حذف الملف', 'تم حذف الملف بنجاح')
                        }}
                        onReset={() => {
                          setIsUploading(false)
                          setUploadProgress(0)
                          setUploadStatus('idle')
                        }}
                        onRefresh={() => {
                          // Update all temp files to permanent status
                          setFormData((prev) => {
                            const updatedDesignFiles = [...prev.designFiles]
                            if (updatedDesignFiles[index]) {
                              const updatedUploadedFiles = updatedDesignFiles[index].uploadedFiles.map((file) => ({
                                ...file,
                                isTemp: false,
                              }))

                              updatedDesignFiles[index] = {
                                ...updatedDesignFiles[index],
                                uploadedFiles: updatedUploadedFiles,
                              }
                            }

                            return {
                              ...prev,
                              designFiles: updatedDesignFiles,
                            }
                          })

                          setIsUploading(false)
                          setUploadProgress(0)
                          setUploadStatus('idle')
                        }}
                      />
                    </div>
                  </div>
                )
              })}

              <button type="button" onClick={addDesignFile} className="add-file-btn">
                <FontAwesomeIcon icon={faPlus} />
                إضافة ملف تصميم
              </button>
            </div>

            {/* Design Customization Options */}
            <div className="form-section">
              <h2>خيارات تخصيص التصميم</h2>
              <p className="section-description">حدد ما يمكن للعملاء تخصيصه في هذا المنتج</p>

              {/* Enable Customizations */}
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.EnableCustomizations}
                    onChange={(e) => handleInputChange('EnableCustomizations', e.target.checked)}
                  />
                  تفعيل خيارات التخصيص للعملاء
                </label>
              </div>

              {/* Customization Options */}
              {formData.EnableCustomizations && (
                <div className="customization-options">
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.allowColorChanges}
                        onChange={(e) => handleInputChange('allowColorChanges', e.target.checked)}
                      />
                      السماح بتغيير الألوان
                    </label>
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.allowTextEditing}
                        onChange={(e) => handleInputChange('allowTextEditing', e.target.checked)}
                      />
                      السماح بتعديل النصوص
                    </label>
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.allowImageReplacement}
                        onChange={(e) => handleInputChange('allowImageReplacement', e.target.checked)}
                      />
                      السماح باستبدال الصور
                    </label>
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.allowLogoUpload}
                        onChange={(e) => handleInputChange('allowLogoUpload', e.target.checked)}
                      />
                      السماح برفع الشعار
                    </label>
                  </div>

                  {/* Color Themes */}
                  {formData.allowColorChanges && (
                    <div className="color-themes-section">
                      <h3>ألوان التصميم</h3>
                      <p className="section-description">أضف الألوان التي يمكن للعملاء الاختيار منها</p>

                      {formData.colors.map((color, index) => (
                        <div key={index} className="color-theme-item">
                          <div className="form-row">
                            <div className="form-group">
                              <label>اسم اللون</label>
                              <input
                                type="text"
                                value={color.name}
                                onChange={(e) => handleColorThemeChange(index, 'name', e.target.value)}
                                placeholder="مثال: اللون الأساسي"
                              />
                            </div>
                            <div className="form-group">
                              <label>كود اللون</label>
                              <div className="color-input-wrapper">
                                <input
                                  type="color"
                                  value={color.hex}
                                  onChange={(e) => handleColorThemeChange(index, 'hex', e.target.value)}
                                  className="color-picker"
                                />
                                <input
                                  type="text"
                                  value={color.hex}
                                  onChange={(e) => handleColorThemeChange(index, 'hex', e.target.value)}
                                  placeholder="#000000"
                                  className="color-hex-input"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="form-group">
                            <label>وصف اللون</label>
                            <input
                              type="text"
                              value={color.description || ''}
                              onChange={(e) => handleColorThemeChange(index, 'description', e.target.value)}
                              placeholder="وصف مختصر للون"
                            />
                          </div>
                          <button type="button" onClick={() => removeColorTheme(index)} className="remove-color-btn">
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      ))}

                      <button type="button" onClick={addColorTheme} className="add-color-btn">
                        <FontAwesomeIcon icon={faPlus} />
                        إضافة لون جديد
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="form-section">
              <h2>الإعدادات</h2>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  />
                  المنتج نشط
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                  />
                  منتج مميز
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" onClick={() => router.push('/admin/products')} className="cancel-btn">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving || isUploading || savingDesignFiles || !areAllUploadsComplete()}
              className="save-btn"
            >
              <FontAwesomeIcon icon={faSave} />
              {saving
                ? 'جاري الحفظ...'
                : savingDesignFiles
                ? 'جاري حفظ ملفات التصميم...'
                : isUploading
                ? 'جاري رفع الملفات...'
                : 'حفظ المنتج'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
