'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import PromoCodeForm from '@/components/admin/PromoCodeForm'
import LoadingSpinner from '@/components/LoadingSpinner'
import './new-promo-code.css'

export default function NewPromoCodePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.role !== 'admin') {
      router.push('/access-denied')
    }
  }, [session, status, router])

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
            <h1>إضافة رمز خصم جديد</h1>
            <p>أنشئ رمز خصم جديد لجذب العملاء وزيادة المبيعات</p>
          </div>
        </div>
      </div>

      <div className="form-container">
        <PromoCodeForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}
