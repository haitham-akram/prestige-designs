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

export default function CustomerOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        <div className="customer-orders-loading">
          <FontAwesomeIcon icon={faSpinner} spin className="customer-orders-loading-icon" />
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
        <div className="customer-orders-error">
          <FontAwesomeIcon icon={faExclamationCircle} className="customer-orders-error-icon" />
          <h2>خطأ في تحميل الطلبات</h2>
          <p>{error}</p>
          <button onClick={fetchOrders} className="customer-orders-retry-btn">
            المحاولة مرة أخرى
          </button>
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout>
      <div className="customer-orders-page">
        <div className="customer-orders-container">
          <div className="customer-orders-header">
            <div className="customer-orders-header-content">
              <h1>
                <FontAwesomeIcon icon={faBox} />
                طلباتي
              </h1>
              <p>عرض وإدارة جميع طلباتك</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="customer-orders-no-orders">
              <FontAwesomeIcon icon={faBox} className="customer-orders-no-orders-icon" />
              <h3>لا توجد طلبات بعد</h3>
              <p>ابدأ بتصفح متجرنا لإضافة طلبات جديدة</p>
              <button onClick={() => router.push('/')} className="customer-orders-browse-store-btn">
                تصفح المتجر
              </button>
            </div>
          ) : (
            <div className="customer-orders-list">
              {orders.map((order) => (
                <div key={order._id} className="customer-orders-card">
                  <div className="customer-orders-header-info">
                    <div className="customer-orders-info">
                      <h3>طلب #{order.orderNumber}</h3>
                      <div className="customer-orders-meta">
                        <span className="customer-orders-date">
                          <FontAwesomeIcon icon={faCalendarAlt} />
                          {formatDate(order.createdAt)}
                        </span>
                        <span className="customer-orders-total">
                          <FontAwesomeIcon icon={faDollarSign} />${order.totalPrice}
                        </span>
                      </div>
                    </div>

                    <div className="customer-orders-status">
                      <span
                        className={`customer-orders-status-badge customer-orders-status-${order.orderStatus}`}
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

                  <div className="customer-orders-items">
                    {order.items.map((item, index) => (
                      <div key={index} className="customer-orders-item">
                        <div className="customer-orders-item-info">
                          <h4>{item.productId.name}</h4>
                          <div className="customer-orders-item-details">
                            <span>الكمية: {item.quantity}</span>
                            <span>السعر: ${item.totalPrice}</span>
                            {item.customizations?.color && <span>اللون: {item.customizations.color}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.designFiles && order.designFiles.length > 0 && (
                    <div className="customer-orders-downloads">
                      <h4>
                        <FontAwesomeIcon icon={faFileDownload} />
                        الملفات المتاحة للتحميل
                      </h4>
                      <div className="customer-orders-download-files">
                        {order.designFiles.map((file, index) => (
                          <button
                            key={index}
                            onClick={() => handleDownloadFile(file.fileUrl, file.fileName)}
                            className="customer-orders-download-btn"
                          >
                            <FontAwesomeIcon icon={faDownload} />
                            {file.fileName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="customer-orders-actions">
                    <button
                      onClick={() => router.push(`/customer/orders/${order._id}`)}
                      className="customer-orders-view-order-btn"
                    >
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
