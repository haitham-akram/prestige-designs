/**
 * صفحة نجاح الدفع - Payment Success Page
 *
 * تظهر بعد إتمام عملية الدفع بنجاح عبر PayPal
 */

'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheckCircle,
  faSpinner,
  faExclamationTriangle,
  faEye,
  faShoppingCart,
  faCreditCard,
  faClipboard,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons'
import './success.css'

function CheckoutSuccessContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [processing, setProcessing] = useState(true)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [orderDetails, setOrderDetails] = useState<any>(null)

  const paypalOrderId = searchParams.get('paypalOrderId')
  const payerID = searchParams.get('payerID')
  const orderId = searchParams.get('orderId') // Our internal order ID (MongoDB _id)

  // Fetch order details when we have an orderId
  useEffect(() => {
    if (orderId) {
      fetch(`/api/orders/details?orderId=${orderId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setOrderDetails(data.order)
          }
        })
        .catch((err) => {
          console.error('Error fetching order details:', err)
        })
    }
  }, [orderId])

  useEffect(() => {
    console.log('Success page - Session status:', { session, orderId, paypalOrderId })

    // Wait for session to load before making decisions
    if (session === undefined) {
      console.log('Session is still loading...')
      // Session is still loading, wait
      return
    }

    if (!session?.user) {
      console.log('No session found, redirecting to sign in...')
      // Preserve the current URL with payment info for after login
      const currentUrl = window.location.href
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(currentUrl))
      return
    }

    console.log('Session found:', session.user.email)

    // Check if we have either PayPal parameters or our internal order ID
    if (!paypalOrderId && !orderId) {
      setError('معلومات الدفع مفقودة')
      setProcessing(false)
      return
    }

    // If we have orderId, it means payment was already processed
    if (orderId && !paypalOrderId) {
      setResult({
        message: 'تم إتمام عملية الدفع بنجاح!',
        orderId: orderId,
        note: 'تم معالجة طلبك بنجاح وسوف تتلقى رسالة تأكيد على البريد الإلكتروني قريباً.',
      })
      setProcessing(false)
      return
    }

    // Auto-capture payment would happen here for paypalOrderId case
    // For now, show success message
    setTimeout(() => {
      setResult({
        message: 'تم إتمام عملية الدفع بنجاح!',
        paypalOrderId,
        payerID,
      })
      setProcessing(false)
    }, 2000)
  }, [session, paypalOrderId, payerID, orderId, router])

  if (processing) {
    return (
      <div className="pal-loading-container">
        <div className="pal-loading-spinner"></div>
        <p className="pal-loading-text">جاري معالجة عملية الدفع...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pal-success-page">
        <div className="pal-error-container">
          <FontAwesomeIcon icon={faExclamationTriangle} className="pal-error-icon" />
          <h1 className="pal-error-title">خطأ في عملية الدفع</h1>
          <p className="pal-error-message">{error}</p>
          <button onClick={() => router.push('/checkout')} className="pal-btn-error">
            <FontAwesomeIcon icon={faCreditCard} />
            المحاولة مرة أخرى
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pal-success-page">
      <div className="pal-success-container">
        <div className="pal-success-icon-container">
          <div className="pal-success-icon-bg">
            <FontAwesomeIcon icon={faCheckCircle} className="pal-success-icon" />
          </div>
        </div>

        <h1 className="pal-success-title">تم الدفع بنجاح!</h1>
        <p className="pal-success-subtitle">شكراً لك على الشراء. تمت معالجة عملية الدفع بنجاح.</p>

        <div className="pal-payment-details">
          <h3>
            <FontAwesomeIcon icon={faClipboard} />
            تفاصيل عملية الدفع
          </h3>
          {orderDetails?.orderNumber && (
            <div className="pal-payment-detail-item">
              <span className="pal-detail-label">رقم الطلب:</span>
              <span className="pal-detail-value">{orderDetails.orderNumber}</span>
            </div>
          )}
          {result.paypalOrderId && (
            <div className="pal-payment-detail-item">
              <span className="pal-detail-label">رقم معاملة PayPal:</span>
              <span className="pal-detail-value">{result.paypalOrderId}</span>
            </div>
          )}
          {result.payerID && (
            <div className="pal-payment-detail-item">
              <span className="pal-detail-label">معرف الدافع:</span>
              <span className="pal-detail-value">{result.payerID}</span>
            </div>
          )}
          {orderDetails?.totalPrice && (
            <div className="pal-payment-detail-item">
              <span className="pal-detail-label">المبلغ المدفوع:</span>
              <span className="pal-detail-value">${orderDetails.totalPrice}</span>
            </div>
          )}
        </div>

        {result.note && (
          <div className="pal-success-note">
            <FontAwesomeIcon icon={faEnvelope} style={{ marginLeft: '8px' }} />
            {result.note}
          </div>
        )}

        <div className="pal-action-buttons">
          <button onClick={() => router.push('/customer/dashboard')} className="pal-btn-primary">
            <FontAwesomeIcon icon={faEye} />
            عرض طلباتي
          </button>
          <button onClick={() => router.push('/')} className="pal-btn-secondary">
            <FontAwesomeIcon icon={faShoppingCart} />
            متابعة التسوق
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="pal-loading-container">
          <div className="pal-loading-spinner"></div>
          <p className="pal-loading-text">جاري التحميل...</p>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
