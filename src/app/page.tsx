'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Only redirect after session is loaded to avoid hydration mismatch
    if (status === 'loading') return

    if (session?.user) {
      // Redirect based on role
      if (session.user.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/customer/dashboard')
      }
    }
  }, [session, status, router])

  // Show loading state during session check
  if (status === 'loading') {
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
        <div>Loading...</div>
      </div>
    )
  }

  // If user is authenticated, let useEffect handle redirect
  if (session?.user) {
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
        <div>Redirecting...</div>
      </div>
    )
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            Prestige Designs
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Premium digital designs for your creative projects. Join our community of designers and discover amazing
            resources.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/signin"
              className="auth-button-primary px-8 py-3 rounded-lg font-semibold transition-all duration-300 hover:transform hover:scale-105"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="auth-button-secondary px-8 py-3 rounded-lg font-semibold transition-all duration-300 hover:transform hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-lg bg-white/10 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-white mb-4">Premium Quality</h3>
            <p className="text-gray-300">High-quality digital designs crafted by professional designers</p>
          </div>
          <div className="text-center p-6 rounded-lg bg-white/10 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-white mb-4">Easy Access</h3>
            <p className="text-gray-300">Instant downloads and lifetime access to your purchases</p>
          </div>
          <div className="text-center p-6 rounded-lg bg-white/10 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-white mb-4">Support</h3>
            <p className="text-gray-300">Dedicated customer support for all your needs</p>
          </div>
        </div>
      </div>
    </div>
  )
}
