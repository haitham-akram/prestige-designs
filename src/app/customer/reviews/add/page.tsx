'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faStar,
  faArrowLeft,
  faSpinner,
  faCheck,
  faExclamationTriangle,
  faUser,
  faComment,
  faHeart,
} from '@fortawesome/free-solid-svg-icons'
import './add-review.css'
import './add-review.css'

function AddReviewForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  const [formData, setFormData] = useState({
    name: '',
    rating: 0,
    text: '',
    avatar: '', // Will be set from user session
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoverRating, setHoverRating] = useState(0)

  // Auto-fill user data from session
  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: session.user.name || '',
        avatar: session.user.image || '',
      }))
    }
  }, [session])

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }

    // Auto-fill user data but keep name editable
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: session.user.name || '', // User can still edit this
        avatar: session.user.image || '',
      }))
    }
  }, [status, router, session])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.rating || !formData.text) {
      setError('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    if (formData.text.length < 10) {
      setError('يجب أن يكون التقييم 10 أحرف على الأقل')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          orderId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        // Reset form
        setFormData({
          name: session?.user?.name || '',
          rating: 0,
          text: '',
          avatar: session?.user?.image || '',
        })
      } else {
        setError(data.message || 'فشل في إرسال التقييم')
      }
    } catch (err) {
      console.error('Error submitting review:', err)
      setError('حدث خطأ أثناء إرسال التقييم')
    } finally {
      setLoading(false)
    }
  }

  const handleRatingClick = (rating) => {
    setFormData((prev) => ({
      ...prev,
      rating,
    }))
  }

  if (status === 'loading') {
    return (
      <div className="addRev-loading">
        <FontAwesomeIcon icon={faSpinner} spin className="addRev-loading-icon" />
        <p>جاري التحميل...</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="addRev-success-page">
        <div className="addRev-success-container">
          <div className="addRev-success-icon">
            <FontAwesomeIcon icon={faCheck} />
          </div>
          <h1>تم إرسال تقييمك بنجاح!</h1>
          <p>شكراً لك على مشاركة تجربتك معنا. سيتم مراجعة التقييم ونشره قريباً.</p>
          <div className="addRev-success-actions">
            <button onClick={() => router.push('/customer/orders')} className="addRev-btn-primary">
              <FontAwesomeIcon icon={faArrowLeft} />
              العودة للطلبات
            </button>
            <button onClick={() => router.push('/')} className="addRev-btn-secondary">
              الصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="addRev-page">
      <div className="addRev-container">
        <div className="addRev-header">
          <button onClick={() => router.back()} className="addRev-back-button">
            <FontAwesomeIcon icon={faArrowLeft} />
            العودة
          </button>
          <h1>
            <FontAwesomeIcon icon={faHeart} />
            إضافة تقييم
          </h1>
          <p>شاركنا تجربتك مع خدماتنا</p>
        </div>

        <form onSubmit={handleSubmit} className="addRev-form">
          {/* Name Field - Editable */}
          <div className="addRev-form-group">
            <label htmlFor="name" className="addRev-form-label">
              <FontAwesomeIcon icon={faUser} />
              الاسم
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="addRev-form-input"
              placeholder="اكتب اسمك"
              required
            />
          </div>

          {/* User Avatar Display */}
          <div className="addRev-form-group">
            <label className="addRev-form-label">الملف الشخصي</label>
            <div className="addRev-user-avatar-section">
              <div className="addRev-user-avatar">
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt="User Avatar"
                    width={80}
                    height={80}
                    className="rounded-full object-cover"
                    onError={() => {
                      // Fallback will be handled by Next.js
                      console.log('Failed to load user image')
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '2rem' }}>👤</span>
                )}
              </div>
              <div className="addRev-user-name">{session?.user?.name || 'مستخدم'}</div>
            </div>
          </div>

          {/* Rating */}
          <div className="addRev-form-group">
            <label className="addRev-form-label">التقييم</label>
            <div className="addRev-rating-section">
              <div className="addRev-rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`addRev-star-button ${star <= (hoverRating || formData.rating) ? 'filled' : ''}`}
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <FontAwesomeIcon icon={faStar} />
                  </button>
                ))}
              </div>
              <span className="addRev-rating-text" style={{ color: 'var(--customer-text-secondary, #b8b8b8)' }}>
                {formData.rating === 0 && 'اختر التقييم'}
                {formData.rating === 1 && 'ضعيف جداً'}
                {formData.rating === 2 && 'ضعيف'}
                {formData.rating === 3 && 'متوسط'}
                {formData.rating === 4 && 'جيد'}
                {formData.rating === 5 && 'ممتاز'}
              </span>
            </div>
          </div>

          {/* Review Text */}
          <div className="addRev-form-group">
            <label htmlFor="text" className="addRev-form-label">
              <FontAwesomeIcon icon={faComment} />
              التقييم
            </label>
            <textarea
              id="text"
              value={formData.text}
              onChange={(e) => setFormData((prev) => ({ ...prev, text: e.target.value }))}
              className="addRev-form-textarea"
              placeholder="شاركنا تجربتك مع خدماتنا... (10 أحرف على الأقل)"
              rows={5}
              required
              minLength={10}
            />
            <span className="addRev-char-count">{formData.text.length} حرف</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="addRev-error-message">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="addRev-submit-button"
            disabled={loading || !formData.name || !formData.rating || !formData.text}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                جاري الإرسال...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCheck} />
                إرسال التقييم
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// Loading component for Suspense fallback
function ReviewsLoading() {
  return (
    <div className="addRev-loading">
      <FontAwesomeIcon icon={faSpinner} spin className="addRev-loading-icon" />
      <h2>جاري تحميل صفحة التقييم...</h2>
      <p>يرجى الانتظار لحظة...</p>
    </div>
  )
}

// Main component wrapped with Suspense
export default function AddReviewPage() {
  return (
    <Suspense fallback={<ReviewsLoading />}>
      <AddReviewForm />
    </Suspense>
  )
}
