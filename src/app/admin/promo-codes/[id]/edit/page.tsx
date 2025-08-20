'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import PromoCodeForm from '@/components/admin/PromoCodeForm'
import LoadingSpinner from '@/components/LoadingSpinner'
import '../../new/new-promo-code.css'

interface PromoCode {
  _id: string
  code: string
  productIds: string[]
  applyToAllProducts: boolean
  products?: {
    _id: string
    name: string
    slug: string
    price: number
    images?: string[]
  }[]
  discountType: 'percentage' | 'fixed_amount'
  discountValue: number
  maxDiscountAmount?: number
  usageLimit?: number
  usageCount?: number
  userUsageLimit?: number
  minimumOrderAmount?: number
  startDate?: string
  endDate?: string
  isActive: boolean
  description?: string
}

export default function EditPromoCodePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const promoCodeId = params.id as string

  const [promoCode, setPromoCode] = useState<PromoCode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Track if data has been loaded to prevent unnecessary reloads
  const dataLoadedRef = useRef(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.role !== 'admin') {
      router.push('/access-denied')
      return
    }

    // Only fetch data if we haven't loaded it yet
    if (!dataLoadedRef.current) {
      dataLoadedRef.current = true
      fetchPromoCode()
    }
  }, [session, status, router, promoCodeId])

  const fetchPromoCode = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/promo-codes/${promoCodeId}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('رمز الخصم غير موجود')
        } else {
          setError('حدث خطأ أثناء تحميل رمز الخصم')
        }
        return
      }

      const data = await response.json()
      setPromoCode(data.data)
    } catch (error) {
      console.error('Error fetching promo code:', error)
      setError('حدث خطأ أثناء تحميل رمز الخصم')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
        <p>جاري التحميل...</p>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') {
    return null
  }

  if (error) {
    return (
      <div className="new-promo-code-container">
        <div className="page-header">
          <div className="header-content">
            <h1>خطأ</h1>
            <p>{error}</p>
          </div>
        </div>
        <div className="form-container">
          <button onClick={() => router.push('/admin/promo-codes')} className="btn btn-primary">
            العودة إلى رموز الخصم
          </button>
        </div>
      </div>
    )
  }

  const handleSuccess = () => {
    router.push('/admin/promo-codes')
  }

  const handleCancel = () => {
    router.push('/admin/promo-codes')
  }

  return (
    <div className="new-promo-code-container">
      <div className="page-header">
        <div className="header-content">
          <Link href="/admin/promo-codes" className="back-button">
            <FontAwesomeIcon icon={faArrowRight} />
            الرجوع لرموز الخصم
          </Link>
          <div className="header-text">
            <h1>تعديل رمز الخصم</h1>
            <p>تعديل رمز الخصم: {promoCode?.code}</p>
          </div>
        </div>
      </div>

      <div className="form-container">
        <PromoCodeForm promoCode={promoCode} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}
