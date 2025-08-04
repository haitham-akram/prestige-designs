'use client'

import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'

export default function HomePage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const isDeactivated = searchParams.get('deactivated') === 'true'
  const [showBanner, setShowBanner] = useState(isDeactivated)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">Prestige Designs</h1>
            </div>
            <div className="flex items-center space-x-4">
              {session ? (
                <div className="flex items-center space-x-4">
                  <span className="text-white">مرحباً، {session.user?.name}</span>
                  <a
                    href="/dashboard"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    لوحة التحكم
                  </a>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <a href="/auth/signin" className="text-white hover:text-purple-300 transition-colors">
                    تسجيل الدخول
                  </a>
                  <a
                    href="/auth/signup"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    إنشاء حساب
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Deactivation Banner */}
      {showBanner && (
        <div className="bg-red-600 text-white px-4 py-3 relative">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
              <div>
                <h3 className="font-semibold">تم إلغاء تفعيل حسابك</h3>
                <p className="text-sm opacity-90">
                  تم إلغاء تفعيل حسابك من قبل المدير. يرجى التواصل مع الدعم الفني للمساعدة.
                </p>
              </div>
            </div>
            <button onClick={() => setShowBanner(false)} className="text-white hover:text-red-200 transition-colors">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-6">مرحباً بك في Prestige Designs</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            منصة تصميم متقدمة تقدم حلول إبداعية ومبتكرة لجميع احتياجاتك التصميمية
          </p>

          {!session && (
            <div className="flex justify-center space-x-4">
              <a
                href="/auth/signup"
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
              >
                ابدأ الآن
              </a>
              <a
                href="/auth/signin"
                className="border border-white text-white hover:bg-white hover:text-purple-900 px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
              >
                تسجيل الدخول
              </a>
            </div>
          )}

          {session && (
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-4">مرحباً بك مرة أخرى!</h3>
              <p className="text-gray-300 mb-6">يمكنك الوصول إلى لوحة التحكم الخاصة بك لإدارة مشاريعك وتصميماتك.</p>
              <a
                href="/dashboard"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
              >
                الذهاب إلى لوحة التحكم
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
