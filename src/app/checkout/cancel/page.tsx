/**
 * Checkout Cancel Page
 *
 * Displayed when PayPal payment is cancelled
 */

'use client'

import React, { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import LoadingSpinner from '@/components/LoadingSpinner'

function CheckoutCancelContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()

  const paypalOrderId = searchParams.get('paypalOrderId')

  useEffect(() => {
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }
  }, [session, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 to-orange-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-3xl font-bold text-orange-600 mb-4">Payment Cancelled</h1>
        <p className="text-gray-600 mb-6">
          Your payment was cancelled. Don't worry, no charges were made to your account.
        </p>

        {paypalOrderId && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
            <h3 className="font-semibold mb-2">Payment Details:</h3>
            <p className="text-sm text-gray-600">PayPal Order ID: {paypalOrderId}</p>
            <p className="text-sm text-gray-500 mt-2">This order was not completed and can be retried.</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => router.push('/checkout')}
            className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
          >
            Try Payment Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CheckoutCancelContent />
    </Suspense>
  )
}
