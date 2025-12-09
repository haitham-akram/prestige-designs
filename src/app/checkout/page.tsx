'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShoppingCart, faUser, faEnvelope, faPhone, faTrash, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { faPaypal as faPaypalBrand } from '@fortawesome/free-brands-svg-icons'
import CustomerLayout from '@/app/customer-layout'
import { getCustomLabel } from '@/utils/colorTranslations'
import Alert, { useAlerts } from '@/components/ui/Alert'
import './checkout.css'

interface CheckoutForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
}

declare global {
  interface Window {
    paypal?: any
    paypalRetryCount?: number
  }
}

export default function CheckoutPage() {
  console.log('CheckoutPage: Starting to render')

  function CheckoutContent() {
    const { state, removeItem, updateQuantity, clearCart } = useCart()
    const { data: session, status } = useSession()
    const router = useRouter()
    const { alerts, showSuccess, showError, showWarning, showInfo } = useAlerts()

    const [formData, setFormData] = useState<CheckoutForm>({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      notes: '',
    })

    const [promoCode, setPromoCode] = useState('')
    const [promoCodeError, setPromoCodeError] = useState('')
    const [promoCodeSuccess, setPromoCodeSuccess] = useState('')
    const [appliedPromoCode, setAppliedPromoCode] = useState<{
      code: string
      discount: number
      type: 'percentage' | 'fixed'
      discountAmount?: number
    } | null>(null)
    const [isValidatingPromo, setIsValidatingPromo] = useState(false)

    // PayPal state
    const [paypalLoaded, setPaypalLoaded] = useState(false)
    const [paypalSdkError, setPaypalSdkError] = useState(false)
    const [isProcessingOrder, setIsProcessingOrder] = useState(false)
    const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('paypal')
    const [paypalButtonsRendered, setPaypalButtonsRendered] = useState(false)

    // **FIX**: Differentiate between a fresh visit and an auto-reload.
    useEffect(() => {
      const isAutoReload = sessionStorage.getItem('paypal_sdk_reloaded') === 'true'
      const pendingOrderId = sessionStorage.getItem('pendingOrderId')

      if (isAutoReload && pendingOrderId) {
        // This is an auto-reload caused by an SDK failure. Restore the order ID to avoid duplicates.
        console.log('Restoring pending order ID from sessionStorage after auto-reload:', pendingOrderId)
        setCurrentOrderId(pendingOrderId)
      } else {
        // This is a fresh visit. Clear any stale pending order ID from a previous session.
        console.log('Fresh visit to checkout page. Clearing any stale pending order ID.')
        sessionStorage.removeItem('pendingOrderId')
      }
    }, [])

    // Load PayPal SDK with auto-reload on first failure - OPTIMIZED VERSION
    useEffect(() => {
      let mounted = true
      let loadTimeout: NodeJS.Timeout | null = null

      const handleSdkLoadError = () => {
        if (!mounted) return

        const hasReloaded = sessionStorage.getItem('paypal_sdk_reloaded')

        if (!hasReloaded) {
          console.warn('PayPal SDK failed to load on the first attempt. Reloading page...')
          sessionStorage.setItem('paypal_sdk_reloaded', 'true')
          window.location.reload()
        } else {
          console.error('❌ PayPal SDK failed to load after page refresh. Displaying error.')
          if (mounted) {
            setPaypalSdkError(true)
            setPaypalLoaded(false)
          }
          sessionStorage.removeItem('paypal_sdk_reloaded')
        }
      }

      const loadPayPalSDK = async () => {
        if (typeof window === 'undefined') return

        console.log('🔄 Starting PayPal SDK loading process...')
        setPaypalSdkError(false)

        if (window.paypal && window.paypal.Buttons && typeof window.paypal.Buttons === 'function') {
          console.log('✅ PayPal SDK already fully loaded and functional')
          if (mounted) setPaypalLoaded(true)
          sessionStorage.removeItem('paypal_sdk_reloaded')
          return
        }

        const existingScripts = document.querySelectorAll('script[src*="paypal.com/sdk"]')
        existingScripts.forEach((script) => {
          console.log('🗑️ Removing existing PayPal script')
          script.remove()
        })

        if (window.paypal) {
          console.log('🗑️ Clearing existing PayPal object')
          delete window.paypal
        }

        console.log('📥 Loading fresh PayPal SDK...')
        const clientIdMeta = document.querySelector('meta[name="paypal-client-id"]')
        const paypalClientId = clientIdMeta?.getAttribute('content')

        if (!paypalClientId) {
          console.error('PayPal Client ID not found in meta tag')
          handleSdkLoadError()
          return
        }

        const script = document.createElement('script')
        script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD&intent=capture&components=buttons&locale=ar_EG&debug=false`
        script.async = true
        script.defer = true

        // ULTRA-FAST TIMEOUT - 0.5 seconds for immediate refresh
        loadTimeout = setTimeout(() => {
          console.error('⏰ PayPal SDK loading timeout (0.5s)')
          handleSdkLoadError()
        }, 500) // Ultra-fast 0.5 second timeout

        script.onload = () => {
          if (loadTimeout) clearTimeout(loadTimeout)
          console.log('📦 PayPal script loaded, waiting for SDK initialization...')
          sessionStorage.removeItem('paypal_sdk_reloaded')

          // ULTRA-FAST INITIALIZATION CHECK - 0.5 seconds total
          const checkPayPalReady = (attempts = 0) => {
            if (!mounted) return

            if (window.paypal && window.paypal.Buttons && typeof window.paypal.Buttons === 'function') {
              console.log('✅ PayPal SDK fully initialized and ready')
              if (mounted) {
                setPaypalLoaded(true)
                setPaypalSdkError(false)
              }
            } else if (attempts < 5) {
              // Only 5 attempts = 0.5 seconds total
              console.log(`⏳ Waiting for PayPal SDK initialization... (attempt ${attempts + 1}/5)`)
              setTimeout(() => checkPayPalReady(attempts + 1), 100) // Very fast 100ms intervals
            } else {
              console.error('❌ PayPal SDK failed to initialize after loading (0.5s total)')
              handleSdkLoadError()
            }
          }
          checkPayPalReady()
        }

        script.onerror = (error) => {
          if (loadTimeout) clearTimeout(loadTimeout)
          console.error('❌ Failed to load PayPal SDK script:', error)
          handleSdkLoadError()
        }

        document.head.appendChild(script)
      }

      loadPayPalSDK()

      return () => {
        mounted = false
        if (loadTimeout) clearTimeout(loadTimeout)
      }
    }, [])
    // Enhanced PayPal button initialization with robust error handling
    const initializePayPalButtons = useCallback(() => {
      console.log('🔄 Attempting PayPal button initialization...', {
        paypalLoaded,
        currentOrderId,
        windowPaypal: !!window.paypal,
        paypalButtons: !!window.paypal?.Buttons,
        paypalButtonsRendered,
        isProcessingOrder,
      })

      // Pre-flight checks
      if (
        !window.paypal ||
        !window.paypal.Buttons ||
        typeof window.paypal.Buttons !== 'function' ||
        !currentOrderId ||
        paypalButtonsRendered ||
        isProcessingOrder
      ) {
        return
      }

      const paypalContainer = document.getElementById('paypal-button-container')
      if (!paypalContainer) {
        console.error(
          '❌ PayPal button container not found in initializePayPalButtons. This should not happen if the polling logic is working.'
        )
        return
      }

      paypalContainer.innerHTML = ''

      console.log('✅ All conditions met, rendering PayPal buttons for order:', currentOrderId)

      try {
        const buttonsInstance = window.paypal.Buttons({
          createOrder: async () => {
            try {
              console.log('🔄 Creating PayPal order for order ID:', currentOrderId)

              const response = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ orderId: currentOrderId }),
              })

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(`Server error: ${response.status} - ${errorData.error || 'Unknown error'}`)
              }

              const data = await response.json()

              if (!data.paypalOrderId) {
                throw new Error('No PayPal order ID returned from server')
              }

              console.log('✅ PayPal order created successfully:', data.paypalOrderId)
              return data.paypalOrderId
            } catch (error) {
              console.error('❌ Error creating PayPal order:', error)
              showError('خطأ في الدفع', 'فشل في إنشاء طلب الدفع. يرجى المحاولة مرة أخرى.')
              throw error
            }
          },
          onApprove: async (data) => {
            try {
              console.log('🔄 Processing PayPal payment approval...', data.orderID)
              setIsProcessingOrder(true)

              const response = await fetch('/api/paypal/capture-payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  paypalOrderId: data.orderID,
                  orderId: currentOrderId,
                }),
              })

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(`Payment capture failed: ${response.status} - ${errorData.error || 'Unknown error'}`)
              }

              const result = await response.json()
              console.log('✅ Payment captured successfully:', result)

              sessionStorage.removeItem('pendingOrderId')
              clearCart()
              router.push(`/checkout/success?orderId=${currentOrderId}`)
            } catch (error) {
              console.error('❌ Error capturing payment:', error)
              showError('خطأ في المعاملة', 'حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.')
              setIsProcessingOrder(false)
            }
          },
          onError: (err) => {
            console.error('❌ PayPal payment error:', err)
            showError('خطأ في الدفع', 'حدث خطأ في الدفع. يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى.')
            setIsProcessingOrder(false)
            setPaypalSdkError(true)
            setPaypalButtonsRendered(false)
          },
          onCancel: (data) => {
            console.log('ℹ️ Payment cancelled by user:', data)
            sessionStorage.removeItem('pendingOrderId')
            showInfo('تم الإلغاء', 'تم إلغاء عملية الدفع')
            setIsProcessingOrder(false)
          },
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 40,
          },
        })

        buttonsInstance
          .render('#paypal-button-container')
          .then(() => {
            console.log('✅ PayPal buttons rendered successfully')
            setPaypalButtonsRendered(true)
            setPaypalSdkError(false)
          })
          .catch((error) => {
            console.error('❌ Failed to render PayPal buttons:', error)
            setPaypalSdkError(true)
            setPaypalButtonsRendered(false)
            if (paypalContainer) {
              paypalContainer.innerHTML = ''
            }
          })
      } catch (error) {
        console.error('❌ Error initializing PayPal buttons:', error)
        setPaypalSdkError(true)
        setPaypalButtonsRendered(false)
      }
    }, [paypalLoaded, currentOrderId, paypalButtonsRendered, isProcessingOrder, showError, showInfo, clearCart, router])

    const retryPayPalSDK = () => {
      console.log('🔄 Retrying PayPal SDK loading...')
      sessionStorage.removeItem('paypal_sdk_reloaded')
      window.location.reload()
    }

    // More robust PayPal button initialization trigger
    useEffect(() => {
      const shouldInitialize =
        paypalLoaded &&
        currentOrderId &&
        !paypalButtonsRendered &&
        !isProcessingOrder &&
        window.paypal &&
        window.paypal.Buttons &&
        typeof window.paypal.Buttons === 'function'

      if (!shouldInitialize) {
        console.log('⏳ PayPal button initialization conditions not met:', {
          paypalLoaded,
          currentOrderId: !!currentOrderId,
          paypalButtonsRendered,
          isProcessingOrder,
          windowPaypal: !!window.paypal,
          paypalButtons: !!(window.paypal && window.paypal.Buttons),
        })
        return
      }

      let attempts = 0
      const maxAttempts = 1 // Try for 10 seconds (20 * 500ms)
      let intervalId: NodeJS.Timeout | null = null

      const tryToInitialize = () => {
        const container = document.getElementById('paypal-button-container')

        if (container) {
          console.log(`✅ PayPal container found after ${attempts} attempts. Initializing...`)
          if (intervalId) clearInterval(intervalId)
          initializePayPalButtons()
        } else {
          attempts++
          console.log(`⏳ Waiting for PayPal container to appear in DOM... Attempt ${attempts}/${maxAttempts}`)
          if (attempts >= maxAttempts) {
            if (intervalId) clearInterval(intervalId)
            console.error('❌ PayPal container did not appear in DOM after multiple attempts.')
            setPaypalSdkError(true) // Show an error if the container never appears
          }
        }
      }

      intervalId = setInterval(tryToInitialize, 300)

      return () => {
        if (intervalId) clearInterval(intervalId)
      }
    }, [paypalLoaded, currentOrderId, paypalButtonsRendered, isProcessingOrder, initializePayPalButtons])

    // Reset PayPal buttons when order changes
    useEffect(() => {
      if (currentOrderId) {
        setPaypalButtonsRendered(false)
        const container = document.getElementById('paypal-button-container')
        if (container) {
          container.innerHTML = ''
        }
      }
    }, [currentOrderId])

    // Redirect if not logged in
    useEffect(() => {
      if (status === 'loading') return

      if (!session?.user) {
        router.push('/auth/signin?redirect=/checkout')
      }
    }, [session, status, router])

    // Pre-fill form with user data if logged in
    useEffect(() => {
      if (session?.user) {
        const userName = session.user.name || ''
        const nameParts = userName.split(' ')

        setFormData((prev) => ({
          ...prev,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: session.user.email || '',
        }))
      }
    }, [session])

    if (status === 'loading') {
      return (
        <div className="container">
          <div className="checkout-loading">
            <div className="loading-spinner"></div>
            <p>جاري التحقق من تسجيل الدخول...</p>
          </div>
        </div>
      )
    }

    if (!session?.user) {
      return null
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }

    const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        removeItem(cartItemId)
      } else {
        updateQuantity(cartItemId, newQuantity)
      }
    }

    const handlePromoCodeValidation = async () => {
      if (!promoCode.trim()) {
        setPromoCodeError('يرجى إدخال كود الخصم')
        return
      }

      setIsValidatingPromo(true)
      setPromoCodeError('')
      setPromoCodeSuccess('')

      try {
        const response = await fetch('/api/promo-codes/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: promoCode.trim(),
            orderValue: state.subtotal || 0,
            currentTotal: state.totalPrice || 0,
            cartItems: state.items || [],
          }),
        })

        const data = await response.json()

        if (response.ok) {
          setAppliedPromoCode({
            code: data.code,
            discount: data.discount || 0,
            type: data.type,
            discountAmount: data.discountAmount || 0,
          })

          const itemText = data.totalQualifyingItems > 1 ? `${data.totalQualifyingItems} عناصر` : 'عنصر واحد'
          const discountText = data.type === 'percentage' ? `${data.discount || 0}%` : `$${data.discount || 0} لكل عنصر`

          setPromoCodeSuccess(
            `تم تطبيق كود الخصم على ${itemText}! خصم ${discountText} - إجمالي الخصم: $${(
              data.discountAmount || 0
            ).toFixed(2)}`
          )
          setPromoCode('')
        } else {
          setPromoCodeError(data.message || 'كود الخصم غير صحيح')
        }
      } catch (error) {
        console.error('Promo code validation error:', error)
        setPromoCodeError('حدث خطأ أثناء التحقق من كود الخصم')
      } finally {
        setIsValidatingPromo(false)
      }
    }

    const removePromoCode = () => {
      setAppliedPromoCode(null)
      setPromoCodeSuccess('')
    }

    const handleSubmit = async (e) => {
      e.preventDefault()

      if (isProcessingOrder) {
        console.log('⚠️ Already processing order, ignoring duplicate submission')
        return
      }

      if (!formData.firstName || !formData.lastName || !formData.email) {
        showError('بيانات مطلوبة', 'يرجى ملء جميع الحقول المطلوبة')
        return
      }

      if (selectedPaymentMethod !== 'paypal') {
        showWarning('طريقة دفع غير متاحة', 'حالياً، دفع PayPal هو الطريقة الوحيدة المتاحة')
        return
      }

      try {
        setIsProcessingOrder(true)
        console.log('🔄 Starting order creation process...')

        const subtotalAmount = state.subtotal || 0
        const currentTotal = state.totalPrice || 0
        const promoDiscountAmount = appliedPromoCode
          ? appliedPromoCode.discountAmount ??
            (appliedPromoCode.type === 'percentage'
              ? (currentTotal * appliedPromoCode.discount) / 100
              : Math.min(appliedPromoCode.discount, currentTotal))
          : 0

        const finalTotal = Math.max(0, currentTotal - promoDiscountAmount)

        console.log('💰 Pricing calculation:', {
          subtotal: subtotalAmount,
          currentTotal: currentTotal,
          promoCode: appliedPromoCode,
          promoDiscountAmount: promoDiscountAmount,
          finalTotal,
          isFreeOrder: finalTotal === 0,
          itemBreakdown: state.items.map((item) => {
            const itemSubtotal = (item.originalPrice || item.price) * item.quantity
            const itemPromoDiscount =
              promoDiscountAmount > 0 ? (itemSubtotal / subtotalAmount) * promoDiscountAmount : 0
            return {
              name: item.name,
              itemSubtotal,
              itemPromoDiscount: itemPromoDiscount.toFixed(2),
            }
          }),
        })

        const orderResponse = await fetch('/api/orders/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerName: `${formData.firstName} ${formData.lastName}`,
            customerEmail: formData.email,
            customerPhone: formData.phone,
            items: state.items.map((item) => {
              const itemSubtotal = (item.originalPrice || item.price) * item.quantity
              const itemPromoDiscount =
                promoDiscountAmount > 0 ? (itemSubtotal / subtotalAmount) * promoDiscountAmount : 0

              return {
                productId: item.id,
                productName: item.name,
                productSlug: item.name.toLowerCase().replace(/\s+/g, '-'),
                quantity: item.quantity,
                originalPrice: item.originalPrice || item.price,
                discountAmount: (item.originalPrice || item.price) - item.price,
                unitPrice: item.price,
                totalPrice: Math.max(0, item.price * item.quantity - itemPromoDiscount),
                promoCode: appliedPromoCode?.code || '',
                promoDiscount: itemPromoDiscount,
                EnableCustomizations: item.EnableCustomizations || false,
                hasCustomizations: !!(
                  item.customizations &&
                  (item.customizations.textChanges?.length ||
                    item.customizations.uploadedImages?.length ||
                    item.customizations.uploadedLogo ||
                    item.customizations.customizationNotes)
                ),
                customizations: item.customizations,
              }
            }),
            subtotal: state.subtotal || 0,
            totalPromoDiscount: promoDiscountAmount,
            totalPrice: finalTotal,
            appliedPromoCodes: appliedPromoCode ? [appliedPromoCode.code] : [],
            customerNotes: formData.notes,
            orderStatus: finalTotal === 0 ? 'processing' : 'pending',
          }),
        })

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json()
          throw new Error(errorData.message || 'فشل في إنشاء الطلب')
        }

        const orderData = await orderResponse.json()
        console.log('Order created successfully:', orderData)

        if (finalTotal <= 0) {
          console.log('🎉 Processing free order - checking for customizable products')

          try {
            const hasCustomizableProducts = state.items.some((item) => item.EnableCustomizations)
            const hasActualCustomizations = state.items.some((item) => {
              return (
                item.customizations &&
                ((item.customizations.colors && item.customizations.colors.length > 0) ||
                  (item.customizations.textChanges && item.customizations.textChanges.length > 0) ||
                  (item.customizations.uploadedImages && item.customizations.uploadedImages.length > 0) ||
                  item.customizations.uploadedLogo ||
                  (item.customizations.customizationNotes && item.customizations.customizationNotes.trim().length > 0))
              )
            })

            console.log('🔍 Free order analysis:', {
              hasCustomizableProducts,
              hasActualCustomizations,
              finalTotal,
            })

            if (hasCustomizableProducts && !hasActualCustomizations) {
              console.log('⚠️ Free order has customizable products but missing customization data')

              await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                  status: 'processing',
                  paymentStatus: 'free',
                  deliveryType: 'custom_work',
                  note: 'طلب مجاني يحتوي على منتجات قابلة للتخصيص ولكن بيانات التخصيص مفقودة',
                }),
              })

              // ONLY send admin notification - let ItemDeliveryService handle customer email
              try {
                console.log('🔔 Sending admin notification for free order with missing customizations...')
                await fetch('/api/admin/notify-new-order', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    orderId: orderData.orderId,
                    orderNumber: orderData.orderNumber,
                    isFreeOrder: true,
                    hasCustomizations: true,
                    missingCustomization: true,
                    autoCompleted: false,
                  }),
                })
              } catch (adminError) {
                console.error('❌ Error sending admin notification:', adminError)
              }

              // Process the order through ItemDeliveryService (this will send the appropriate customer email)
              await fetch('/api/orders/complete-free-order', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                }),
              })
            } else if (hasCustomizableProducts && hasActualCustomizations) {
              console.log('📋 Free order has customizable products with data - needs admin review')

              await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                  status: 'pending',
                  paymentStatus: 'free',
                  note: 'طلب مجاني يحتوي على تخصيصات ويحتاج لمراجعة الإدارة',
                }),
              })

              // ONLY send admin notification - let ItemDeliveryService handle customer email
              try {
                console.log('🔔 Sending admin notification for free order with customizations...')
                await fetch('/api/admin/notify-new-order', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    orderId: orderData.orderId,
                    orderNumber: orderData.orderNumber,
                    isFreeOrder: true,
                    hasCustomizations: true,
                    autoCompleted: false,
                  }),
                })
              } catch (adminError) {
                console.error('❌ Error sending admin notification:', adminError)
              }

              // Process the order through ItemDeliveryService
              await fetch('/api/orders/complete-free-order', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                }),
              })
            } else {
              console.log('✅ Free order has no customizable products - auto-completing')

              // Let the complete-free-order API handle everything including emails
              await fetch('/api/orders/complete-free-order', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                }),
              })

              try {
                console.log('🔔 Sending admin notification for completed free order...')
                await fetch('/api/admin/notify-new-order', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    orderId: orderData.orderId,
                    orderNumber: orderData.orderNumber,
                    isFreeOrder: true,
                    hasCustomizations: false,
                    autoCompleted: true,
                  }),
                })
              } catch (adminError) {
                console.error('❌ Error sending admin notification:', adminError)
              }
            }

            showSuccess('تم إرسال طلبك المجاني!', 'تم معالجة طلبك المجاني بنجاح. ستصلك رسالة تأكيد قريباً.')

            clearCart()
            router.push(`/checkout/success?order=${orderData.orderNumber}&free=true`)
            return
          } catch (error) {
            console.error('Error processing free order:', error)
            showError('خطأ في الطلب المجاني', 'حدث خطأ في معالجة الطلب المجاني. يرجى المحاولة مرة أخرى.')
            return
          }
        }

        sessionStorage.setItem('pendingOrderId', orderData.orderId)

        setPaypalButtonsRendered(false)
        setCurrentOrderId(orderData.orderId)
      } catch (error) {
        console.error('Error creating order:', error)
        const errorMessage = error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى'
        showError('خطأ في إنشاء الطلب', `حدث خطأ في إنشاء الطلب: ${errorMessage}`)
      } finally {
        setIsProcessingOrder(false)
      }
    }

    const hasCorruptedData = state.items.some(
      (item) => item.price < 0 || (item.originalPrice && item.originalPrice < item.price) || item.quantity <= 0
    )

    if (hasCorruptedData) {
      return (
        <div className="container">
          <div className="checkout-empty">
            <div className="checkout-empty-icon">
              <FontAwesomeIcon icon={faShoppingCart} />
            </div>
            <h2>خطأ في بيانات السلة</h2>
            <p>تم اكتشاف بيانات غير صحيحة في السلة. سيتم مسح السلة وإعادة تحميل الصفحة.</p>
            <button
              onClick={() => {
                sessionStorage.removeItem('pendingOrderId')
                clearCart()
                window.location.reload()
              }}
              className="btn btn-primary"
            >
              مسح السلة وإعادة التحميل
            </button>
          </div>
        </div>
      )
    }

    if (state.items.length === 0) {
      return (
        <div className="container">
          <div className="checkout-empty">
            <div className="checkout-empty-icon">
              <FontAwesomeIcon icon={faShoppingCart} />
            </div>
            <h2>السلة فارغة</h2>
            <Link href="/" className="btn btn-primary">
              العودة للتسوق
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="container">
        {/* Alerts Container */}
        <div className="alerts-container">
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              type={alert.type}
              title={alert.title}
              message={alert.message}
              duration={alert.duration}
              onClose={alert.onClose}
            />
          ))}
        </div>

        <div className="checkout-header">
          <h1>اتمام الطلب</h1>
          <p>أكمل معلوماتك لإتمام عملية الشراء</p>
        </div>

        <div className="checkout-container">
          {/* Order Summary */}
          <div className="checkout-summary">
            <div className="summary-header">
              <h3>ملخص الطلب</h3>
              <span className="items-count">{state.totalItems} منتج</span>
            </div>

            <div className="order-items">
              {state.items.map((item, index) => (
                <div className="order-item" key={item.cartItemId}>
                  <div className="item-image">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={100}
                      height={100}
                      style={{ objectFit: 'contain' }}
                      priority={index === 0}
                    />
                  </div>
                  <div className="item-details">
                    <h4>
                      {item.name}
                      {getCustomLabel(item.customizations) && (
                        <span className="custom-label"> ({getCustomLabel(item.customizations)})</span>
                      )}
                    </h4>
                    {item.customizations?.colors && item.customizations.colors.length > 0 && (
                      <p className="item-colors">الألوان: {item.customizations.colors.map((c) => c.name).join(', ')}</p>
                    )}
                    <div className="item-pricing">
                      {item.originalPrice && item.originalPrice > item.price ? (
                        <>
                          <div className="item-original-price">${item.originalPrice}</div>
                          <div className="item-final-price">${item.price}</div>
                        </>
                      ) : (
                        <div className="item-price">${item.price}</div>
                      )}
                    </div>
                  </div>
                  {/* FIX: Removed the quantity adjustment buttons */}
                  <div className="item-total">${(item.price * item.quantity).toFixed(2)}</div>
                  <button onClick={() => removeItem(item.cartItemId)} className="remove-btn" title="إزالة">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              ))}
            </div>

            {/* Promo Code Section */}
            <div className="promo-code-section">
              <h4>كود الخصم</h4>
              {!appliedPromoCode ? (
                <div className="promo-code-input">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="أدخل كود الخصم"
                    className="promo-input"
                    disabled={isValidatingPromo}
                  />
                  <button
                    onClick={handlePromoCodeValidation}
                    disabled={isValidatingPromo || !promoCode.trim()}
                    className="promo-btn"
                  >
                    {isValidatingPromo ? 'جاري التحقق...' : 'تطبيق'}
                  </button>
                </div>
              ) : (
                <div className="applied-promo">
                  <span className="promo-code-text">{appliedPromoCode.code}</span>
                  <button onClick={removePromoCode} className="remove-promo-btn">
                    إزالة
                  </button>
                </div>
              )}
              {promoCodeError && <div className="promo-error">{promoCodeError}</div>}
              {promoCodeSuccess && <div className="promo-success">{promoCodeSuccess}</div>}
            </div>

            <div className="order-totals">
              <div className="total-row">
                <span>المجموع الفرعي:</span>
                <span>${(state.subtotal || 0).toFixed(2)}</span>
              </div>
              {(state.totalSavings || 0) > 0 && (
                <div className="total-row">
                  <span>خصم المنتجات:</span>
                  <span>-${(state.totalSavings || 0).toFixed(2)}</span>
                </div>
              )}
              {appliedPromoCode && (
                <div className="total-row">
                  <span>خصم الكوبون:</span>
                  <span>
                    -$
                    {(
                      appliedPromoCode.discountAmount ||
                      Math.min(
                        appliedPromoCode.type === 'percentage'
                          ? ((state.totalPrice || 0) * (appliedPromoCode.discount || 0)) / 100
                          : appliedPromoCode.discount || 0,
                        state.totalPrice || 0
                      )
                    ).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="total-row final-total">
                <span>المجموع النهائي:</span>
                <span>
                  $
                  {Math.max(
                    0,
                    (state.totalPrice || 0) -
                      (appliedPromoCode?.discountAmount ||
                        Math.min(
                          appliedPromoCode
                            ? appliedPromoCode.type === 'percentage'
                              ? ((state.totalPrice || 0) * appliedPromoCode.discount) / 100
                              : appliedPromoCode.discount
                            : 0,
                          state.totalPrice || 0
                        ))
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="checkout-form">
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>معلومات الشخصية</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <FontAwesomeIcon icon={faUser} />
                      الاسم الأول
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FontAwesomeIcon icon={faUser} />
                      الاسم الأخير
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <FontAwesomeIcon icon={faEnvelope} />
                      البريد الإلكتروني
                    </label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>
                      <FontAwesomeIcon icon={faPhone} />
                      رقم الهاتف مع مقدمة الدولة
                    </label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>ملاحظات إضافية</h3>
                <div className="form-group">
                  <label>ملاحظات الطلب (اختياري)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="أضف أي ملاحظات خاصة بالطلب..."
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>طريقة الدفع</h3>
                <div className="payment-methods">
                  <div className="payment-method">
                    <input
                      type="radio"
                      id="paypal"
                      name="payment"
                      value="paypal"
                      checked={selectedPaymentMethod === 'paypal'}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    />
                    <label htmlFor="paypal">
                      <FontAwesomeIcon icon={faPaypalBrand} />
                      PayPal & Credit Cards
                      {!paypalLoaded && !paypalSdkError && <span className="loading-text"> (جاري التحميل...)</span>}
                      {paypalSdkError && <span className="error-text"> (فشل التحميل)</span>}
                      {paypalLoaded && <span className="success-text"> ✓</span>}
                    </label>
                  </div>
                </div>

                {selectedPaymentMethod === 'paypal' && (
                  <div className="payment-info">
                    <p className="payment-description">
                      💳 يمكنك الدفع باستخدام حساب PayPal أو بطاقة ائتمان/خصم مباشرة دون إنشاء حساب PayPal
                    </p>
                    <div className="supported-cards">
                      <small>البطاقات المقبولة: Visa, Mastercard, American Express, Discover</small>
                    </div>
                  </div>
                )}

                {/* PayPal buttons container - shows after order is created */}
                {currentOrderId && (
                  <div className="paypal-buttons-section">
                    <h4>إتمام الدفع</h4>
                    {paypalLoaded ? (
                      <div className="paypal-container-wrapper">
                        <div id="paypal-button-container"></div>

                        {!paypalButtonsRendered && !isProcessingOrder && !paypalSdkError && (
                          <div className="paypal-loading-overlay">
                            <div className="loading-spinner"></div>
                            <p>جاري تحميل أزرار الدفع...</p>
                            <small>إذا استمر التحميل، يرجى إعادة تحميل الصفحة</small>
                          </div>
                        )}

                        {isProcessingOrder && (
                          <div className="paypal-processing-overlay">
                            <div className="loading-spinner"></div>
                            <p>جاري معالجة الدفع...</p>
                            <small>لا تغلق هذه الصفحة حتى اكتمال العملية</small>
                          </div>
                        )}

                        {paypalSdkError && paypalLoaded && (
                          <div className="paypal-error">
                            <p>⚠️ مشكلة في تحميل أزرار الدفع</p>
                            <button
                              onClick={() => {
                                setPaypalSdkError(false)
                                setPaypalButtonsRendered(false)
                                setTimeout(() => initializePayPalButtons(), 100)
                              }}
                              className="retry-btn"
                              type="button"
                            >
                              إعادة تحميل أزرار الدفع
                            </button>
                          </div>
                        )}
                      </div>
                    ) : paypalSdkError ? (
                      <div className="paypal-error">
                        <p>❌ فشل في تحميل PayPal</p>
                        <p>يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى</p>
                        <div className="error-actions">
                          <button onClick={retryPayPalSDK} className="retry-btn" type="button">
                            إعادة تحميل PayPal
                          </button>
                          <button onClick={() => window.location.reload()} className="reload-btn" type="button">
                            إعادة تحميل الصفحة
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="loading-paypal">
                        <div className="loading-spinner"></div>
                        <p>جاري تحميل PayPal...</p>
                        <div className="loading-progress">
                          <small>قد يستغرق هذا بضع ثوانِ...</small>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!currentOrderId &&
                (() => {
                  const currentTotal = state.totalPrice || 0
                  const promoDiscountAmount = appliedPromoCode
                    ? appliedPromoCode.type === 'percentage'
                      ? (currentTotal * appliedPromoCode.discount) / 100
                      : appliedPromoCode.discount
                    : 0
                  const finalTotal = Math.max(0, currentTotal - Math.min(promoDiscountAmount, currentTotal))
                  const isFreeOrder = finalTotal === 0

                  return (
                    <button
                      type="submit"
                      className="submit-order-btn"
                      disabled={
                        isProcessingOrder || (!paypalLoaded && !isFreeOrder) || (paypalSdkError && !isFreeOrder)
                      }
                    >
                      <span>
                        {isProcessingOrder
                          ? isFreeOrder
                            ? 'جاري إنشاء الطلب المجاني...'
                            : 'جاري إنشاء الطلب...'
                          : isFreeOrder
                          ? 'إنشاء الطلب المجاني'
                          : paypalSdkError
                          ? 'فشل في تحميل PayPal - يرجى إعادة تحميل الصفحة'
                          : !paypalLoaded
                          ? 'جاري تحميل PayPal...'
                          : 'إنشاء الطلب والمتابعة للدفع'}
                      </span>
                      <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  )
                })()}
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <CustomerLayout>
      <CheckoutContent />
    </CustomerLayout>
  )
}
