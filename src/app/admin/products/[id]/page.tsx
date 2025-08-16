'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  images: {
    url: string
    alt?: string
    isPrimary: boolean
    order: number
  }[]
  youtubeLink?: string
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
    uploadedFiles?: {
      fileName: string
      fileType: string
      fileUrl: string
      fileSize: number
      isTemp?: boolean
    }[]
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

interface DesignFile {
  _id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  description: string
  isActive: boolean
  isPublic: boolean
  productId: string
  createdAt: string
  updatedAt: string
  isTemp?: boolean
}

export default function EditProduct() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const { alerts, showSuccess, showError, showWarning, showInfo } = useAlerts()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingDesignFiles, setSavingDesignFiles] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [productLoading, setProductLoading] = useState(true)
  const [oldSlug, setOldSlug] = useState<string>('')
  const [originalSlug, setOriginalSlug] = useState<string>('')
  const [slugChangeTimeout, setSlugChangeTimeout] = useState<NodeJS.Timeout | null>(null)
  const [originalColorNames, setOriginalColorNames] = useState<{ [key: number]: string }>({})
  const [colorNameChangeTimeouts, setColorNameChangeTimeouts] = useState<{ [key: number]: NodeJS.Timeout | null }>({})
  const currentSlugRef = useRef<string>('')

  // Single global upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle')
  const [currentUploadingFile, setCurrentUploadingFile] = useState<{
    fileName: string
    designFileIndex: number
  } | null>(null)

  // Image upload hook
  const {
    uploadFile: uploadImage,
    uploadProgress: imageProgress,
    resetUpload: resetImageUpload,
  } = useFileUpload({
    onSuccess: (result) => {
      if (result.success && result.urls) {
        setFormData((prev) => ({
          ...prev,
          images: [
            ...prev.images,
            ...result.urls.map((url: string, index: number) => ({
              url,
              alt: '',
              isPrimary: prev.images.length === 0 && index === 0, // First image is primary
              order: prev.images.length + index,
            })),
          ],
        }))
        showSuccess('تم رفع الصور', `تم رفع ${result.urls.length} صورة بنجاح!`)
      }
    },
    onError: (error) => {
      showError('خطأ في رفع الصور', error)
    },
  })

  // Design file upload hook
  const { uploadFile: uploadDesignFile } = useFileUpload({
    onSuccess: async (result, fileInfo?: { fileName: string; designFileIndex: number }) => {
      // Add a small delay to ensure file is properly written to disk
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Add the uploaded file to the form data
      setFormData((prev) => {
        // Check if this is a color file upload
        const isColorFile = prev.colors.some((color, index) =>
          color.uploadedFiles?.some((file) => file.isTemp && file.fileName === fileInfo?.fileName)
        )

        if (isColorFile && fileInfo) {
          // Handle color file upload
          const updatedColors = [...prev.colors]
          const colorIndex = updatedColors.findIndex((color) =>
            color.uploadedFiles?.some((file) => file.isTemp && file.fileName === fileInfo.fileName)
          )

          if (colorIndex !== -1) {
            const currentColor = updatedColors[colorIndex]
            const updatedUploadedFiles =
              currentColor.uploadedFiles?.map((uploadedFile) => {
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
              }) || []

            updatedColors[colorIndex] = {
              ...currentColor,
              uploadedFiles: updatedUploadedFiles,
            }
          }

          return {
            ...prev,
            colors: updatedColors,
          }
        } else {
          // Handle regular design file upload
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
        // Remove temp files from design files
        const updatedDesignFiles = [...prev.designFiles]
        updatedDesignFiles.forEach((designFile, index) => {
          updatedDesignFiles[index] = {
            ...designFile,
            uploadedFiles: designFile.uploadedFiles.filter((file) => !file.isTemp),
          }
        })

        // Remove temp files from colors
        const updatedColors = [...prev.colors]
        updatedColors.forEach((color, index) => {
          updatedColors[index] = {
            ...color,
            uploadedFiles: color.uploadedFiles?.filter((file) => !file.isTemp) || [],
          }
        })

        return {
          ...prev,
          designFiles: updatedDesignFiles,
          colors: updatedColors,
        }
      })

      showError('خطأ في رفع الملف', error)
    },
    onProgress: (progress) => {
      setUploadProgress(progress)
    },
  })

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    price: 0,
    categoryId: '',
    images: [],
    isActive: true,
    isFeatured: false,
    youtubeLink: '',
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

  // Load categories and product data on component mount
  useEffect(() => {
    fetchCategories()
    fetchProduct()
  }, [productId])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (slugChangeTimeout) {
        clearTimeout(slugChangeTimeout)
      }
      Object.values(colorNameChangeTimeouts).forEach((timeout) => {
        if (timeout) {
          clearTimeout(timeout)
        }
      })
    }
  }, [slugChangeTimeout, colorNameChangeTimeouts])

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

  const fetchProduct = async () => {
    try {
      setProductLoading(true)
      const response = await fetch(`/api/admin/products/${productId}`)
      const data = await response.json()

      if (response.ok) {
        const product = data.data

        // Fetch design files for this product
        const designFilesResponse = await fetch(`/api/admin/design-files?productId=${productId}`)
        const designFilesData = await designFilesResponse.json()

        let existingDesignFiles: DesignFile[] = []
        if (designFilesResponse.ok) {
          existingDesignFiles = designFilesData.data || []
        }

        console.log('Design files response:', {
          response: designFilesResponse.status,
          data: designFilesData,
          existingDesignFiles,
        })

        // Helper function to extract color name from file URL
        const extractColorFromFileUrl = (fileUrl: string, productSlug: string): string | null => {
          const pattern = new RegExp(`/uploads/designs/${productSlug}/([^/]+)/`)
          const match = fileUrl.match(pattern)
          return match ? match[1] : null
        }

        // Separate files by color and general files
        const colorFiles: { [colorName: string]: any[] } = {}
        const generalFiles: any[] = []

        existingDesignFiles.forEach((file: DesignFile) => {
          const colorName = extractColorFromFileUrl(file.fileUrl, product.slug)

          if (colorName) {
            // This is a color-specific file
            if (!colorFiles[colorName]) {
              colorFiles[colorName] = []
            }
            colorFiles[colorName].push({
              fileName: file.fileName,
              fileType: file.fileType,
              fileUrl: file.fileUrl,
              fileSize: file.fileSize,
              isTemp: false,
            })
          } else {
            // This is a general file
            generalFiles.push({
              fileName: file.fileName,
              fileType: file.fileType,
              fileUrl: file.fileUrl,
              fileSize: file.fileSize,
              isTemp: false,
            })
          }
        })

        console.log('File categorization:', {
          colorFiles,
          generalFiles,
          productSlug: product.slug,
        })

        // Transform product data to form format
        const transformedData: ProductFormData = {
          name: product.name || '',
          slug: product.slug || '',
          description: product.description || '',
          price: product.price || 0,
          discountAmount: product.discountAmount,
          discountPercentage: product.discountPercentage,
          categoryId: product.categoryId?._id || product.categoryId || '',
          images:
            product.images?.map((img: { url?: string; alt?: string; isPrimary?: boolean; order?: number }) => ({
              url: img.url || '',
              alt: img.alt || '',
              isPrimary: img.isPrimary || false,
              order: img.order || 0,
            })) || [],
          youtubeLink: product.youtubeLink || '',
          isActive: product.isActive ?? true,
          isFeatured: product.isFeatured ?? false,
          EnableCustomizations: product.EnableCustomizations ?? false,
          allowColorChanges: product.allowColorChanges ?? false,
          allowTextEditing: product.allowTextEditing ?? false,
          allowImageReplacement: product.allowImageReplacement ?? false,
          allowLogoUpload: product.allowLogoUpload ?? false,
          colors:
            product.colors?.map((color: { name?: string; hex?: string; description?: string }) => {
              const colorName = color.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
              return {
                name: color.name || '',
                hex: color.hex || '#000000',
                description: color.description || '',
                uploadedFiles: colorFiles[colorName] || [],
              }
            }) || [],
          designFiles:
            generalFiles.length > 0
              ? [
                  {
                    fileName: 'General Design Files',
                    fileType: 'psd',
                    description: 'General design files for all colors',
                    isActive: true,
                    uploadedFiles: generalFiles,
                  },
                ]
              : [
                  {
                    fileName: '',
                    fileType: 'psd',
                    description: '',
                    isActive: true,
                    uploadedFiles: [],
                  },
                ],
        }

        console.log('Final transformed data:', {
          colors: transformedData.colors,
          designFiles: transformedData.designFiles,
        })

        setFormData(transformedData)
        setOriginalSlug(product.slug || '')
      } else {
        showError('خطأ في تحميل المنتج', data.message || 'فشل في تحميل بيانات المنتج')
      }
    } catch (error) {
      console.error('خطأ في تحميل المنتج:', error)
      showError('خطأ في تحميل المنتج', 'حدث خطأ أثناء تحميل بيانات المنتج')
    } finally {
      setProductLoading(false)
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProductFormData, value: unknown) => {
    setFormData((prev) => {
      let updatedData = { ...prev, [field]: value }

      if (field === 'name' && typeof value === 'string') {
        const slug = value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')

        updatedData = { ...updatedData, slug }
      }

      if (field === 'slug' && typeof value === 'string') {
        let formattedSlug = value

        if (value.includes(' ') || /[^a-z0-9-]/.test(value)) {
          formattedSlug = value
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
        }

        const hasFiles = prev.designFiles.some((df) => df.uploadedFiles.length > 0)
        if (hasFiles && !originalSlug) {
          setOriginalSlug(prev.slug)
        }

        if (prev.slug && prev.slug !== formattedSlug) {
          setOldSlug(prev.slug)
        }

        updatedData = { ...updatedData, slug: formattedSlug }
      }

      return updatedData
    })

    // Handle slug debouncing
    if (field === 'slug' && typeof value === 'string') {
      const hasFiles = formData.designFiles.some((df) => df.uploadedFiles.length > 0)

      if (hasFiles) {
        if (slugChangeTimeout) {
          clearTimeout(slugChangeTimeout)
        }

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
        }, 1000)

        setSlugChangeTimeout(newTimeout)
      } else {
        if (slugChangeTimeout) {
          clearTimeout(slugChangeTimeout)
          setSlugChangeTimeout(null)
        }
      }
    }
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

    // Validate color variant files - each color must have at least one file
    if (formData.colors && formData.colors.length > 0) {
      const colorsWithoutFiles = []
      
      for (const color of formData.colors) {
        if (!color.uploadedFiles || color.uploadedFiles.length === 0) {
          colorsWithoutFiles.push(color.name)
        }
      }
      
      if (colorsWithoutFiles.length > 0) {
        showWarning(
          'ملفات الألوان مطلوبة', 
          `يجب رفع ملف واحد على الأقل لكل لون. الألوان التالية تحتاج ملفات: ${colorsWithoutFiles.join('، ')}`
        )
        return
      }
    }

    setSaving(true)
    try {
      console.log('Submitting form data:', {
        images: formData.images,
        formDataKeys: Object.keys(formData),
      })

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (response.ok) {
        console.log('Product updated successfully')

        // Save new design files to database after product update
        const uploadedFiles = formData.designFiles.flatMap((designFile) =>
          designFile.uploadedFiles.filter((file) => !file.isTemp)
        )

        // Save new color files to database after product update
        const uploadedColorFiles = formData.colors.flatMap(
          (color) => color.uploadedFiles?.filter((file) => !file.isTemp) || []
        )

        if (uploadedFiles.length > 0 || uploadedColorFiles.length > 0) {
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
                      console.log(`Design file saved successfully: ${file.fileName}`)
                      break
                    } else {
                      errorData = await designFileResponse.json()
                      retryCount++
                      if (retryCount < maxRetries) {
                        console.log(`Retry ${retryCount} for design file: ${file.fileName}`)
                        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
                      }
                    }
                  } catch (retryError) {
                    retryCount++
                    if (retryCount < maxRetries) {
                      console.log(`Retry ${retryCount} for design file: ${file.fileName}`)
                      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
                    }
                  }
                }

                if (!designFileResponse?.ok) {
                  const errorMsg = `فشل في حفظ ملف التصميم: ${file.fileName}`
                  console.error(errorMsg, errorData)
                  designFileErrors.push(errorMsg)
                }
              } catch (fileError) {
                const errorMsg = `خطأ في حفظ ملف التصميم: ${file.fileName}`
                console.error(errorMsg, fileError)
                designFileErrors.push(errorMsg)
              }
            }
          }

          // Save color files to database
          for (const color of formData.colors) {
            const colorFilesToSave = color.uploadedFiles?.filter((file) => !file.isTemp) || []

            for (const file of colorFilesToSave) {
              try {
                // Validate file data before sending
                if (!file.fileUrl || !file.fileName || !file.fileType) {
                  const errorMsg = `بيانات ملف اللون غير مكتملة: ${file.fileName}`
                  console.error(errorMsg, file)
                  designFileErrors.push(errorMsg)
                  continue
                }

                const colorFileData = {
                  productId: productId,
                  fileName: file.fileName,
                  fileUrl: file.fileUrl,
                  fileType: file.fileType,
                  fileSize: file.fileSize,
                  mimeType: getMimeType(file.fileName),
                  description: `ملف ${color.name}`,
                  isActive: true,
                  isPublic: false,
                  // Color variant fields
                  colorVariantName: color.name,
                  colorVariantHex: color.hex,
                  isColorVariant: true,
                }
                console.log('Saving color file with productId:', productId)
                console.log('Color file data:', colorFileData)

                // Retry mechanism for saving color files
                let retryCount = 0
                const maxRetries = 3
                let colorFileResponse
                let errorData

                while (retryCount < maxRetries) {
                  try {
                    colorFileResponse = await fetch('/api/admin/design-files', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(colorFileData),
                    })

                    if (colorFileResponse.ok) {
                      console.log(`Color file saved successfully: ${file.fileName}`)
                      break
                    } else {
                      errorData = await colorFileResponse.json()
                      retryCount++
                      if (retryCount < maxRetries) {
                        console.log(`Retry ${retryCount} for color file: ${file.fileName}`)
                        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
                      }
                    }
                  } catch (retryError) {
                    retryCount++
                    if (retryCount < maxRetries) {
                      console.log(`Retry ${retryCount} for color file: ${file.fileName}`)
                      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
                    }
                  }
                }

                if (!colorFileResponse?.ok) {
                  const errorMsg = `فشل في حفظ ملف اللون: ${file.fileName}`
                  console.error(errorMsg, errorData)
                  designFileErrors.push(errorMsg)
                }
              } catch (fileError) {
                const errorMsg = `خطأ في حفظ ملف اللون: ${file.fileName}`
                console.error(errorMsg, fileError)
                designFileErrors.push(errorMsg)
              }
            }
          }

          setSavingDesignFiles(false)

          if (designFileErrors.length > 0) {
            showWarning(
              'تم تحديث المنتج مع أخطاء في الملفات',
              `تم تحديث المنتج بنجاح، لكن حدثت أخطاء في حفظ بعض الملفات:\n${designFileErrors.join('\n')}`
            )
          } else {
            showSuccess('تم تحديث المنتج', 'تم تحديث المنتج وملفات التصميم بنجاح!')
          }
        } else {
          showSuccess('تم تحديث المنتج', 'تم تحديث المنتج بنجاح!')
        }

        setTimeout(() => {
          router.push('/admin/products')
        }, 1000)
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessage = parseValidationErrors(data.errors)
          showError('خطأ في البيانات المدخلة', errorMessage)
        } else {
          showError('خطأ في تحديث المنتج', data.message || 'حدث خطأ أثناء تحديث المنتج')
        }
      }
    } catch (error) {
      console.error('خطأ في تحديث المنتج:', error)
      showError('خطأ في تحديث المنتج', 'حدث خطأ غير متوقع أثناء تحديث المنتج')
    } finally {
      setSaving(false)
      setSavingDesignFiles(false)
    }
  }

  const parseValidationErrors = (errors: Array<{ path?: string[]; message?: string }>): string => {
    const errorMessages: string[] = []

    errors.forEach((error) => {
      const field = error.path?.[0] || 'unknown'
      const message = error.message || 'Invalid value'

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

  // Function to extract YouTube video ID from URL
  const extractYouTubeVideoId = (url: string): string | null => {
    if (!url) return null

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  // Get YouTube video ID for iframe
  const youtubeVideoId = extractYouTubeVideoId(formData.youtubeLink || '')

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

  const removeColorTheme = async (index: number) => {
    const color = formData.colors[index]

    try {
      const originalColorName = originalColorNames[index] || color.name
      const cleanColorName = originalColorName.toLowerCase().replace(/[^a-z0-9]/g, '')

      // If color has uploaded files, delete them first
      if (color?.uploadedFiles?.length) {
        // Delete all files for this color
        for (const file of color.uploadedFiles) {
          if (file.fileUrl) {
            try {
              const response = await fetch('/api/admin/upload/delete-file', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  fileUrl: file.fileUrl,
                }),
              })

              if (!response.ok) {
                console.error(`Failed to delete file: ${file.fileName}`)
              }
            } catch (error) {
              console.error(`Error deleting file ${file.fileName}:`, error)
            }
          }
        }
      }

      // Always try to delete the color folder (even if empty)
      try {
        console.log(`Attempting to delete color folder: ${cleanColorName} for product: ${formData.slug}`)

        const response = await fetch('/api/admin/upload/delete-color-folder', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productSlug: formData.slug,
            colorName: cleanColorName,
          }),
        })

        const result = await response.json()
        console.log('Delete color folder response:', result)

        if (!response.ok) {
          console.error('Failed to delete color folder:', result)
        } else {
          console.log(`Successfully deleted color folder: ${cleanColorName}`)
        }
      } catch (error) {
        console.error('Error deleting color folder:', error)
      }
    } catch (error) {
      console.error('Error handling color deletion:', error)
      showError('خطأ في حذف ملفات اللون', 'تم حذف اللون لكن حدث خطأ في حذف الملفات')
    }

    // Clean up any pending timeouts for this color
    if (colorNameChangeTimeouts[index]) {
      clearTimeout(colorNameChangeTimeouts[index])
      setColorNameChangeTimeouts((prev) => {
        const newTimeouts = { ...prev }
        delete newTimeouts[index]
        return newTimeouts
      })
    }

    // Clean up original color name
    setOriginalColorNames((prev) => {
      const newOriginalNames = { ...prev }
      delete newOriginalNames[index]
      return newOriginalNames
    })

    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index),
    }))

    showSuccess('تم حذف اللون', 'تم حذف اللون وملفاته بنجاح')
  }

  const handleColorThemeChange = (index: number, field: string, value: unknown) => {
    // Prevent Arabic text in color names
    if (field === 'name' && typeof value === 'string') {
      // Check if the value contains Arabic characters
      const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
      if (arabicRegex.test(value)) {
        showError('خطأ في اسم اللون', 'لا يمكن استخدام النصوص العربية في اسم اللون')
        return
      }
    }

    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.map((color, i) => (i === index ? { ...color, [field]: value } : color)),
    }))

    // Handle color name debouncing outside of setFormData - only if files exist
    if (field === 'name' && typeof value === 'string') {
      const color = formData.colors[index]
      const hasFiles = (color?.uploadedFiles?.length || 0) > 0

      if (hasFiles) {
        // Clear existing timeout for this color
        if (colorNameChangeTimeouts[index]) {
          clearTimeout(colorNameChangeTimeouts[index])
        }

        // Get the original color name where files were first uploaded
        const originalColorName = originalColorNames[index] || color.name

        // Set new timeout for debounced color name change
        const newTimeout = setTimeout(() => {
          const newColorName = typeof value === 'string' ? value : ''
          if (originalColorName && originalColorName !== newColorName) {
            handleColorNameChange(index, originalColorName, newColorName)
          }
        }, 1000) // Wait 1 second after user stops typing

        setColorNameChangeTimeouts((prev) => ({ ...prev, [index]: newTimeout }))
      } else {
        // No files to move, clear any existing timeout for this color
        if (colorNameChangeTimeouts[index]) {
          clearTimeout(colorNameChangeTimeouts[index])
          setColorNameChangeTimeouts((prev) => {
            const newTimeouts = { ...prev }
            delete newTimeouts[index]
            return newTimeouts
          })
        }
      }
    }
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
        productId: productId, // Use the actual productId for edit
        productSlug: formData.slug, // Add slug for proper folder organization
      },
      fileInfo
    )
  }

  const handleColorFileUpload = async (file: File, colorIndex: number, sanitizedColorName: string) => {
    // Check if slug is valid before allowing upload
    if (!isSlugValidForUpload()) {
      showError('رابط المنتج مطلوب', 'يرجى إدخال رابط المنتج أولاً قبل رفع الملفات')
      return
    }

    // Ensure slug is properly formatted
    const cleanSlug = formData.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '') // Remove any invalid characters
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

    if (!cleanSlug) {
      showError('رابط المنتج غير صحيح', 'يرجى إدخال رابط منتج صحيح')
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
    setCurrentUploadingFile({ fileName: file.name, designFileIndex: colorIndex })

    // Add temporary file entry to color
    setFormData((prev) => {
      const updatedColors = [...prev.colors]
      const currentColor = updatedColors[colorIndex]

      const tempUploadedFile = {
        fileName: file.name,
        fileType,
        fileUrl: '',
        fileSize: file.size,
        isTemp: true,
      }

      updatedColors[colorIndex] = {
        ...currentColor,
        uploadedFiles: [...(currentColor.uploadedFiles || []), tempUploadedFile],
      }

      // Set original color name when first file is uploaded
      if (!originalColorNames[colorIndex] && (!currentColor.uploadedFiles || currentColor.uploadedFiles.length === 0)) {
        setOriginalColorNames((prev) => ({ ...prev, [colorIndex]: currentColor.name }))
      }

      return {
        ...prev,
        colors: updatedColors,
      }
    })

    // Start upload with color-specific folder
    const fileInfo = { fileName: file.name, designFileIndex: colorIndex }

    // Ensure colorName is always a valid string
    const validColorName = sanitizedColorName || 'default'

    await uploadDesignFile(
      file,
      '/api/admin/upload/design-file',
      {
        fileName: file.name,
        fileType,
        description: `ملف ${formData.colors[colorIndex]?.name || sanitizedColorName}`,
        productId: productId, // Use the actual productId for edit
        productSlug: cleanSlug, // Use cleaned product slug, color folder will be handled by API
        colorName: validColorName, // Pass color name separately for folder organization
      },
      fileInfo
    )
  }

  const handleColorFileRemove = async (fileName: string, colorIndex: number) => {
    // Find the file to get its URL
    const fileToDelete = formData.colors[colorIndex]?.uploadedFiles?.find((f) => f.fileName === fileName)

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
      const updatedColors = [...prev.colors]
      if (updatedColors[colorIndex]) {
        updatedColors[colorIndex] = {
          ...updatedColors[colorIndex],
          uploadedFiles: updatedColors[colorIndex].uploadedFiles?.filter((f) => f.fileName !== fileName) || [],
        }
      }
      return {
        ...prev,
        colors: updatedColors,
      }
    })

    showSuccess('تم حذف الملف', 'تم حذف الملف بنجاح')
  }

  // Function to check if slug is valid for file upload
  const isSlugValidForUpload = () => {
    return formData.slug && formData.slug.trim().length > 0 && /^[a-z0-9-]+$/.test(formData.slug)
  }

  // Function to handle color name changes and update file paths
  const handleColorNameChange = async (colorIndex: number, oldName: string, newName: string) => {
    const color = formData.colors[colorIndex]
    if (!color?.uploadedFiles?.length) return

    const oldSanitizedName = oldName.toLowerCase().replace(/[^a-z0-9]/g, '')
    const newSanitizedName = newName.toLowerCase().replace(/[^a-z0-9]/g, '')

    console.log(`Moving color files from '${oldName}' to '${newName}'`)

    try {
      // Call API to move files from old color folder to new color folder
      const response = await fetch('/api/admin/upload/move-color-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productSlug: formData.slug,
          oldColorName: oldSanitizedName,
          newColorName: newSanitizedName,
          files: color.uploadedFiles.map((file) => ({
            fileName: file.fileName,
            oldUrl: file.fileUrl,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to move color files')
      }

      const result = await response.json()

      // Update file URLs in state
      setFormData((prev) => ({
        ...prev,
        colors: prev.colors.map((c, idx) =>
          idx === colorIndex
            ? {
                ...c,
                uploadedFiles:
                  c.uploadedFiles?.map((file) => {
                    const updatedFile = result.files.find(
                      (f: { fileName: string; newUrl: string }) => f.fileName === file.fileName
                    )
                    return updatedFile ? { ...file, fileUrl: updatedFile.newUrl } : file
                  }) || [],
              }
            : c
        ),
      }))

      // Update original color name after successful migration
      setOriginalColorNames((prev) => ({ ...prev, [colorIndex]: newName }))
      showSuccess('تم تحديث مسارات الملفات', 'تم نقل ملفات اللون بنجاح')
    } catch (error) {
      console.error('Error moving color files:', error)
      // Revert color name change on error
      setFormData((prev) => ({
        ...prev,
        colors: prev.colors.map((c, idx) => (idx === colorIndex ? { ...c, name: oldName } : c)),
      }))
      showError('خطأ في نقل ملفات اللون', 'فشل في نقل ملفات اللون، تم إعادة اسم اللون')
    }
  }

  const handleSlugChange = async (newSlug: string) => {
    // Only proceed if there are files to move
    const hasDesignFiles = formData.designFiles.some((df) => df.uploadedFiles.length > 0)
    const hasColorFiles = formData.colors.some((color) => (color.uploadedFiles?.length || 0) > 0)

    if (!hasDesignFiles && !hasColorFiles) {
      return // No files to move, just return
    }

    // Use the original slug where files were first uploaded
    const sourceSlug = originalSlug || formData.slug
    if (sourceSlug && sourceSlug !== newSlug) {
      console.log(`Moving files from original slug '${sourceSlug}' to '${newSlug}'`) // Debug log

      try {
        // Prepare all files to move (design files + color files)
        const allFiles = [
          ...formData.designFiles
            .flatMap((df) => df.uploadedFiles)
            .map((file) => ({
              fileName: file.fileName,
              oldUrl: file.fileUrl,
            })),
          ...formData.colors
            .flatMap((color) => color.uploadedFiles || [])
            .map((file) => ({
              fileName: file.fileName,
              oldUrl: file.fileUrl,
            })),
        ]

        // Call API to move files from old folder to new folder
        const response = await fetch('/api/admin/upload/move-files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oldSlug: sourceSlug,
            newSlug: newSlug,
            files: allFiles,
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
          colors: prev.colors.map((color) => ({
            ...color,
            uploadedFiles:
              color.uploadedFiles?.map((file) => {
                const updatedFile = result.files.find(
                  (f: { fileName: string; newUrl: string }) => f.fileName === file.fileName
                )
                return updatedFile ? { ...file, fileUrl: updatedFile.newUrl } : file
              }) || [],
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

  if (loading || productLoading) {
    return (
      <div className="products-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>جاري تحميل المنتج...</p>
        </div>
      </div>
    )
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
        <div className="products-header">
          <div className="header-content">
            <h1>تعديل المنتج</h1>
            <p>تحديث معلومات المنتج وملفات التصميم</p>
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
                  {formData.discountAmount && formData.discountAmount > 0 ? (
                    <div className="price-item discount">
                      <span>خصم مبلغ:</span>
                      <span>-${formData.discountAmount.toFixed(2)}</span>
                    </div>
                  ) : null}
                  {formData.discountPercentage && formData.discountPercentage > 0 ? (
                    <div className="price-item discount">
                      <span>خصم نسبة:</span>
                      <span>-${((formData.price * formData.discountPercentage) / 100).toFixed(2)}</span>
                    </div>
                  ) : null}
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
                      <img src={image.url} alt={image.alt || `صورة ${index + 1}`} />
                      <button type="button" onClick={() => removeImage(index)} className="remove-image-btn">
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* YouTube Video */}
            <div className="form-section">
              <h2>فيديو المنتج</h2>
              <p className="section-description">أضف رابط فيديو يوتيوب لعرض المنتج</p>

              <div className="form-group">
                <label htmlFor="youtubeLink">رابط فيديو يوتيوب</label>
                <input
                  type="url"
                  id="youtubeLink"
                  value={formData.youtubeLink || ''}
                  onChange={(e) => handleInputChange('youtubeLink', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                />
                <small className="form-hint">أدخل رابط فيديو يوتيوب صحيح لعرض معاينة الفيديو</small>
              </div>

              {youtubeVideoId && (
                <div className="youtube-preview">
                  <h3>معاينة الفيديو</h3>
                  <div className="video-container">
                    <iframe
                      width="100%"
                      height="315"
                      src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}
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

            {/* Design Files */}
            <div className="form-section">
              <h2>ملفات التصميم والفيديو</h2>
              <p className="section-description">أضف ملفات التصميم والفيديو التي سيحصل عليها العملاء عند الشراء</p>

              {!isSlugValidForUpload() && (
                <div className="slug-requirement-warning">
                  <p>⚠️ يرجى إدخال رابط المنتج أولاً قبل رفع الملفات</p>
                </div>
              )}

              {/* Color-based file uploads */}
              {formData.allowColorChanges && formData.colors.length > 0 && (
                <div className="color-files-section">
                  <h3>ملفات لكل لون</h3>
                  <p className="section-description">رفع ملفات منفصلة لكل لون من ألوان التصميم</p>

                  {formData.colors.map((color, colorIndex) => {
                    const sanitizedColorName = color.name.toLowerCase().replace(/[^a-z0-9]/g, '')
                    return (
                      <div key={colorIndex} className="color-file-item">
                        <div className="color-file-header">
                          <div className="color-preview" style={{ backgroundColor: color.hex }}></div>
                          <h4>{color.name}</h4>
                          <span className="color-folder">
                            /{formData.slug}/{sanitizedColorName}/
                          </span>
                        </div>

                        <div className="form-group">
                          <FileUpload
                            key={`color-file-upload-${colorIndex}`}
                            label={`رفع ملفات ${color.name}`}
                            accept=".psd,.ai,.eps,.pdf,.svg,.zip,.rar,.png,.jpg,.jpeg,.gif,.webp,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv"
                            maxSize={0}
                            multiple={true}
                            onFileSelect={(file) => handleColorFileUpload(file, colorIndex, sanitizedColorName)}
                            disabled={loading || isUploading || !isSlugValidForUpload()}
                            placeholder={
                              !isSlugValidForUpload() ? 'يرجى إدخال رابط المنتج أولاً' : `اختر ملفات ${color.name}`
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
                            uploadedFiles={formData.colors[colorIndex]?.uploadedFiles || []}
                            onFileRemove={async (fileName) => {
                              // Handle color file removal
                              await handleColorFileRemove(fileName, colorIndex)
                            }}
                            onReset={() => {
                              setIsUploading(false)
                              setUploadProgress(0)
                              setUploadStatus('idle')
                            }}
                            onRefresh={() => {
                              // Update all temp files to permanent status for this color
                              setFormData((prev) => ({
                                ...prev,
                                colors: prev.colors.map((c, idx) =>
                                  idx === colorIndex
                                    ? {
                                        ...c,
                                        uploadedFiles:
                                          c.uploadedFiles?.map((file) => ({ ...file, isTemp: false })) || [],
                                      }
                                    : c
                                ),
                              }))

                              setIsUploading(false)
                              setUploadProgress(0)
                              setUploadStatus('idle')
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* General design files (existing functionality) */}
              <div className="general-files-section">
                <h3>ملفات التصميم العامة</h3>
                <p className="section-description">ملفات التصميم المشتركة لجميع الألوان</p>

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
            <button type="submit" disabled={saving} className="save-btn">
              <FontAwesomeIcon icon={faSave} />
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
