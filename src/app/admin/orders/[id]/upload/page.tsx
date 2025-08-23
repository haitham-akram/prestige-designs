'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faUpload,
  faSpinner,
  faTimes,
  faCheck,
  faFile,
  faDownload,
  faTrash,
  faPalette,
  faVideo,
} from '@fortawesome/free-solid-svg-icons'
import FileUpload, { UploadProgress } from '@/components/ui/FileUpload'
import { useFileUpload } from '@/hooks/useFileUpload'
import '../order-detail.css'
import '../../upload.css'

// Types
interface Order {
  _id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  items: {
    productId: string
    productSlug: string
    productName: string
    quantity: number
    hasCustomizations: boolean
    EnableCustomizations?: boolean
    customizations?: {
      colors?: { name: string; hex: string }[]
    }
  }[]
  totalPrice?: number
  orderStatus: 'pending' | 'processing' | 'completed' | 'cancelled'
  customizationStatus: 'none' | 'pending' | 'processing' | 'completed'
  hasCustomizableProducts: boolean
}

interface DesignFile {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  productId: string
  orderId?: string
  colorName?: string
  description: string
  uploadedAt: string
  downloadCount: number
  isForOrder: boolean
}

interface UploadedFile {
  fileName: string
  fileType: string
  fileUrl: string
  fileSize: number
  isTemp?: boolean
}

interface UploadFormData {
  productId: string
  productSlug: string
  colorName: string
  uploadedFiles: UploadedFile[]
  description: string
}

export default function OrderUploadPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [designFiles, setDesignFiles] = useState<DesignFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    status: 'idle',
  })

  const [formData, setFormData] = useState<UploadFormData>({
    productId: '',
    productSlug: '',
    colorName: '',
    uploadedFiles: [],
    description: '',
  })
  // File upload hook
  const { uploadFile: uploadOrderFile, uploadProgress: fileUploadProgress } = useFileUpload({
    onSuccess: (result, fileInfo) => {
      console.log('File uploaded successfully:', result)
      if (result.success && result.data) {
        const uploadedFile: UploadedFile = {
          fileName: result.data.fileName,
          fileType: result.data.fileType,
          fileUrl: result.data.fileUrl,
          fileSize: result.data.fileSize,
          isTemp: false,
        }

        setFormData((prev) => ({
          ...prev,
          uploadedFiles: prev.uploadedFiles.map((file) =>
            file.fileName === uploadedFile.fileName && file.isTemp ? uploadedFile : file
          ),
        }))
      }
    },
    onError: (error) => {
      console.error('File upload error:', error)
      setError(`فشل في رفع الملف: ${error}`)
    },
  })

  // Fetch order details
  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`)
      if (!response.ok) throw new Error('Failed to fetch order')
      const data = await response.json()
      console.log('Order data received:', data)

      // The API returns { order, designFiles }, so we need to extract the order
      const orderData = data.order || data
      console.log('Order data to set:', orderData)
      console.log('Order items:', orderData.items)

      setOrder(orderData)
    } catch (err) {
      console.error('Error fetching order:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch order')
    } finally {
      setLoading(false)
    }
  }

  // Fetch existing design files
  const fetchDesignFiles = async () => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/upload-files`)
      if (!response.ok) throw new Error('Failed to fetch design files')
      const data = await response.json()
      console.log('Design files data received:', data)

      setDesignFiles(data.files || [])
    } catch (err) {
      console.error('Error fetching design files:', err)
    }
  }

  useEffect(() => {
    fetchOrder()
    fetchDesignFiles()
  }, [orderId])

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    if (!formData.productId) {
      setError('يرجى اختيار المنتج أولاً')
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
      setError('نوع الملف غير مدعوم')
      return
    }

    // Add temporary file entry
    const tempFile: UploadedFile = {
      fileName: file.name,
      fileType,
      fileUrl: '',
      fileSize: file.size,
      isTemp: true,
    }

    setFormData((prev) => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, tempFile],
    }))

    // Upload file immediately
    await uploadOrderFile(file, '/api/admin/upload/order-file', {
      fileName: file.name,
      fileType,
      description: formData.description || '',
      orderNumber: order.orderNumber,
      productSlug: formData.productSlug,
      colorName: formData.colorName || undefined,
    })
  }

  // Handle file removal
  const handleFileRemove = async (fileName: string) => {
    // Find the file to check if it has been uploaded
    const fileToRemove = formData.uploadedFiles.find((file) => file.fileName === fileName)

    if (fileToRemove && fileToRemove.fileUrl && !fileToRemove.isTemp) {
      // File has been uploaded to server, try to delete it
      try {
        // Extract file path from URL for deletion
        const filePath = fileToRemove.fileUrl
        if (filePath.startsWith('/uploads/')) {
          // Delete the file from server
          const deleteResponse = await fetch('/api/admin/upload/delete-file', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileUrl: filePath,
            }),
          })

          if (!deleteResponse.ok) {
            console.warn('Failed to delete file from server:', fileName)
          } else {
            console.log('File deleted from server:', fileName)
          }
        }
      } catch (error) {
        console.error('Error deleting file from server:', error)
      }
    }

    // Remove from form data
    setFormData((prev) => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((file) => file.fileName !== fileName),
    }))
  }

  // Reset upload progress
  const resetUploadProgress = () => {
    setUploadProgress({ progress: 0, status: 'idle' })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.productId || formData.uploadedFiles.length === 0) {
      setError('يرجى اختيار المنتج والملفات')
      return
    }

    // Check if any files are still uploading
    const uploadingFiles = formData.uploadedFiles.filter((file) => file.isTemp)
    if (uploadingFiles.length > 0) {
      setError('يرجى الانتظار حتى انتهاء رفع جميع الملفات')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      // Create design file records in database
      const response = await fetch(`/api/admin/orders/${orderId}/upload-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: formData.productId,
          productSlug: formData.productSlug,
          colorName: formData.colorName,
          description: formData.description,
          files: formData.uploadedFiles.map((file) => ({
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            fileType: file.fileType,
            fileSize: file.fileSize,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save file records')
      }

      const result = await response.json()
      setSuccess('تم حفظ الملفات بنجاح')
      setFormData({
        productId: '',
        productSlug: '',
        colorName: '',
        uploadedFiles: [],
        description: '',
      })
      fetchDesignFiles()
    } catch (err) {
      setUploadProgress({
        progress: 0,
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to upload files',
      })
      setError(err instanceof Error ? err.message : 'Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  // Handle file deletion
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الملف؟ سيتم حذفه نهائياً من الخادم وقاعدة البيانات.')) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/design-files/${fileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete file')
      }

      const result = await response.json()
      console.log('Delete result:', result)

      setSuccess(`تم حذف الملف بنجاح${result.data?.fileDeleted ? ' (تم حذف الملف من الخادم)' : ''}`)
      fetchDesignFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file')
    } finally {
      setLoading(false)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get appropriate icon or image for file type
  const getFileDisplay = (file: DesignFile) => {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']
    console.log('Getting display for file:', file)
    if (imageTypes.includes(file.fileType.toLowerCase())) {
      return (
        <div className="file-image-container">
          <img
            src={file.fileUrl}
            alt={file.fileName}
            className="file-image"
            onError={(e) => {
              // Fallback to file icon if image fails to load
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.nextElementSibling?.classList.remove('fallback-hidden')
            }}
          />
          <FontAwesomeIcon icon={faFile} className="file-icon fallback-icon fallback-hidden" />
        </div>
      )
    } else if (videoTypes.includes(file.fileType.toLowerCase())) {
      return <FontAwesomeIcon icon={faVideo} className="file-icon video-icon" />
    } else {
      return <FontAwesomeIcon icon={faFile} className="file-icon" />
    }
  }

  if (loading) {
    return (
      <div className="order-detail-container">
        <div className="admin-content">
          <div className="loading-state">
            <FontAwesomeIcon icon={faSpinner} spin size="3x" />
            <h3>جاري تحميل تفاصيل الطلب</h3>
            <p>يرجى الانتظار...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="order-detail-container">
        <div className="admin-content">
          <div className="error-state">
            <FontAwesomeIcon icon={faTimes} size="3x" />
            <h3>خطأ في تحميل الطلب</h3>
            <p>{error}</p>
            <button onClick={fetchOrder} className="btn btn-primary">
              <FontAwesomeIcon icon={faSpinner} /> إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="order-detail-container">
        <div className="admin-content">
          <div className="error-state">
            <FontAwesomeIcon icon={faTimes} size="3x" />
            <h3>الطلب غير موجود</h3>
            <button onClick={() => router.back()} className="btn btn-primary">
              <FontAwesomeIcon icon={faArrowLeft} /> العودة للطلبات
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Check if any items have customizations capabilities
  const hasCustomizableItems =
    order.items && order.items.length > 0 ? order.items.some((item) => item.EnableCustomizations === true) : false

  if (!order.hasCustomizableProducts && !hasCustomizableItems) {
    return (
      <div className="order-detail-container">
        <div className="admin-content">
          <div className="error-state">
            <FontAwesomeIcon icon={faTimes} size="3x" />
            <h3>لا يمكن رفع ملفات التصميم</h3>
            <p>هذا الطلب لا يحتوي على منتجات قابلة للتخصيص</p>
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '1rem',
                margin: '1rem 0',
                borderRadius: '8px',
                fontSize: '0.9rem',
              }}
            >
              <p>
                <strong>معلومات التصحيح:</strong>
              </p>
              <p>• hasCustomizableProducts: {String(order.hasCustomizableProducts)}</p>
              <p>• عدد المنتجات: {order.items?.length || 0}</p>
              <p>• المنتج الأول hasCustomizations: {String(order.items?.[0]?.hasCustomizations)}</p>
              <p>• المنتج الأول EnableCustomizations: {String(order.items?.[0]?.EnableCustomizations)}</p>
              <p>• تأكد من إضافة بيانات الاختبار إلى قاعدة البيانات</p>
            </div>
            <button onClick={() => router.push(`/admin/orders/${orderId}`)} className="btn btn-primary">
              <FontAwesomeIcon icon={faArrowLeft} /> العودة للطلب
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="order-detail-container" style={{ maxWidth: 'none', width: '100%' }}>
      <div className="admin-content" style={{ maxWidth: 'none', width: '100%' }}>
        {/* Header */}
        <div className="order-header">
          <div className="order-header-main">
            <div className="order-title">
              <h1>رفع ملفات التصميم - {order.orderNumber}</h1>
              <p>العميل: {order.customerName}</p>
            </div>
          </div>
          <div className="order-header-actions">
            <button onClick={() => router.push(`/admin/orders/${orderId}`)} className="btn btn-secondary">
              <FontAwesomeIcon icon={faArrowLeft} /> العودة للطلب
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <FontAwesomeIcon icon={faTimes} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="alert-close">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <FontAwesomeIcon icon={faCheck} />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="alert-close">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}

        <div className="upload-content">
          {/* Upload Form */}
          <div className="upload-section">
            <h2>
              <FontAwesomeIcon icon={faUpload} /> رفع ملفات جديدة
            </h2>

            <form onSubmit={handleSubmit} className="upload-form">
              <div className="form-group">
                <label htmlFor="productId">المنتج:</label>
                <select
                  id="productId"
                  value={formData.productId}
                  onChange={(e) => {
                    const selectedProductId = e.target.value
                    const selectedItem = order.items?.find((item) => item.productId === selectedProductId)
                    setFormData((prev) => ({
                      ...prev,
                      productId: selectedProductId,
                      productSlug: selectedItem?.productSlug || '',
                    }))
                  }}
                  required
                  className="form-select"
                >
                  <option value="">اختر المنتج</option>
                  {order.items && order.items.length > 0
                    ? order.items
                        .filter((item) => item.EnableCustomizations === true)
                        .map((item, index) => (
                          <option key={index} value={item.productId}>
                            {item.productName} (الكمية: {item.quantity})
                          </option>
                        ))
                    : null}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="colorName">اللون (اختياري):</label>
                <select
                  id="colorName"
                  value={formData.colorName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, colorName: e.target.value }))}
                  className="form-select"
                >
                  <option value="">بدون لون محدد</option>
                  {order.items && order.items.length > 0
                    ? order.items
                        .find((item) => item.productId === formData.productId)
                        ?.customizations?.colors?.map((color, index) => (
                          <option key={index} value={color.name}>
                            {color.name}
                          </option>
                        )) || null
                    : null}
                </select>
              </div>

              <div className="form-group">
                <FileUpload
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                  onReset={resetUploadProgress}
                  externalProgress={fileUploadProgress}
                  multiple={true}
                  accept=".psd,.ai,.eps,.pdf,.jpg,.jpeg,.png,.svg,.zip,.rar,.mp4,.mov,.avi,.mkv,.webm"
                  maxSize={0}
                  label="الملفات:"
                  placeholder="اختر ملفات أو اسحب الملفات هنا"
                  uploadedFiles={formData.uploadedFiles}
                />
                <small>
                  الملفات المدعومة: PSD, AI, EPS, PDF, JPG, PNG, SVG, ZIP, RAR, MP4, MOV, AVI, MKV, WEBM (لا يوجد حد
                  للحجم)
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="description">الوصف (اختياري):</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف للملفات المرفوعة..."
                  className="form-textarea"
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={uploading || !formData.productId || formData.uploadedFiles.length === 0}
                  className="btn btn-primary"
                  onClick={(e) => {
                    console.log('Submit button clicked')
                    console.log('Form data:', formData)
                    console.log('Uploading:', uploading)
                    console.log('Product ID:', formData.productId)
                    console.log('Files count:', formData.uploadedFiles.length)
                  }}
                >
                  {uploading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin /> جاري الرفع...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faUpload} /> رفع الملفات
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    console.log('Cancel button clicked')
                    router.back()
                  }}
                  className="btn btn-secondary"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
          {/* Existing Files */}
          <div className="files-section">
            <h2>
              <FontAwesomeIcon icon={faFile} /> الملفات المرفوعة للطلب
            </h2>

            {/* FIX: The logic now checks for files that have both an orderId and a productId */}
            {designFiles.filter((file) => file.orderId && file.productId).length === 0 ? (
              <div className="empty-state">
                <FontAwesomeIcon icon={faFile} size="3x" />
                <h3>لا توجد ملفات مخصصة لهذا الطلب</h3>
                <p>قم برفع ملفات التصميم للبدء</p>
              </div>
            ) : (
              <div className="files-grid">
                {designFiles
                  .filter((file) => file.isForOrder) // <-- THIS IS THE FIX
                  .map((file) => (
                    <div key={file.id} className="file-card">
                      {getFileDisplay(file)}

                      <div className="file-info">
                        <h4 title={file.fileName}>{file.fileName}</h4>
                        <div className="file-meta">
                          <span className="file-size">{formatFileSize(file.fileSize)}</span>
                          <span className="file-type">{file.fileType}</span>
                        </div>
                        {file.colorName && (
                          <span className="color-badge">
                            <FontAwesomeIcon icon={faPalette} /> {file.colorName}
                          </span>
                        )}
                      </div>

                      {file.description && <p className="file-description">{file.description}</p>}

                      <div className="file-actions">
                        <button
                          onClick={() => window.open(file.fileUrl, '_blank')}
                          className="btn btn-sm btn-primary"
                          title="تحميل الملف"
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="btn btn-sm btn-danger"
                          title="حذف الملف"
                          disabled={loading}
                        >
                          {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrash} />}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
