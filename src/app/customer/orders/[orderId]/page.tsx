'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faDownload,
  faSpinner,
  faBox,
  faCheckCircle,
  faClock,
  faExclamationCircle,
  faFileDownload,
  faUser,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faShoppingCart,
} from '@fortawesome/free-solid-svg-icons'
import './order-details.css'

// Types
interface Order {
  _id: string
  orderNumber: string
  orderStatus: string
  createdAt: string
  updatedAt: string
  totalPrice: number
  discountAmount?: number
  promoCode?: string
  customerInfo?: {
    name: string
    email: string
    phone: string
    address: string
  }
  items: OrderItem[]
  designFiles?: DesignFile[]
}

interface OrderItem {
  productName: string
  productId?: { name: string }
  quantity: number
  totalPrice: number
  originalPrice?: number
  discountAmount?: number
  hasCustomizations?: boolean
  customizations?: {
    colors?: { name: string; hex: string }[]
    uploadedImages?: string[]
  }
  designFiles?: DesignFile[] // Add designFiles to OrderItem interface
}

interface DesignFile {
  fileName: string
  fileUrl: string
  fileType: string
}

export default function OrderDetailsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    // Allow both customers and admins to access this page
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`/api/orders/details?orderId=${orderId}`)
        const data = await response.json()

        if (data.success) {
          setOrder(data.order)
        } else {
          setError(data.error || 'Failed to fetch order details')
        }
      } catch (err) {
        console.error('Error fetching order details:', err)
        setError('Failed to fetch order details')
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchOrderDetails()
    }
  }, [status, session, router, orderId])

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error downloading file:', err)
      alert('Failed to download file')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return faCheckCircle
      case 'pending':
        return faClock
      case 'processing':
        return faSpinner
      default:
        return faExclamationCircle
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981' // green
      case 'pending':
        return '#f59e0b' // yellow
      case 'processing':
        return '#3b82f6' // blue
      default:
        return '#ef4444' // red
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format price to 2 decimal places
  const formatPrice = (price: number) => {
    return parseFloat(price.toString()).toFixed(2)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="order-details-loading">
        <FontAwesomeIcon icon={faSpinner} spin className="loading-icon" />
        <p>جاري تحميل تفاصيل الطلب...</p>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to signin
  }

  if (error) {
    return (
      <div className="order-details-error">
        <FontAwesomeIcon icon={faExclamationCircle} className="error-icon" />
        <h2>خطأ في تحميل تفاصيل الطلب</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/customer/orders')} className="back-to-orders-btn">
          العودة للطلبات
        </button>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="order-details-error">
        <FontAwesomeIcon icon={faBox} className="error-icon" />
        <h2>لم يتم العثور على الطلب</h2>
        <p>الطلب المطلوب غير موجود أو ليس لديك صلاحية لعرضه</p>
        <button onClick={() => router.push('/customer/orders')} className="back-to-orders-btn">
          العودة للطلبات
        </button>
      </div>
    )
  }

  return (
    <div className="order-details-page">
      <div className="order-details-container">
        <div className="order-details-header">
          <button onClick={() => router.push('/customer/orders')} className="back-btn">
            <FontAwesomeIcon icon={faArrowLeft} />
            العودة للطلبات
          </button>

          <div className="header-content">
            <h1>
              <FontAwesomeIcon icon={faBox} />
              تفاصيل الطلب #{order.orderNumber}
            </h1>
            <div className="order-status-header">
              <span
                className={`status-badge status-${order.orderStatus}`}
                style={{ color: getStatusColor(order.orderStatus) }}
              >
                <FontAwesomeIcon icon={getStatusIcon(order.orderStatus)} />
                {order.orderStatus === 'completed'
                  ? 'مكتمل'
                  : order.orderStatus === 'pending'
                  ? 'في الانتظار'
                  : order.orderStatus === 'processing'
                  ? 'جاري المعالجة'
                  : order.orderStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="order-details-grid">
          {/* Order Summary */}
          <div className="order-summary-card">
            <h3>
              <FontAwesomeIcon icon={faShoppingCart} />
              ملخص الطلب
            </h3>
            <div className="summary-details">
              <div className="detail-row">
                <span className="detail-label">رقم الطلب:</span>
                <span className="detail-value">{order.orderNumber}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">تاريخ الطلب:</span>
                <span className="detail-value">{formatDate(order.createdAt)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">آخر تحديث:</span>
                <span className="detail-value">{formatDate(order.updatedAt)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">إجمالي السعر:</span>
                <span className="detail-value price">${formatPrice(order.totalPrice)}</span>
              </div>
              {order.discountAmount && order.discountAmount > 0 && (
                <div className="detail-row">
                  <span className="detail-label">الخصم:</span>
                  <span className="detail-value discount">-${formatPrice(order.discountAmount)}</span>
                </div>
              )}
              {order.promoCode && (
                <div className="detail-row">
                  <span className="detail-label">كود الخصم:</span>
                  <span className="detail-value promo-code">{order.promoCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          {order.customerInfo && (
            <div className="customer-info-card">
              <h3>
                <FontAwesomeIcon icon={faUser} />
                معلومات العميل
              </h3>
              <div className="customer-details">
                {order.customerInfo.name && (
                  <div className="detail-row">
                    <span className="detail-label">الاسم:</span>
                    <span className="detail-value">{order.customerInfo.name}</span>
                  </div>
                )}
                {order.customerInfo.email && (
                  <div className="detail-row">
                    <span className="detail-label">
                      <FontAwesomeIcon icon={faEnvelope} />
                      البريد الإلكتروني:
                    </span>
                    <span className="detail-value">{order.customerInfo.email}</span>
                  </div>
                )}
                {order.customerInfo.phone && (
                  <div className="detail-row">
                    <span className="detail-label">
                      <FontAwesomeIcon icon={faPhone} />
                      الهاتف:
                    </span>
                    <span className="detail-value">{order.customerInfo.phone}</span>
                  </div>
                )}
                {order.customerInfo.address && (
                  <div className="detail-row">
                    <span className="detail-label">
                      <FontAwesomeIcon icon={faMapMarkerAlt} />
                      العنوان:
                    </span>
                    <span className="detail-value">{order.customerInfo.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="order-items-card">
          <h3>العناصر المطلوبة</h3>
          <div className="order-items-list">
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <div key={index} className="order-item-detail">
                  <div className="item-main-info">
                    <h4>{item.productName || item.productId?.name || 'منتج غير محدد'}</h4>
                    <div className="item-specs">
                      <span>الكمية: {item.quantity}</span>
                      <span>السعر: ${formatPrice(item.totalPrice)}</span>
                      {item.originalPrice && item.originalPrice !== item.totalPrice && (
                        <span className="original-price">السعر الأصلي: ${formatPrice(item.originalPrice)}</span>
                      )}
                      {item.discountAmount && item.discountAmount > 0 && (
                        <span className="item-discount">خصم: -${formatPrice(item.discountAmount)}</span>
                      )}
                      {item.hasCustomizations && <span className="customizable-badge">قابل للتخصيص</span>}
                      {item.customizations?.colors && item.customizations.colors.length > 0 && (
                        <div className="color-display">
                          <span className="color-label">الألوان: </span>
                          <div className="color-chips">
                            {item.customizations.colors.map((color, colorIndex) => (
                              <span
                                key={colorIndex}
                                className="color-chip"
                                style={{ backgroundColor: color.hex || '#cccccc' }}
                                title={color.name}
                              >
                                {color.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.customizations?.uploadedImages && item.customizations.uploadedImages.length > 0 && (
                    <div className="item-customizations">
                      <h5>التخصيصات:</h5>
                      <p>تم رفع {item.customizations.uploadedImages.length} صورة مخصصة</p>
                    </div>
                  )}

                  {/* Show files for this specific item */}
                  {item.designFiles && item.designFiles.length > 0 && (
                    <div className="item-files-section">
                      <h5>
                        <FontAwesomeIcon icon={faFileDownload} />
                        ملفات {item.productName || item.productId?.name || 'المنتج'}
                      </h5>
                      <div className="item-files-grid">
                        {item.designFiles.map((file, fileIndex) => (
                          <button
                            key={fileIndex}
                            onClick={() => handleDownloadFile(file.fileUrl, file.fileName)}
                            className="download-file-btn"
                          >
                            <FontAwesomeIcon icon={faDownload} />
                            <span className="file-name">{file.fileName}</span>
                            <span className="file-type">{file.fileType}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>لا توجد عناصر متاحة</p>
            )}
          </div>
        </div>

        {/* Keep the old designFiles section for backward compatibility */}
        {order.designFiles && order.designFiles.length > 0 && (
          <div className="download-files-card">
            <h3>
              <FontAwesomeIcon icon={faFileDownload} />
              جميع الملفات المتاحة للتحميل
            </h3>
            <div className="download-files-grid">
              {order.designFiles.map((file, index) => (
                <button
                  key={index}
                  onClick={() => handleDownloadFile(file.fileUrl, file.fileName)}
                  className="download-file-btn"
                >
                  <FontAwesomeIcon icon={faDownload} />
                  <span className="file-name">{file.fileName}</span>
                  <span className="file-type">{file.fileType}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
