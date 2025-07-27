/**
 * Admin Dashboard Page
 *
 * This page serves as the main admin dashboard for managing the Prestige Designs store.
 * Only users with admin role can access this page.
 *
 * Features:
 * - User management overview
 * - Store statistics
 * - Quick actions for admin tasks
 * - Navigation to admin features
 * - Category management
 *
 * Access: Admin only (protected by middleware)
 */

'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Only perform redirects after hydration to avoid mismatch
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    // Redirect non-admin users to customer dashboard
    if (session?.user?.role !== 'admin') {
      router.push('/customer/dashboard')
      return
    }
  }, [status, session, router])

  useEffect(() => {
    // Fetch dashboard statistics
    const fetchStats = async () => {
      try {
        // This would be an API call to get dashboard stats
        // For now, we'll use placeholder data
        setStats({
          totalUsers: 5,
          totalCustomers: 4,
          totalAdmins: 1,
          totalCategories: 8,
          totalProducts: 0,
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.role === 'admin') {
      fetchStats()
    }
  }, [session])

  const handleSignOut = async () => {
    await signOut({
      callbackUrl: '/auth/signin',
    })
  }

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
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to signin
  }

  if (session.user.role !== 'admin') {
    return null // Will redirect to customer dashboard
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Admin Dashboard
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {session.user.name || session.user.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Role:{' '}
                <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  Admin
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="auth-button-secondary px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div
            className="p-6 rounded-lg border"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent-primary)' }}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Total Users
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {loading ? '...' : stats?.totalUsers || 0}
                </p>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-lg border"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent-secondary)' }}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Customers
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {loading ? '...' : stats?.totalCustomers || 0}
                </p>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-lg border"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'var(--success-color)' }}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Categories
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {loading ? '...' : stats?.totalCategories || 0}
                </p>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-lg border"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'var(--warning-color)' }}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 2L3 7v11a1 1 0 001 1h3v-8h6v8h3a1 1 0 001-1V7l-7-5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Products
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {loading ? '...' : stats?.totalProducts || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="p-6 rounded-lg border mb-8"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h3 className="text-lg font-medium mb-6" style={{ color: 'var(--text-primary)' }}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/admin/categories"
              className="block p-4 rounded-lg border transition-all duration-300 hover:transform hover:scale-105"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--bg-primary)',
              }}
            >
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Manage Categories
              </h4>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Create, edit, and organize product categories
              </p>
            </Link>

            <button
              className="text-left p-4 rounded-lg border transition-all duration-300 hover:transform hover:scale-105"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--bg-primary)',
              }}
            >
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Manage Users
              </h4>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                View and manage user accounts
              </p>
            </button>

            <button
              className="text-left p-4 rounded-lg border transition-all duration-300 hover:transform hover:scale-105"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--bg-primary)',
              }}
            >
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Store Settings
              </h4>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Configure store preferences and settings
              </p>
            </button>

            <button
              className="text-left p-4 rounded-lg border transition-all duration-300 hover:transform hover:scale-105"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--bg-primary)',
              }}
            >
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                View Reports
              </h4>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Analytics and performance reports
              </p>
            </button>

            <button
              className="text-left p-4 rounded-lg border transition-all duration-300 hover:transform hover:scale-105"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--bg-primary)',
              }}
            >
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Manage Products
              </h4>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Add, edit, and organize digital products
              </p>
            </button>

            <button
              className="text-left p-4 rounded-lg border transition-all duration-300 hover:transform hover:scale-105"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--bg-primary)',
              }}
            >
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Order Management
              </h4>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Track and manage customer orders
              </p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="p-6 rounded-lg border"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h3 className="text-lg font-medium mb-6" style={{ color: 'var(--text-primary)' }}>
            Recent Activity
          </h3>
          <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p>No recent activity to display</p>
            <p className="text-sm mt-1">Activity will appear here as users interact with the store</p>
          </div>
        </div>
      </div>
    </div>
  )
}
