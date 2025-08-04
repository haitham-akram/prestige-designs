'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the proper dashboard
    router.replace('/admin/dashboard')
  }, [router])

  // Show a brief loading message while redirecting
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4 mx-auto"></div>
        <div>جاري التوجيه إلى لوحة التحكم...</div>
      </div>
    </div>
  )
}
