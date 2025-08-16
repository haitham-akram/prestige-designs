/**
 * PayPal Payment Test Page
 *
 * This page allows testing PayPal integration with both
 * customizable and non-customizable orders.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'

interface TestOrder {
  _id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  totalPrice: number
  hasCustomizableProducts: boolean
  paymentStatus: string
  orderStatus: string
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
    hasCustomizations: boolean
  }>
}

declare global {
  interface Window {
    paypal?: any
  }
}

export default function PayPalTestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [testOrders, setTestOrders] = useState<TestOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null)
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const [currentPaypalOrderId, setCurrentPaypalOrderId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  // Add log entry
  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`
    setLogs((prev) => [...prev, logEntry])
    console.log(logEntry)
  }

  // Load PayPal SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.paypal && !paypalLoaded) {
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&intent=capture&components=buttons`
      script.onload = () => {
        setPaypalLoaded(true)
        addLog('PayPal SDK loaded successfully', 'success')
      }
      script.onerror = () => {
        addLog('Failed to load PayPal SDK', 'error')
      }
      document.body.appendChild(script)
    }
  }, [paypalLoaded])

  // Authentication check
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  // Create test orders
  const createTestOrders = async () => {
    setLoading(true)
    addLog('Creating test orders...')

    try {
      const response = await fetch('/api/test/create-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: session?.user?.id,
          customerEmail: session?.user?.email,
          customerName: session?.user?.name,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTestOrders(data.orders)
        addLog(`Created ${data.orders.length} test orders`, 'success')
      } else {
        throw new Error('Failed to create test orders')
      }
    } catch (error) {
      addLog(`Error creating test orders: ${error}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Render PayPal buttons
  const renderPayPalButtons = (order: TestOrder) => {
    if (!paypalLoaded || !window.paypal) return null

    return (
      <div id={`paypal-buttons-${order._id}`} className="mt-4">
        {/* PayPal buttons will be rendered here */}
      </div>
    )
  }

  // Initialize PayPal buttons for an order
  const initializePayPalButtons = (order: TestOrder) => {
    if (!window.paypal) return

    addLog(`Initializing PayPal buttons for order ${order.orderNumber}`)

    window.paypal
      .Buttons({
        // Create order
        createOrder: async () => {
          addLog('Creating PayPal order...')
          try {
            const response = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: order._id,
              }),
            })

            if (!response.ok) {
              throw new Error('Failed to create PayPal order')
            }

            const data = await response.json()
            setCurrentPaypalOrderId(data.paypalOrderId)
            addLog(`PayPal order created: ${data.paypalOrderId}`, 'success')
            return data.paypalOrderId
          } catch (error) {
            addLog(`Error creating PayPal order: ${error}`, 'error')
            throw error
          }
        },

        // Approve and capture payment
        onApprove: async (data: any) => {
          addLog(`Payment approved, capturing... Order ID: ${data.orderID}`)
          try {
            const response = await fetch('/api/paypal/capture-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                paypalOrderId: data.orderID,
                orderId: order._id,
              }),
            })

            if (!response.ok) {
              throw new Error('Failed to capture payment')
            }

            const result = await response.json()
            addLog(`Payment captured successfully! Transaction ID: ${result.transactionId}`, 'success')

            if (result.hasCustomizations) {
              addLog('Order has customizations - Email sent about processing', 'info')
            } else {
              addLog('Order completed automatically - Files sent via email', 'success')
            }

            // Refresh test orders
            await loadTestOrders()
          } catch (error) {
            addLog(`Error capturing payment: ${error}`, 'error')
          }
        },

        // Handle errors
        onError: (err: any) => {
          addLog(`PayPal error: ${err}`, 'error')
        },

        // Handle cancellation
        onCancel: () => {
          addLog('Payment cancelled by user', 'info')
        },

        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay',
          height: 40,
        },
      })
      .render(`#paypal-buttons-${order._id}`)
  }

  // Load existing test orders
  const loadTestOrders = async () => {
    addLog('Loading test orders...')
    try {
      const response = await fetch('/api/test/orders')
      if (response.ok) {
        const data = await response.json()
        setTestOrders(data.orders)
        addLog(`Loaded ${data.orders.length} test orders`, 'success')
      }
    } catch (error) {
      addLog(`Error loading test orders: ${error}`, 'error')
    }
  }

  // Initialize PayPal buttons when order is selected and PayPal is loaded
  useEffect(() => {
    if (selectedOrder && paypalLoaded) {
      setTimeout(() => initializePayPalButtons(selectedOrder), 100)
    }
  }, [selectedOrder, paypalLoaded])

  // Load test orders on component mount
  useEffect(() => {
    if (session?.user) {
      loadTestOrders()
    }
  }, [session])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">PayPal Integration Test Page</h1>
            <p className="text-lg text-gray-600">
              Test PayPal payments with both customizable and non-customizable orders
            </p>
          </div>

          {/* Test Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-purple-50 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-purple-800 mb-4">Test Orders</h2>
              <button
                onClick={createTestOrders}
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 mb-4"
              >
                {loading ? 'Creating...' : 'Create New Test Orders'}
              </button>
              <button
                onClick={loadTestOrders}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 ml-2"
              >
                Refresh Orders
              </button>
              <p className="text-sm text-gray-600 mt-4">
                This will create orders with and without customizations for testing different flows.
              </p>
            </div>

            <div className="bg-pink-50 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-pink-800 mb-4">PayPal Status</h2>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-medium">PayPal SDK:</span>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-sm ${
                      paypalLoaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {paypalLoaded ? 'Loaded' : 'Loading...'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium">Environment:</span>
                  <span className="ml-2 px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                    {process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Test Orders List */}
          {testOrders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Available Test Orders</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testOrders.map((order) => (
                  <div
                    key={order._id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedOrder?._id === order._id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="font-bold text-lg">{order.orderNumber}</div>
                    <div className="text-sm text-gray-600 mb-2">${order.totalPrice.toFixed(2)}</div>
                    <div className="space-y-1">
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          order.hasCustomizableProducts
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {order.hasCustomizableProducts ? 'Has Customizations' : 'No Customizations'}
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          order.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        Payment: {order.paymentStatus}
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          order.orderStatus === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : order.orderStatus === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        Status: {order.orderStatus}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Order Payment */}
          {selectedOrder && (
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Pay for Order: {selectedOrder.orderNumber}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-lg mb-2">Order Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Customer:</span> {selectedOrder.customerName}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedOrder.customerEmail}
                    </div>
                    <div>
                      <span className="font-medium">Total:</span> ${selectedOrder.totalPrice.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Customizations:</span>{' '}
                      {selectedOrder.hasCustomizableProducts ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <h4 className="font-bold mt-4 mb-2">Items:</h4>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>
                          {item.productName} (x{item.quantity})
                        </span>
                        <span>${item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Payment</h3>
                  {selectedOrder.paymentStatus === 'paid' ? (
                    <div className="bg-green-100 text-green-800 p-4 rounded-lg">
                      This order has already been paid for.
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        Click the PayPal button below to proceed with payment.
                        {selectedOrder.hasCustomizableProducts
                          ? ' Since this order has customizations, you will receive an email about processing.'
                          : ' Since this order has no customizations, files will be sent automatically after payment.'}
                      </p>
                      {renderPayPalButtons(selectedOrder)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="bg-black p-6 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-4">Test Logs</h2>
            <div className="bg-gray-900 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    log.includes('SUCCESS')
                      ? 'text-green-400'
                      : log.includes('ERROR')
                      ? 'text-red-400'
                      : 'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))}
              {logs.length === 0 && <div className="text-gray-500">Logs will appear here...</div>}
            </div>
            <button
              onClick={() => setLogs([])}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 mt-2 text-sm"
            >
              Clear Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
