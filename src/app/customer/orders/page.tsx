'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEye,
  faDownload,
  faSpinner,
  faBox,
  faCalendarAlt,
  faDollarSign,
  faCheckCircle,
  faClock,
  faExclamationCircle,
  faFileDownload,
} from '@fortawesome/free-solid-svg-icons'
import CustomerLayout from '@/app/customer-layout'
import './customer-orders.css'

// Types
interface OrderItem {
  productId: {
    name: string
  }
  productName?: string
  quantity: number
  totalPrice: number
  hasCustomizations?: boolean
  customizations?: {
    colors?: { name: string; hex: string }[]
    customizationNotes?: string
  }
}

interface OrderHistory {
  status: string
  timestamp: string
  note?: string
  changedBy?: string
}

interface DesignFile {
  fileName: string
  fileUrl: string
}

interface Order {
  _id: string
  orderNumber: string
  createdAt: string
  totalPrice: number
  orderStatus: 'pending' | 'processing' | 'completed' | 'cancelled' | 'awaiting_customization' | 'under_customization'
  paymentMethod?: string
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded' | 'free'
  subtotal?: number
  totalPromoDiscount?: number
  appliedPromoCodes?: string[]
  items: OrderItem[]
  orderHistory?: OrderHistory[]
  designFiles?: DesignFile[]
}

export default function CustomerOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('🔍 useEffect triggered:', { status, sessionUser: session?.user?.email })

    if (status === 'loading') return

    if (status === 'unauthenticated') {
      console.log('❌ User not authenticated, redirecting to signin')
      router.push('/auth/signin')
      return
    }

    // Allow both customers and admins to access this page
    console.log('✅ User authenticated, fetching orders')
    fetchOrders()
  }, [status, session, router])

  const fetchOrders = async () => {
    try {
      console.log('🔍 Fetching customer orders...')
      const response = await fetch('/api/orders/customer')
      const data = await response.json()

      console.log('📦 API Response:', response.status, data)

      if (data.success) {
        setOrders(data.orders)
        console.log('✅ Orders loaded:', data.orders.length)
      } else {
        setError(data.error || 'Failed to fetch orders')
        console.log('❌ API Error:', data.error)
      }
    } catch (err) {
      console.error('❌ Error fetching orders:', err)
      setError('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadFile = async (fileUrl, fileName) => {
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return faCheckCircle
      case 'pending':
        return faClock
      case 'processing':
        return faSpinner
      case 'awaiting_customization':
        return faExclamationCircle
      case 'under_customization':
        return faSpinner
      default:
        return faExclamationCircle
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10b981' // green
      case 'pending':
        return '#f59e0b' // yellow
      case 'processing':
        return '#3b82f6' // blue
      case 'awaiting_customization':
        return '#f59e0b' // yellow
      case 'under_customization':
        return '#8b5cf6' // purple
      default:
        return '#ef4444' // red
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (status === 'loading' || loading) {
    return (
      <CustomerLayout>
        <div className="oc-loading">
          <FontAwesomeIcon icon={faSpinner} spin className="oc-loading-icon" />
          <p>جاري تحميل طلباتك...</p>
        </div>
      </CustomerLayout>
    )
  }

  if (!session) {
    return null // Will redirect to signin
  }

  if (error) {
    return (
      <CustomerLayout>
        <div className="oc-error">
          <FontAwesomeIcon icon={faExclamationCircle} className="oc-error-icon" />
          <h2>خطأ في تحميل الطلبات</h2>
          <p>{error}</p>
          <button onClick={fetchOrders} className="oc-retry-btn">
            المحاولة مرة أخرى
          </button>
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout>
      <div className="oc-page">
        <div className="oc-container">
          <div className="oc-header">
            <div className="oc-header-content">
              <h1>
                <FontAwesomeIcon icon={faBox} />
                طلباتي
              </h1>
              <p>عرض وإدارة جميع طلباتك</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="oc-no-orders">
              <FontAwesomeIcon icon={faBox} className="oc-no-orders-icon" />
              <h3>لا توجد طلبات بعد</h3>
              <p>ابدأ بتصفح متجرنا لإضافة طلبات جديدة</p>
              <button onClick={() => router.push('/')} className="oc-browse-store-btn">
                تصفح المتجر
              </button>
            </div>
          ) : (
            <div className="oc-list">
              {orders.map((order) => (
                <div key={order._id} className="oc-card">
                  <div className="oc-header-info">
                    <div className="oc-info">
                      <h3>طلب #{order.orderNumber}</h3>
                      <div className="oc-meta">
                        <span className="oc-date">
                          <FontAwesomeIcon icon={faCalendarAlt} />
                          {formatDate(order.createdAt)}
                        </span>
                        <span className="oc-total">
                          <FontAwesomeIcon icon={faDollarSign} />
                          {order.totalPrice === 0 ? 'مجاني' : `$${order.totalPrice}`}
                        </span>
                      </div>
                    </div>

                    <div className="oc-status">
                      <span
                        className={`oc-status-badge oc-status-${order.orderStatus}`}
                        style={{ color: getStatusColor(order.orderStatus) }}
                      >
                        <FontAwesomeIcon icon={getStatusIcon(order.orderStatus)} />
                        {order.orderStatus === 'completed'
                          ? 'مكتمل'
                          : order.orderStatus === 'pending'
                          ? 'في الانتظار'
                          : order.orderStatus === 'processing'
                          ? 'جاري المعالجة'
                          : order.orderStatus === 'awaiting_customization'
                          ? 'في انتظار التخصيص'
                          : order.orderStatus === 'under_customization'
                          ? 'تحت التخصيص'
                          : order.orderStatus}
                      </span>
                    </div>
                  </div>

                  {/* Order Details Section */}
                  <div className="oc-order-details">
                    <div className="oc-payment-info">
                      <h4>معلومات الدفع</h4>
                      <div className="oc-payment-grid">
                        <div className="oc-payment-item">
                          <span className="oc-label">طريقة الدفع:</span>
                          <span className="oc-value">
                            {order.paymentMethod === 'paypal' ? 'باي بال' : order.paymentMethod || 'مجاني'}
                          </span>
                        </div>
                        <div className="oc-payment-item">
                          <span className="oc-label">حالة الدفع:</span>
                          <span className={`oc-value oc-payment-${order.paymentStatus}`}>
                            {order.paymentStatus === 'paid'
                              ? 'مدفوع'
                              : order.paymentStatus === 'pending'
                              ? 'في الانتظار'
                              : order.paymentStatus === 'failed'
                              ? 'فشل'
                              : order.paymentStatus === 'refunded'
                              ? 'مسترد'
                              : order.paymentStatus === 'free'
                              ? 'مجاني'
                              : order.paymentStatus || 'مجاني'}
                          </span>
                        </div>
                        {order.subtotal && (
                          <div className="oc-payment-item">
                            <span className="oc-label">المجموع الفرعي:</span>
                            <span className="oc-value">${order.subtotal}</span>
                          </div>
                        )}
                        {order.totalPromoDiscount && order.totalPromoDiscount > 0 && (
                          <div className="oc-payment-item">
                            <span className="oc-label">الخصم:</span>
                            <span className="oc-value oc-discount">-${order.totalPromoDiscount}</span>
                          </div>
                        )}
                        {order.appliedPromoCodes && order.appliedPromoCodes.length > 0 && (
                          <div className="oc-payment-item">
                            <span className="oc-label">كوبونات الخصم:</span>
                            <span className="oc-value oc-promo-codes">{order.appliedPromoCodes.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="oc-items">
                    <h4>المنتجات المطلوبة</h4>
                    {order.items.map((item, index) => (
                      <div key={index} className="oc-item">
                        <div className="oc-item-info">
                          <h5>{item.productName || item.productId.name}</h5>
                          <div className="oc-item-details">
                            <span>الكمية: {item.quantity}</span>
                            <span>السعر: ${item.totalPrice}</span>
                            {item.hasCustomizations && <span className="oc-customizable">قابل للتخصيص</span>}
                            {item.customizations?.colors && item.customizations.colors.length > 0 && (
                              <div className="oc-colors">
                                <span>الألوان المختارة:</span>
                                <div className="oc-color-list">
                                  {item.customizations.colors.map((color, colorIndex) => (
                                    <span
                                      key={colorIndex}
                                      className="oc-color-chip"
                                      style={{ backgroundColor: color.hex }}
                                      title={color.name}
                                    >
                                      {color.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {item.customizations?.customizationNotes && (
                              <div className="oc-notes">
                                <span>ملاحظات التخصيص:</span>
                                <p>{item.customizations.customizationNotes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order History Section */}
                  {order.orderHistory && order.orderHistory.length > 0 && (
                    <div className="oc-history">
                      <h4>تاريخ الطلب</h4>
                      <div className="oc-timeline">
                        {order.orderHistory
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((history, index) => (
                            <div key={index} className="oc-timeline-item">
                              <div className="oc-timeline-marker"></div>
                              <div className="oc-timeline-content">
                                <div className="oc-timeline-status">
                                  {history.status === 'completed'
                                    ? 'مكتمل'
                                    : history.status === 'pending'
                                    ? 'في الانتظار'
                                    : history.status === 'processing'
                                    ? 'جاري المعالجة'
                                    : history.status === 'awaiting_customization'
                                    ? 'في انتظار التخصيص'
                                    : history.status === 'under_customization'
                                    ? 'تحت التخصيص'
                                    : history.status}
                                </div>
                                <div className="oc-timeline-date">{formatDate(history.timestamp)}</div>
                                {history.note && <div className="oc-timeline-note">{history.note}</div>}
                                {history.changedBy && <div className="oc-timeline-by">بواسطة: {history.changedBy}</div>}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {order.designFiles && order.designFiles.length > 0 && (
                    <div className="oc-downloads">
                      <h4>
                        <FontAwesomeIcon icon={faFileDownload} />
                        الملفات المتاحة للتحميل
                      </h4>
                      <div className="oc-download-files">
                        {order.designFiles.map((file, index) => (
                          <button
                            key={index}
                            onClick={() => handleDownloadFile(file.fileUrl, file.fileName)}
                            className="oc-download-btn"
                          >
                            <FontAwesomeIcon icon={faDownload} />
                            {file.fileName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="oc-actions">
                    <button onClick={() => router.push(`/customer/orders/${order._id}`)} className="oc-view-order-btn">
                      <FontAwesomeIcon icon={faEye} />
                      عرض التفاصيل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  )
}
