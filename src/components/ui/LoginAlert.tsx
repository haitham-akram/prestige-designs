'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faTimes, faSignInAlt, faShoppingCart } from '@fortawesome/free-solid-svg-icons'
import './LoginAlert.css'

interface LoginAlertProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginAlert({ isOpen, onClose }: LoginAlertProps) {
  const router = useRouter()
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 300)
  }

  const handleLogin = () => {
    handleClose()
    router.push('/auth/signin')
  }

  const handleContinueShopping = () => {
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className={`lac-overlay ${isClosing ? 'closing' : ''}`}>
      <div className={`lac-alert ${isClosing ? 'closing' : ''}`}>
        <button className="lac-close" onClick={handleClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <div className="lac-icon">
          <FontAwesomeIcon icon={faUser} />
        </div>

        <div className="lac-content">
          <h2>تسجيل الدخول مطلوب</h2>
          <p>يجب عليك تسجيل الدخول أولاً لإتمام عملية الشراء</p>
          <p className="lac-subtitle">سجل دخولك للوصول إلى:</p>

          <div className="lac-benefits">
            <div className="lac-benefit-item">
              <FontAwesomeIcon icon={faShoppingCart} />
              <span>إتمام الطلب بسهولة</span>
            </div>
            <div className="lac-benefit-item">
              <FontAwesomeIcon icon={faUser} />
              <span>تتبع طلباتك</span>
            </div>
            <div className="lac-benefit-item">
              <FontAwesomeIcon icon={faSignInAlt} />
              <span>حفظ معلوماتك</span>
            </div>
          </div>
        </div>

        <div className="lac-actions">
          <button className="lac-btn lac-login-btn" onClick={handleLogin}>
            <FontAwesomeIcon icon={faSignInAlt} />
            تسجيل الدخول
          </button>
          <button className="lac-btn lac-continue-btn" onClick={handleContinueShopping}>
            متابعة التسوق
          </button>
        </div>
      </div>
    </div>
  )
}
