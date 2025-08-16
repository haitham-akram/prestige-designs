import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheckCircle,
  faExclamationTriangle,
  faInfoCircle,
  faTimesCircle,
  faExternalLinkAlt,
  faRefresh,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import './RefundVerification.css'

interface RefundVerificationProps {
  orderId: string
}

interface VerificationStep {
  step: string
  title: string
  status: 'success' | 'warning' | 'error' | 'info'
  message: string
  details: string
}

interface RefundStatusData {
  orderId: string
  orderNumber: string
  refundStatus: string
  refundAmount: number | null
  refundDate: string | null
  paypalTransactionId: string | null
  paypalRefundId: string | null
  verificationSteps: VerificationStep[]
  paypalVerificationInstructions: {
    title: string
    steps: string[]
    paypalDashboardUrl: string
  }
  refundHistory: Array<{
    status: string
    timestamp: string
    note?: string
    changedBy?: string
  }>
  orderStatus: string
  paymentStatus: string
}

export default function RefundVerification({ orderId }: RefundVerificationProps) {
  const [refundData, setRefundData] = useState<RefundStatusData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const fetchRefundStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/orders/${orderId}/refund-status`)

      if (!response.ok) {
        throw new Error('Failed to fetch refund status')
      }

      const data = await response.json()
      setRefundData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch refund status')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <FontAwesomeIcon icon={faCheckCircle} className="status-icon success" />
      case 'warning':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="status-icon warning" />
      case 'error':
        return <FontAwesomeIcon icon={faTimesCircle} className="status-icon error" />
      default:
        return <FontAwesomeIcon icon={faInfoCircle} className="status-icon info" />
    }
  }

  const getRefundStatusMessage = (status: string) => {
    switch (status) {
      case 'fully_refunded':
        return { message: 'تم الاسترداد بالكامل', className: 'refund-status success' }
      case 'refund_attempted':
        return { message: 'تمت محاولة الاسترداد', className: 'refund-status warning' }
      case 'not_refunded':
        return { message: 'لم يتم الاسترداد', className: 'refund-status info' }
      default:
        return { message: 'حالة غير محددة', className: 'refund-status info' }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="refund-verification">
      <div className="refund-verification-header">
        <h3>تحقق من حالة الاسترداد</h3>
        <button onClick={fetchRefundStatus} className="btn btn-secondary" disabled={loading}>
          {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRefresh} />}
          {loading ? 'جاري التحميل...' : 'تحديث'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <FontAwesomeIcon icon={faTimesCircle} />
          <span>{error}</span>
        </div>
      )}

      {refundData && (
        <div className="refund-status-container">
          {/* Overall Status */}
          <div className="refund-summary">
            <div className={getRefundStatusMessage(refundData.refundStatus).className}>
              {getRefundStatusMessage(refundData.refundStatus).message}
            </div>
            {refundData.refundAmount && (
              <div className="refund-amount">المبلغ المسترد: ${refundData.refundAmount.toFixed(2)}</div>
            )}
            {refundData.refundDate && (
              <div className="refund-date">تاريخ الاسترداد: {formatDate(refundData.refundDate)}</div>
            )}
          </div>

          {/* Quick IDs */}
          <div className="refund-ids">
            <div className="refund-id-item">
              <strong>رقم الطلب:</strong> {refundData.orderNumber}
            </div>
            {refundData.paypalTransactionId && (
              <div className="refund-id-item">
                <strong>معرف المعاملة:</strong>
                <code>{refundData.paypalTransactionId}</code>
              </div>
            )}
            {refundData.paypalRefundId && (
              <div className="refund-id-item">
                <strong>معرف الاسترداد:</strong>
                <code className="refund-id">{refundData.paypalRefundId}</code>
              </div>
            )}
          </div>

          {/* Verification Steps */}
          <div className="verification-steps">
            <h4>خطوات التحقق</h4>
            {refundData.verificationSteps.map((step, index) => (
              <div key={index} className={`verification-step ${step.status}`}>
                {getStatusIcon(step.status)}
                <div className="step-content">
                  <div className="step-title">{step.title}</div>
                  <div className="step-message">{step.message}</div>
                  {showDetails && (
                    <div className="step-details">
                      <small>{step.details}</small>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* PayPal Verification Instructions */}
          <div className="paypal-verification">
            <h4>{refundData.paypalVerificationInstructions.title}</h4>
            <ol>
              {refundData.paypalVerificationInstructions.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
            <a
              href={refundData.paypalVerificationInstructions.paypalDashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} />
              فتح PayPal Dashboard
            </a>
          </div>

          {/* Refund History */}
          {refundData.refundHistory.length > 0 && (
            <div className="refund-history">
              <h4>سجل الاسترداد</h4>
              {refundData.refundHistory.map((entry, index) => (
                <div key={index} className="history-entry">
                  <div className="history-timestamp">{formatDate(entry.timestamp)}</div>
                  <div className="history-content">
                    <div className="history-status">{entry.status}</div>
                    {entry.note && <div className="history-note">{entry.note}</div>}
                    {entry.changedBy && <div className="history-by">بواسطة: {entry.changedBy}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Toggle Details */}
          <div className="toggle-details">
            <button onClick={() => setShowDetails(!showDetails)} className="btn btn-link">
              {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
