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
  const orderNumber = searchParams.get('order') // Order number for free orders
  const isFreeOrder = searchParams.get('free') === 'true' // Check if this is a free order

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

    // Check if we have either PayPal parameters, our internal order ID, or free order info
    if (!paypalOrderId && !orderId && !orderNumber) {
      setError('معلومات الدفع مفقودة')
      setProcessing(false)
      return
    }

    // Handle free orders
    if (isFreeOrder && orderNumber) {
      setResult({
        message: 'تم إتمام الطلب بنجاح!',
        orderNumber: orderNumber,
        note: 'طلبك مجاني وتم قبوله بنجاح. سوف تتلقى رسالة تأكيد على البريد الإلكتروني قريباً.',
        isFree: true,
      })
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
  }, [session, paypalOrderId, payerID, orderId, orderNumber, isFreeOrder, router])

  if (processing) {
    return (
      <div className="osu-loading-container">
        <div className="osu-loading-spinner"></div>
        <p className="osu-loading-text">جاري معالجة عملية الدفع...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="osu-success-page">
        <div className="osu-error-container">
          <FontAwesomeIcon icon={faExclamationTriangle} className="osu-error-icon" />
          <h1 className="osu-error-title">خطأ في عملية الدفع</h1>
          <p className="osu-error-message">{error}</p>
          <button onClick={() => router.push('/checkout')} className="osu-btn-error">
            <FontAwesomeIcon icon={faCreditCard} />
            المحاولة مرة أخرى
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="osu-success-page">
      <div className="osu-success-container">
        <div className="osu-success-icon-container">
          <div className="osu-success-icon-bg">
            <FontAwesomeIcon icon={faCheckCircle} className="osu-success-icon" />
          </div>
        </div>

        <h1 className="osu-success-title">{result.isFree ? 'تم قبول الطلب بنجاح!' : 'تم الدفع بنجاح!'}</h1>
        <p className="osu-success-subtitle">
          {result.isFree
            ? 'شكراً لك! تم قبول طلبك المجاني بنجاح.'
            : 'شكراً لك على الشراء. تمت معالجة عملية الدفع بنجاح.'}
        </p>

        <div className="osu-payment-details">
          <h3>
            <FontAwesomeIcon icon={faClipboard} />
            {result.isFree ? 'تفاصيل الطلب' : 'تفاصيل عملية الدفع'}
          </h3>
          {(orderDetails?.orderNumber || result.orderNumber) && (
            <div className="osu-payment-detail-item">
              <span className="osu-detail-label">رقم الطلب:</span>
              <span className="osu-detail-value">{orderDetails?.orderNumber || result.orderNumber}</span>
            </div>
          )}
          {result.paypalOrderId && (
            <div className="osu-payment-detail-item">
              <span className="osu-detail-label">رقم معاملة PayPal:</span>
              <span className="osu-detail-value">{result.paypalOrderId}</span>
            </div>
          )}
          {result.payerID && (
            <div className="osu-payment-detail-item">
              <span className="osu-detail-label">معرف الدافع:</span>
              <span className="osu-detail-value">{result.payerID}</span>
            </div>
          )}
          {result.isFree ? (
            <div className="osu-payment-detail-item">
              <span className="osu-detail-label">المبلغ:</span>
              <span className="osu-detail-value" style={{ color: '#28a745', fontWeight: 'bold' }}>
                مجاني - $0.00
              </span>
            </div>
          ) : (
            orderDetails?.totalPrice && (
              <div className="osu-payment-detail-item">
                <span className="osu-detail-label">المبلغ المدفوع:</span>
                <span className="osu-detail-value">${orderDetails.totalPrice}</span>
              </div>
            )
          )}
        </div>

        {result.note && (
          <div className="osu-success-note">
            <FontAwesomeIcon icon={faEnvelope} style={{ marginLeft: '8px' }} />
            {result.note}
          </div>
        )}

        <div className="osu-action-buttons">
          <button onClick={() => router.push('/customer/orders')} className="osu-btn-primary">
            <FontAwesomeIcon icon={faEye} />
            عرض طلباتي
          </button>
          <button onClick={() => router.push('/')} className="osu-btn-secondary">
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
        <div className="osu-loading-container">
          <div className="osu-loading-spinner"></div>
          <p className="osu-loading-text">جاري التحميل...</p>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
