'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faEdit,
  faUpload,
  faEnvelope,
  faDownload,
  faSpinner,
  faUser,
  faBox,
  faPalette,
  faDollarSign,
  faCreditCard,
  faTruck,
  faCheck,
  faTimes,
  faClock,
  faFile,
  faEye,
  faHistory,
  faNotesMedical,
  faPhone,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import RefundVerification from '@/components/admin/RefundVerification'
import './order-detail.css'

// Helper function to download images
const downloadImage = async (imageUrl: string, fileName: string) => {
  try {
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading image:', error)
    // Fallback: open in new tab
    window.open(imageUrl, '_blank')
  }
}

// Helper function to format currency to 2 decimal places
const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return `$${numAmount.toFixed(2)}`
}

// Helper function to check if customization information is missing or incomplete
const isCustomizationInfoMissing = (item: OrderItem): boolean => {
  // If product doesn't support customizations, info is not missing
  if (!item.EnableCustomizations) {
    return false
  }

  // If customizations object is undefined or null
  if (!item.customizations) {
    return true
  }

  const { colors, textChanges, uploadedImages, uploadedLogo, customizationNotes } = item.customizations

  // Check if all customization fields are empty or null
  const hasColors = colors && colors.length > 0
  const hasTextChanges = textChanges && textChanges.length > 0
  const hasUploadedImages = uploadedImages && uploadedImages.length > 0
  const hasUploadedLogo =
    uploadedLogo && typeof uploadedLogo === 'object' && uploadedLogo.url && uploadedLogo.url.trim().length > 0
  const hasNotes = customizationNotes && customizationNotes.trim().length > 0

  // If none of the customization fields have data, info is missing
  return !hasColors && !hasTextChanges && !hasUploadedImages && !hasUploadedLogo && !hasNotes
}

// Types
interface OrderItem {
  productId: string
  productName: string
  productSlug: string
  quantity: number
  originalPrice: number
  discountAmount: number
  unitPrice: number
  totalPrice: number
  promoCode?: string
  promoDiscount?: number
  hasCustomizations: boolean
  EnableCustomizations?: boolean
  customizations?: {
    colors?: { name: string; hex: string }[]
    textChanges?: { field: string; value: string }[]
    uploadedImages?: string[]
    uploadedLogo?: string
    customizationNotes?: string
  }
}

interface OrderHistory {
  status: string
  timestamp: string
  note: string
  changedBy: string
}

interface Order {
  _id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  items: OrderItem[]
  totalAmount?: number
  totalPrice?: number
  subtotal?: number
  totalPromoDiscount?: number
  appliedPromoCodes?: string[]
  tax?: number
  shipping?: number
  discount?: number
  orderStatus: 'pending' | 'processing' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  customizationStatus: 'none' | 'pending' | 'processing' | 'completed'
  hasCustomizableProducts: boolean
  createdAt: string
  updatedAt: string
  estimatedDelivery?: string
  actualDelivery?: string
  adminNotes?: string
  customerNotes?: string
  orderHistory: OrderHistory[]
  shippingAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  billingAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}

interface DesignFile {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  productId: string
  description: string
  uploadedAt: string
  downloadCount: number
  lastDownloadedAt?: string
  expiresAt?: string
}

const statusColors = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
  awaiting_customization: '#f59e0b',
}

const paymentStatusColors = {
  pending: '#f59e0b',
  paid: '#10b981',
  failed: '#ef4444',
  refunded: '#6b7280',
  free: '#22c55e',
}

const customizationStatusColors = {
  none: '#6b7280',
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  awaiting_customization: '#f59e0b',
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [designFiles, setDesignFiles] = useState<DesignFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'files' | 'history' | 'notes' | 'refund'>('details')

  // Fetch order details
  const fetchOrder = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/orders/${orderId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch order details')
      }

      const data = await response.json()
      setOrder(data.order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order details')
      console.error('Error fetching order:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch design files
  const fetchDesignFiles = async () => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/upload-files`)
      if (response.ok) {
        const data = await response.json()
        setDesignFiles(data.files || [])
      }
    } catch (err) {
      console.error('Error fetching design files:', err)
    }
  }

  // Load data on mount
  useEffect(() => {
    if (orderId) {
      fetchOrder()
      fetchDesignFiles()
    }
  }, [orderId])

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getAdminName = (adminId: string) => {
    // Special cases
    if (adminId === 'system') return 'النظام'

    // Now adminId is actually the admin name, so return it directly
    return adminId || 'المدير'
  }

  // Generate WhatsApp link
  const generateWhatsAppLink = (phoneNumber: string, orderNumber: string) => {
    // Remove any non-digit characters from phone number
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')

    // Default message in Arabic
    const message = `السلام عليكم، أتواصل معكم بخصوص طلب رقم ${orderNumber}`

    // WhatsApp URL with phone number and pre-filled message
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  // Handle mark as complete
  const handleMarkAsComplete = async () => {
    if (!confirm('هل أنت متأكد من تحديد الطلب كمكتمل؟ سيتم إرسال بريد إلكتروني للعميل مع روابط التحميل.')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/orders/${orderId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Send empty JSON object for admin requests
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark order as complete')
      }

      await response.json()

      setSuccess('تم تحديد الطلب كمكتمل بنجاح')
      fetchOrder() // Refresh order data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark order as complete')
    } finally {
      setLoading(false)
    }
  }

  // Handle cancel order
  const handleCancelOrder = async () => {
    const confirmMessage =
      order?.paymentStatus === 'paid'
        ? `هل أنت متأكد من إلغاء الطلب؟ سيتم استرداد المبلغ ${order.totalPrice?.toFixed(
            2
          )} دولار إلى العميل وإرسال بريد إلكتروني بالتفاصيل.`
        : 'هل أنت متأكد من إلغاء الطلب؟ سيتم إرسال بريد إلكتروني للعميل وإلغاء الطلب نهائياً.'

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel order')
      }

      const result = await response.json()
      // Show success message with refund information
      if (result.refundResult?.success) {
        setSuccess(`تم إلغاء الطلب بنجاح واسترداد المبلغ ${order?.totalPrice?.toFixed(2)} دولار`)
      } else if (order?.paymentStatus === 'paid') {
        setSuccess('تم إلغاء الطلب بنجاح - يرجى معالجة الاسترداد يدوياً')
      } else {
        setSuccess('تم إلغاء الطلب بنجاح')
      }

      fetchOrder() // Refresh order data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <div className="loading-state">
            <FontAwesomeIcon icon={faSpinner} spin size="3x" />
            <h3>جاري تحميل تفاصيل الطلب</h3>
            <p>يرجى الانتظار بينما نقوم بجلب معلومات الطلب...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <div className="error-state">
            <FontAwesomeIcon icon={faTimes} size="3x" />
            <h3>خطأ في تحميل الطلب</h3>
            <p>{error || 'الطلب غير موجود'}</p>
            <button onClick={fetchOrder} className="btn btn-primary">
              <FontAwesomeIcon icon={faSpinner} /> إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="order-detail-container">
      <div className="admin-content">
        {/* Header */}
        <div className="order-header">
          <div className="order-header-main">
            <div className="order-title">
              <h1>طلب {order.orderNumber}</h1>
              <p>تم الطلب في {formatDate(order.createdAt)}</p>
            </div>
          </div>
          <div className="order-header-actions">
            {order.hasCustomizableProducts && (
              <button onClick={() => router.push(`/admin/orders/${orderId}/upload`)} className="btn btn-primary">
                <FontAwesomeIcon icon={faUpload} /> رفع الملفات
              </button>
            )}
            {order.hasCustomizableProducts && order.orderStatus === 'processing' && designFiles.length > 0 && (
              <button onClick={handleMarkAsComplete} className="btn btn-success" disabled={loading}>
                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheck} />} تحديد كمكتمل
              </button>
            )}
            {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
              <button onClick={handleCancelOrder} className="btn btn-danger" disabled={loading}>
                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTimes} />}
                {order.paymentStatus === 'paid' ? 'إلغاء + استرداد' : 'إلغاء الطلب'}
              </button>
            )}
            <button onClick={() => router.push('/admin/orders')} className="btn btn-secondary">
              <FontAwesomeIcon icon={faArrowLeft} /> العودة للطلبات
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

        {/* Status Cards */}
        <div className="status-cards">
          <div className="status-card">
            <div className="status-icon">
              <FontAwesomeIcon icon={faBox} />
            </div>
            <div className="status-content">
              <div className="status-label">حالة الطلب</div>
              <div className="status-value" style={{ color: statusColors[order.orderStatus] }}>
                {order.orderStatus === 'pending'
                  ? 'في الانتظار'
                  : order.orderStatus === 'processing'
                  ? 'قيد المعالجة'
                  : order.orderStatus === 'completed'
                  ? 'مكتمل'
                  : order.orderStatus === 'cancelled'
                  ? 'ملغي'
                  : order.orderStatus === 'awaiting_customization'
                  ? 'في انتظار التخصيص'
                  : order.orderStatus}
              </div>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon">
              <FontAwesomeIcon icon={faCreditCard} />
            </div>
            <div className="status-content">
              <div className="status-label">حالة الدفع</div>
              <div className="status-value" style={{ color: paymentStatusColors[order.paymentStatus] }}>
                {order.paymentStatus === 'pending'
                  ? 'في الانتظار'
                  : order.paymentStatus === 'paid'
                  ? 'مدفوع'
                  : order.paymentStatus === 'failed'
                  ? 'فشل'
                  : order.paymentStatus === 'refunded'
                  ? 'مسترد'
                  : order.paymentStatus === 'free'
                  ? 'مجاني'
                  : order.paymentStatus}
              </div>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon">
              <FontAwesomeIcon icon={faPalette} />
            </div>
            <div className="status-content">
              <div className="status-label">التخصيص</div>
              <div className="status-value" style={{ color: customizationStatusColors[order.customizationStatus] }}>
                {order.customizationStatus === 'none'
                  ? 'بدون تخصيص'
                  : order.customizationStatus === 'pending'
                  ? 'في الانتظار'
                  : order.customizationStatus === 'processing'
                  ? 'قيد المعالجة'
                  : order.customizationStatus === 'completed'
                  ? 'مكتمل'
                  : order.customizationStatus === 'awaiting_customization'
                  ? 'في انتظار التخصيص'
                  : order.customizationStatus}
              </div>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon">
              <FontAwesomeIcon icon={faDollarSign} />
            </div>
            <div className="status-content">
              <div className="status-label">المجموع الكلي</div>
              <div className="status-value">{formatCurrency(order.totalPrice || order.totalAmount || 0)}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="order-tabs">
          <button
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <FontAwesomeIcon icon={faEye} /> تفاصيل الطلب
          </button>
          {order.hasCustomizableProducts && (
            <button
              className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              <FontAwesomeIcon icon={faFile} /> ملفات التصميم
            </button>
          )}
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <FontAwesomeIcon icon={faHistory} /> تاريخ الطلب
          </button>
          <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
            <FontAwesomeIcon icon={faNotesMedical} /> الملاحظات
          </button>
          {(order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') && (
            <button
              className={`tab-btn ${activeTab === 'refund' ? 'active' : ''}`}
              onClick={() => setActiveTab('refund')}
            >
              <FontAwesomeIcon icon={faCreditCard} /> تحقق من الاسترداد
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'details' && (
            <div className="order-details">
              <div className="details-grid">
                {/* Customer Information */}
                <div className="detail-section">
                  <h3>
                    <FontAwesomeIcon icon={faUser} /> معلومات العميل
                  </h3>
                  <div className="detail-content">
                    <div className="detail-row">
                      <span className="detail-label">الاسم:</span>
                      <span className="detail-value">{order.customerName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">البريد الإلكتروني:</span>
                      <span className="detail-value">{order.customerEmail}</span>
                    </div>
                    {order.customerPhone && (
                      <div className="detail-row">
                        <span className="detail-label">الهاتف:</span>
                        <div className="detail-value phone-with-whatsapp">
                          <span className="phone-number">{order.customerPhone}</span>
                          <a
                            href={generateWhatsAppLink(order.customerPhone, order.orderNumber)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whatsapp-btn"
                            title="فتح محادثة واتساب"
                          >
                            <FontAwesomeIcon icon={faWhatsapp} />
                            واتساب
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="detail-section">
                  <h3>
                    <FontAwesomeIcon icon={faBox} /> المنتجات المطلوبة
                  </h3>
                  <div className="items-list">
                    {order.items.map((item, index) => (
                      <div key={index} className="item-card">
                        <div className="item-header">
                          <h4>{item.productName}</h4>
                          <span className="item-price">{formatCurrency(item.unitPrice)}</span>
                        </div>
                        <div className="item-details">
                          <div className="item-row">
                            <span>الكمية:</span>
                            <span>{item.quantity}</span>
                          </div>

                          {/* Customization Status */}
                          <div className="item-row">
                            <span>قابل للتخصيص:</span>
                            <span className={`status-badge ${item.EnableCustomizations ? 'enabled' : 'disabled'}`}>
                              {item.EnableCustomizations ? 'نعم' : 'لا'}
                            </span>
                          </div>

                          {/* Show customization details if product supports customization */}
                          {item.EnableCustomizations && (
                            <div className="customization-section">
                              <div className="customization-header">
                                <FontAwesomeIcon icon={faPalette} />
                                <span>تفاصيل التخصيص:</span>
                              </div>

                              {isCustomizationInfoMissing(item) ? (
                                <div className="missing-customization-warning">
                                  <FontAwesomeIcon icon={faTimes} />
                                  <span>معلومات التخصيص ناقصة يرجي التواصل مع صاحب الطلب</span>
                                </div>
                              ) : (
                                <div className="customization-details">
                                  {/* Colors */}
                                  {item.customizations?.colors && item.customizations.colors.length > 0 ? (
                                    <div className="customization-row">
                                      <span>الألوان المختارة:</span>
                                      <div className="colors-list">
                                        {item.customizations.colors.map((color, colorIndex) => (
                                          <span
                                            key={colorIndex}
                                            className="color-badge"
                                            style={{ backgroundColor: color.hex }}
                                          >
                                            {color.name}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="customization-row empty">
                                      <span>الألوان:</span>
                                      <span className="empty-value">لم يتم اختيار ألوان</span>
                                    </div>
                                  )}

                                  {/* Text Changes */}
                                  {item.customizations?.textChanges && item.customizations.textChanges.length > 0 ? (
                                    <div className="customization-row">
                                      <span>تغييرات النصوص:</span>
                                      <div className="text-changes-list">
                                        {item.customizations.textChanges.map((textChange, textIndex) => (
                                          <div key={textIndex} className="text-change-item">
                                            <strong>{textChange.field}:</strong> {textChange.value}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="customization-row empty">
                                      <span>تغييرات النصوص:</span>
                                      <span className="empty-value">لم يتم إجراء تغييرات نصية</span>
                                    </div>
                                  )}

                                  {/* Uploaded Images */}
                                  {item.customizations?.uploadedImages &&
                                  item.customizations.uploadedImages.length > 0 ? (
                                    <div className="customization-row">
                                      <span>الصور المرفوعة:</span>
                                      <div className="uploaded-images-count">
                                        {item.customizations.uploadedImages.length} صورة
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="customization-row empty">
                                      <span>الصور المرفوعة:</span>
                                      <span className="empty-value">لم يتم رفع صور</span>
                                    </div>
                                  )}

                                  {/* Uploaded Logo */}
                                  {item.customizations?.uploadedLogo ? (
                                    <div className="customization-row">
                                      <span>الشعار المرفوع:</span>
                                      <span className="has-logo">تم رفع شعار</span>
                                    </div>
                                  ) : (
                                    <div className="customization-row empty">
                                      <span>الشعار:</span>
                                      <span className="empty-value">لم يتم رفع شعار</span>
                                    </div>
                                  )}

                                  {/* Customization Notes */}
                                  {item.customizations?.customizationNotes &&
                                  item.customizations.customizationNotes.trim() ? (
                                    <div className="customization-row">
                                      <span>ملاحظات التخصيص:</span>
                                      <div className="customization-notes">
                                        {item.customizations.customizationNotes}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="customization-row empty">
                                      <span>ملاحظات التخصيص:</span>
                                      <span className="empty-value">لا توجد ملاحظات</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {item.hasCustomizations && (
                            <div className="item-row">
                              <span>حالة التخصيص:</span>
                              <span className="status-badge">
                                {order.customizationStatus === 'none'
                                  ? 'بدون تخصيص'
                                  : order.customizationStatus === 'pending'
                                  ? 'في الانتظار'
                                  : order.customizationStatus === 'processing'
                                  ? 'قيد المعالجة'
                                  : order.customizationStatus === 'completed'
                                  ? 'مكتمل'
                                  : order.customizationStatus}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="detail-section">
                  <h3>
                    <FontAwesomeIcon icon={faDollarSign} /> ملخص الطلب
                  </h3>
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>المجموع الفرعي:</span>
                      <span>{formatCurrency(order.subtotal || 0)}</span>
                    </div>
                    {order.tax && order.tax > 0 && (
                      <div className="summary-row">
                        <span>الضريبة:</span>
                        <span>{formatCurrency(order.tax)}</span>
                      </div>
                    )}
                    {order.shipping && order.shipping > 0 && (
                      <div className="summary-row">
                        <span>الشحن:</span>
                        <span>{formatCurrency(order.shipping)}</span>
                      </div>
                    )}
                    {order.discount && order.discount > 0 && (
                      <div className="summary-row">
                        <span>الخصم:</span>
                        <span>-{formatCurrency(order.discount)}</span>
                      </div>
                    )}
                    {order.totalPromoDiscount && order.totalPromoDiscount > 0 && (
                      <div className="summary-row promo-discount">
                        <span>خصم كود الخصم:</span>
                        <span>-{formatCurrency(order.totalPromoDiscount)}</span>
                      </div>
                    )}
                    {order.appliedPromoCodes && order.appliedPromoCodes.length > 0 && (
                      <div className="summary-row promo-codes">
                        <span>أكواد الخصم المطبقة:</span>
                        <span className="promo-codes-list">
                          {order.appliedPromoCodes.map((code, index) => (
                            <span key={index} className="promo-code-badge">
                              {code}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span>المجموع الكلي:</span>
                      <span>{formatCurrency(order.totalPrice || order.totalAmount || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Shipping Information */}
                {order.shippingAddress && (
                  <div className="detail-section">
                    <h3>
                      <FontAwesomeIcon icon={faTruck} /> عنوان الشحن
                    </h3>
                    <div className="address-content">
                      <p>{order.shippingAddress.street}</p>
                      <p>
                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                      </p>
                      <p>{order.shippingAddress.country}</p>
                    </div>
                  </div>
                )}

                {/* Customizations Section - Full Width */}
                {order.items.some((item) => item.hasCustomizations && item.customizations) && (
                  <div className="detail-section full-width">
                    <h3>
                      <FontAwesomeIcon icon={faPalette} /> تفاصيل التخصيص
                    </h3>
                    <div className="customizations-list">
                      {order.items.map(
                        (item, index) =>
                          item.hasCustomizations &&
                          item.customizations && (
                            <div key={index} className="customization-card">
                              <div className="customization-header">
                                <h4>{item.productName}</h4>
                              </div>

                              {/* Colors Section */}
                              {item.customizations.colors && item.customizations.colors.length > 0 && (
                                <div className="customization-section">
                                  <h5>الألوان المختارة:</h5>
                                  <div className="admin-colors-list">
                                    {item.customizations.colors.map((color, colorIndex) => (
                                      <div key={colorIndex} className="admin-color-item">
                                        <div
                                          className="admin-color-swatch"
                                          style={{ backgroundColor: color.hex || '#cccccc' }}
                                          title={`${color.name} - ${color.hex || 'لون مخصص'}`}
                                        ></div>
                                        <div className="admin-color-info">
                                          <span className="admin-color-name">{color.name}</span>
                                          <span className="admin-color-hex">{color.hex || 'لون مخصص'}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Text Changes */}
                              {item.customizations.textChanges && item.customizations.textChanges.length > 0 && (
                                <div className="customization-section">
                                  <h5>التغييرات النصية:</h5>
                                  <div className="text-changes-summary">
                                    <div className="text-changes-preview">
                                      {item.customizations.textChanges.map((textChange, textIndex) => (
                                        <div key={textIndex} className="text-change-preview">
                                          <span className="field-name">{textChange.field}:</span>
                                          <span className="field-value">{textChange.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="text-changes-count">
                                      إجمالي التغييرات: {item.customizations.textChanges.length} حقل
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Uploaded Images */}
                              {item.customizations.uploadedImages && item.customizations.uploadedImages.length > 0 && (
                                <div className="customization-section">
                                  <h5>الصور المرفوعة:</h5>
                                  <div className="uploaded-images-list">
                                    {item.customizations.uploadedImages.map((image, imageIndex) => {
                                      // Handle both string URLs and object format
                                      const imageUrl =
                                        typeof image === 'string' ? image : image.url || image.publicId || image
                                      const fileName = `uploaded-image-${imageIndex + 1}.${
                                        imageUrl.split('.').pop() || 'jpg'
                                      }`

                                      return (
                                        <div key={imageIndex} className="uploaded-image-item">
                                          <div className="image-container">
                                            <img
                                              src={imageUrl}
                                              alt={`صورة مرفوعة ${imageIndex + 1}`}
                                              className="customization-image"
                                              onError={(e) => {
                                                console.error('Failed to load customization image:', imageUrl)
                                                e.currentTarget.style.display = 'none'
                                              }}
                                              onClick={() => window.open(imageUrl, '_blank')}
                                              title="انقر لعرض الصورة في نافذة جديدة"
                                            />
                                            <div className="image-actions">
                                              <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => downloadImage(imageUrl, fileName)}
                                                title="تحميل الصورة"
                                              >
                                                <FontAwesomeIcon icon={faDownload} />
                                              </button>
                                              <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => window.open(imageUrl, '_blank')}
                                                title="عرض في نافذة جديدة"
                                              >
                                                <FontAwesomeIcon icon={faEye} />
                                              </button>
                                            </div>
                                          </div>
                                          <div className="image-info">
                                            <span className="image-name">{fileName}</span>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Uploaded Logo */}
                              {item.customizations.uploadedLogo && (
                                <div className="customization-section">
                                  <h5>الشعار المرفوع:</h5>
                                  <div className="uploaded-logo">
                                    <div className="logo-container">
                                      <img
                                        src={
                                          typeof item.customizations.uploadedLogo === 'string'
                                            ? item.customizations.uploadedLogo
                                            : (item.customizations.uploadedLogo as any).url ||
                                              (item.customizations.uploadedLogo as any).publicId ||
                                              item.customizations.uploadedLogo
                                        }
                                        alt="الشعار المرفوع"
                                        className="customization-logo"
                                        onError={(e) => {
                                          console.error(
                                            'Failed to load customization logo:',
                                            item.customizations?.uploadedLogo
                                          )
                                          e.currentTarget.style.display = 'none'
                                        }}
                                        onClick={() => {
                                          const logoUrl =
                                            typeof item.customizations.uploadedLogo === 'string'
                                              ? item.customizations.uploadedLogo
                                              : (item.customizations.uploadedLogo as any).url ||
                                                (item.customizations.uploadedLogo as any).publicId ||
                                                item.customizations.uploadedLogo
                                          window.open(logoUrl, '_blank')
                                        }}
                                        title="انقر لعرض الشعار في نافذة جديدة"
                                      />
                                      <div className="logo-actions">
                                        <button
                                          className="btn btn-sm btn-primary"
                                          onClick={() => {
                                            const logoUrl =
                                              typeof item.customizations.uploadedLogo === 'string'
                                                ? item.customizations.uploadedLogo
                                                : (item.customizations.uploadedLogo as any).url ||
                                                  (item.customizations.uploadedLogo as any).publicId ||
                                                  item.customizations.uploadedLogo
                                            const fileName = `uploaded-logo.${logoUrl.split('.').pop() || 'png'}`
                                            downloadImage(logoUrl, fileName)
                                          }}
                                          title="تحميل الشعار"
                                        >
                                          <FontAwesomeIcon icon={faDownload} />
                                        </button>
                                        <button
                                          className="btn btn-sm btn-secondary"
                                          onClick={() => {
                                            const logoUrl =
                                              typeof item.customizations.uploadedLogo === 'string'
                                                ? item.customizations.uploadedLogo
                                                : (item.customizations.uploadedLogo as any).url ||
                                                  (item.customizations.uploadedLogo as any).publicId ||
                                                  item.customizations.uploadedLogo
                                            window.open(logoUrl, '_blank')
                                          }}
                                          title="عرض في نافذة جديدة"
                                        >
                                          <FontAwesomeIcon icon={faEye} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Customization Notes */}
                              {item.customizations.customizationNotes && (
                                <div className="customization-section">
                                  <h5>ملاحظات التخصيص:</h5>
                                  <div className="customization-notes">
                                    <p>{item.customizations.customizationNotes}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="design-files">
              <div className="files-header">
                <h3>ملفات التصميم</h3>
                <button onClick={() => router.push(`/admin/orders/${orderId}/upload`)} className="btn btn-primary">
                  <FontAwesomeIcon icon={faUpload} /> رفع ملفات جديدة
                </button>
              </div>

              {designFiles.length === 0 ? (
                <div className="empty-state">
                  <FontAwesomeIcon icon={faFile} size="3x" />
                  <h3>لا توجد ملفات تصميم</h3>
                  <p>لم يتم رفع أي ملفات تصميم لهذا الطلب بعد.</p>
                </div>
              ) : (
                <div className="files-grid">
                  {designFiles.map((file) => (
                    <div key={file.id} className="file-card">
                      <div className="file-icon">
                        <FontAwesomeIcon icon={faFile} />
                      </div>
                      <div className="file-info">
                        <h4>{file.fileName}</h4>
                        <p className="file-meta">
                          {formatFileSize(file.fileSize)} • {file.fileType.toUpperCase()}
                        </p>
                        <p className="file-meta">تم الرفع: {formatDate(file.uploadedAt)}</p>
                        {file.downloadCount > 0 && <p className="file-meta">التحميلات: {file.downloadCount}</p>}
                      </div>
                      <div className="file-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => window.open(`/api/design-files/${file.id}/download`, '_blank')}
                        >
                          <FontAwesomeIcon icon={faDownload} /> تحميل
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="order-history">
              <h3>تاريخ الطلب</h3>
              <div className="history-timeline">
                {order.orderHistory.map((entry, index) => (
                  <div key={index} className="history-item">
                    <div className="history-icon">
                      <FontAwesomeIcon icon={faClock} />
                    </div>
                    <div className="history-content">
                      <div className="history-header">
                        <span className="history-status">
                          {entry.status === 'pending' && 'في الانتظار'}
                          {entry.status === 'processing' && 'قيد المعالجة'}
                          {entry.status === 'completed' && 'مكتمل'}
                          {entry.status === 'cancelled' && 'ملغي'}
                          {entry.status === 'refunded' && 'مسترد'}
                          {entry.status === 'paid' && 'مدفوع'}
                          {entry.status === 'failed' && 'فشل'}
                          {entry.status === 'files_uploaded' && 'تم رفع الملفات'}
                          {entry.status === 'promo_applied' && 'تم تطبيق الكوبون'}
                          {entry.status === 'promo_removed' && 'تم إزالة الكوبون'}
                          {entry.status === 'note_added' && 'تم إضافة ملاحظة'}
                          {entry.status === 'system' && 'النظام'}
                          {entry.status === 'awaiting_customization' && 'في انتظار التخصيص'}
                          {![
                            'pending',
                            'processing',
                            'completed',
                            'cancelled',
                            'refunded',
                            'paid',
                            'failed',
                            'files_uploaded',
                            'promo_applied',
                            'promo_removed',
                            'note_added',
                            'system',
                            'awaiting_customization',
                          ].includes(entry.status) && entry.status}
                        </span>
                        <span className="history-date">{formatDate(entry.timestamp)}</span>
                      </div>
                      <p className="history-note">{entry.note}</p>
                      <span className="history-user">بواسطة {getAdminName(entry.changedBy)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="order-notes">
              <h3>ملاحظات الطلب</h3>
              <div className="notes-content">
                {order.adminNotes && (
                  <div className="note-section">
                    <h4>ملاحظات المدير</h4>
                    <p>{order.adminNotes}</p>
                  </div>
                )}
                {order.customerNotes && (
                  <div className="note-section">
                    <h4>ملاحظات العميل</h4>
                    <p>{order.customerNotes}</p>
                  </div>
                )}
                {!order.adminNotes && !order.customerNotes && (
                  <div className="empty-state">
                    <FontAwesomeIcon icon={faNotesMedical} size="3x" />
                    <h3>لا توجد ملاحظات</h3>
                    <p>لم يتم إضافة أي ملاحظات لهذا الطلب.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="refund-tab">
              <RefundVerification orderId={orderId} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
