/**
 * Access Denied Page
 *
 * This page is shown when a user tries to access a route they don't have
 * permission for (e.g., customer trying to access admin dashboard).
 *
 * Features:
 * - Clear error message
 * - Navigation options
 * - User role information
 * - Contact information for support
 */

'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function AccessDenied() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto h-16 w-16 text-red-500 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">You don&apos;t have permission to access this page.</p>

          {/* User Info */}
          {session?.user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Current Role:</strong> {session.user.role}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                This page requires <strong>admin</strong> access.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors inline-block"
            >
              Go to Homepage
            </Link>

            <Link
              href="/store"
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors inline-block"
            >
              Browse Store
            </Link>
          </div>

          {/* Contact Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need admin access?{' '}
              <a href="mailto:admin@prestige-designs.com" className="text-blue-600 hover:text-blue-500">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
