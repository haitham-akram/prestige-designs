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
} from '@fortawesome/free-solid-svg-icons'
import RefundVerification from '@/components/admin/RefundVerification'
import './order-detail.css'

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
}

const paymentStatusColors = {
  pending: '#f59e0b',
  paid: '#10b981',
  failed: '#ef4444',
  refunded: '#6b7280',
}

const customizationStatusColors = {
  none: '#6b7280',
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
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
                        <span className="detail-value">{order.customerPhone}</span>
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
                          {item.customizations?.colors && item.customizations.colors.length > 0 && (
                            <div className="item-row">
                              <span>الألوان:</span>
                              <span>
                                {item.customizations.colors.map((color, colorIndex) => (
                                  <span key={colorIndex} className="color-badge">
                                    {color.name}
                                  </span>
                                ))}
                              </span>
                            </div>
                          )}
                          {item.hasCustomizations && (
                            <div className="item-row">
                              <span>التخصيص:</span>
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
                                    {item.customizations.uploadedImages.map((imageUrl, imageIndex) => (
                                      <div key={imageIndex} className="uploaded-image-item">
                                        <img
                                          src={imageUrl}
                                          alt={`صورة مرفوعة ${imageIndex + 1}`}
                                          className="customization-image"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Uploaded Logo */}
                              {item.customizations.uploadedLogo && (
                                <div className="customization-section">
                                  <h5>الشعار المرفوع:</h5>
                                  <div className="uploaded-logo">
                                    <img
                                      src={item.customizations.uploadedLogo}
                                      alt="الشعار المرفوع"
                                      className="customization-logo"
                                    />
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
