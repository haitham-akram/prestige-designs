'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import '../../../styles/sign.css'

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export default function SignUpPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [success, setSuccess] = useState<boolean>(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError('') // Clear error when user types
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('الاسم مطلوب')
      return false
    }

    if (!formData.email.trim()) {
      setError('البريد الإلكتروني مطلوب')
      return false
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      return false
    }

    return true
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      // Register user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'فشل في التسجيل')
        setLoading(false)
        return
      }

      // Registration successful
      setSuccess(true)

      // Auto-login after successful registration
      const loginResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (loginResult?.error) {
        setError('تم التسجيل بنجاح، لكن فشل تسجيل الدخول التلقائي. يرجى تسجيل الدخول يدوياً.')
        setLoading(false)
        return
      }

      // Redirect to homepage for new customers
      router.push('/')
    } catch (error) {
      console.error('Registration error:', error)
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.')
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: string) => {
    setLoading(true)
    setError('')

    try {
      await signIn(provider, {
        callbackUrl: '/', // Redirect to homepage after social login
      })
    } catch (error) {
      console.error(`${provider} login error:`, error)
      setError(`فشل في التسجيل باستخدام ${provider}. يرجى المحاولة مرة أخرى.`)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="sign-container">
        <div className="sign-card">
          <div className="sign-header">
            <h1 className="sign-title">مرحباً بك في بريستيج!</h1>
            <p className="sign-subtitle">تم إنشاء حسابك بنجاح</p>
          </div>

          <div className="sign-success-message">تم إنشاء الحساب بنجاح! جاري التوجيه إلى لوحة التحكم...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="sign-container">
      <div className="sign-card">
        <div className="sign-header">
          <h1 className="sign-title">إنشاء حساب</h1>
          <p className="sign-subtitle">انضم إلى بريستيج ديزاين اليوم</p>
        </div>

        {error && <div className="sign-error-message">{error}</div>}

        {/* Social Login Section */}
        <div className="sign-social-section">
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            className="sign-btn sign-btn-google"
          >
            {loading ? (
              <div className="sign-spinner" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                التسجيل مع جوجل
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('twitter')}
            disabled={loading}
            className="sign-btn sign-btn-twitter"
          >
            {loading ? (
              <div className="sign-spinner" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
                التسجيل مع تويتر
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('discord')}
            disabled={loading}
            className="sign-btn sign-btn-discord"
          >
            {loading ? (
              <div className="sign-spinner" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.010c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                التسجيل مع ديسكورد
              </>
            )}
          </button>
        </div>

        <div className="sign-divider">
          <span>أو إنشاء حساب بالبريد الإلكتروني</span>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSignUp} className="sign-form">
          <div className="sign-form-group">
            <label htmlFor="name" className="sign-form-label">
              الاسم الكامل
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="أدخل اسمك الكامل"
              className="sign-form-input"
              required
              disabled={loading}
            />
          </div>

          <div className="sign-form-group">
            <label htmlFor="email" className="sign-form-label">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="أدخل بريدك الإلكتروني"
              className="sign-form-input"
              required
              disabled={loading}
            />
          </div>

          <div className="sign-form-group">
            <label htmlFor="password" className="sign-form-label">
              كلمة المرور
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="أنشئ كلمة مرور (6 أحرف على الأقل)"
              className="sign-form-input"
              required
              disabled={loading}
            />
          </div>

          <div className="sign-form-group">
            <label htmlFor="confirmPassword" className="sign-form-label">
              تأكيد كلمة المرور
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="أكد كلمة المرور"
              className="sign-form-input"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="sign-btn sign-btn-primary">
            {loading ? (
              <>
                <div className="sign-spinner" />
                جاري إنشاء الحساب...
              </>
            ) : (
              'إنشاء حساب'
            )}
          </button>
        </form>

        <div className="sign-footer">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            لديك حساب بالفعل؟{' '}
            <Link href="/auth/signin" className="sign-link">
              سجل دخولك هنا
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
