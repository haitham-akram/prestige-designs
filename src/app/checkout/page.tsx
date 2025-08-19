'use client'

import { useState, useEffect } from 'react'
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
    console.log('CheckoutPage: Cart state loaded', state)
    console.log('CheckoutPage: Cart state properties:', {
      totalItems: state.totalItems,
      totalPrice: state.totalPrice,
      totalSavings: state.totalSavings,
      subtotal: state.subtotal,
      itemsCount: state.items.length,
    })

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

    // Load PayPal SDK
    useEffect(() => {
      const loadPayPalSDK = () => {
        if (typeof window === 'undefined') return

        // Reset error state
        setPaypalSdkError(false)

        // Check if PayPal is already loaded
        if (window.paypal) {
          console.log('PayPal SDK already loaded')
          setPaypalLoaded(true)
          return
        }

        // Check if script tag already exists
        const existingScript = document.querySelector('script[src*="paypal.com/sdk"]')
        if (existingScript) {
          console.log('PayPal script already exists, waiting for load')
          return
        }

        const script = document.createElement('script')
        script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&intent=capture&components=buttons&locale=ar_EG`

        script.onload = () => {
          console.log('PayPal SDK loaded successfully')
          setPaypalLoaded(true)
          setPaypalSdkError(false)
        }

        script.onerror = () => {
          console.error('Failed to load PayPal SDK')
          setPaypalSdkError(true)
          setPaypalLoaded(false)
        }

        document.head.appendChild(script)
      }

      loadPayPalSDK()
    }, [])

    // Retry PayPal SDK loading
    const retryPayPalSDK = () => {
      console.log('Retrying PayPal SDK loading...')
      setPaypalSdkError(false)
      setPaypalLoaded(false)
      setPaypalButtonsRendered(false)

      // Remove any existing PayPal scripts
      const existingScripts = document.querySelectorAll('script[src*="paypal.com/sdk"]')
      existingScripts.forEach((script) => script.remove())

      // Reset retry counter
      window.paypalRetryCount = 0

      // Create new script element
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&intent=capture&components=buttons&locale=ar_EG`

      script.onload = () => {
        console.log('PayPal SDK loaded successfully on retry')
        setPaypalLoaded(true)
        setPaypalSdkError(false)
      }

      script.onerror = () => {
        console.error('Failed to load PayPal SDK on retry')
        setPaypalSdkError(true)
        setPaypalLoaded(false)
      }

      document.head.appendChild(script)
    }

    // Initialize PayPal buttons when conditions are met
    useEffect(() => {
      if (paypalLoaded && currentOrderId && !paypalButtonsRendered && !isProcessingOrder) {
        console.log('Initializing PayPal buttons...')
        const timer = setTimeout(() => {
          initializePayPalButtons()
        }, 200) // Small delay to ensure DOM is ready

        return () => clearTimeout(timer)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paypalLoaded, currentOrderId, paypalButtonsRendered, isProcessingOrder])

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
      if (status === 'loading') return // Still loading

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

    // Show loading while checking authentication
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

    // Don't render if not authenticated
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
            orderValue: state.subtotal || 0, // Original subtotal for minimum order checks
            currentTotal: state.totalPrice || 0, // Current total after existing discounts for promo calculation
          }),
        })

        const data = await response.json()

        if (response.ok) {
          setAppliedPromoCode({
            code: data.code,
            discount: data.discount || 0, // Add fallback
            type: data.type,
            discountAmount: data.discountAmount || 0, // Include the total discount amount
          })

          // Create a more detailed success message
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

    // Initialize PayPal buttons
    const initializePayPalButtons = () => {
      console.log('Attempting to initialize PayPal buttons...', {
        paypalLoaded,
        currentOrderId,
        windowPaypal: !!window.paypal,
        paypalButtons: !!window.paypal?.Buttons,
      })

      if (!window.paypal) {
        console.log('PayPal SDK not loaded yet')
        setPaypalSdkError(true)
        return
      }

      if (!window.paypal.Buttons || typeof window.paypal.Buttons !== 'function') {
        console.log('PayPal Buttons not available yet, retrying in 1 second...')
        // Retry with longer delay and limit retries
        const retryCount = window.paypalRetryCount || 0
        if (retryCount < 5) {
          window.paypalRetryCount = retryCount + 1
          setTimeout(() => {
            initializePayPalButtons()
          }, 1000)
        } else {
          console.error('Max PayPal retry attempts reached')
          setPaypalSdkError(true)
        }
        return
      }

      if (!currentOrderId) {
        console.log('No current order ID')
        return
      }

      // Clear retry counter on successful initialization attempt
      window.paypalRetryCount = 0

      // Clear any existing PayPal buttons
      const paypalContainer = document.getElementById('paypal-button-container')
      if (paypalContainer) {
        paypalContainer.innerHTML = ''
      }

      console.log('Rendering PayPal buttons for order:', currentOrderId)

      try {
        window.paypal
          .Buttons({
            createOrder: async () => {
              try {
                console.log('Creating PayPal order for order ID:', currentOrderId)
                const response = await fetch('/api/paypal/create-order', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ orderId: currentOrderId }),
                })

                if (!response.ok) {
                  throw new Error('Failed to create PayPal order')
                }

                const data = await response.json()
                console.log('PayPal order created:', data.paypalOrderId)
                return data.paypalOrderId
              } catch (error) {
                console.error('Error creating PayPal order:', error)
                showError('خطأ في الدفع', 'فشل في إنشاء طلب الدفع')
                throw error
              }
            },
            onApprove: async (data: { orderID: string }) => {
              try {
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
                  throw new Error('Failed to capture payment')
                }

                const result = await response.json()
                console.log('Payment captured successfully:', result)

                // Clear cart and redirect to success page
                clearCart()
                router.push(`/checkout/success?orderId=${currentOrderId}`)
              } catch (error) {
                console.error('Error capturing payment:', error)
                showError('خطأ في المعاملة', 'حدث خطأ أثناء معالجة الدفع')
              } finally {
                setIsProcessingOrder(false)
              }
            },
            onError: (err: unknown) => {
              console.error('PayPal payment error:', err)
              showError('خطأ في الدفع', 'حدث خطأ في الدفع، يرجى المحاولة مرة أخرى')
              setIsProcessingOrder(false)
            },
            onCancel: (data: { orderID: string }) => {
              console.log('Payment cancelled by user:', data)
              showInfo('تم الإلغاء', 'تم إلغاء عملية الدفع')
              setIsProcessingOrder(false)
            },
            style: {
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'paypal',
            },
          })
          .render('#paypal-button-container')
          .then(() => {
            console.log('PayPal buttons rendered successfully')
            setPaypalButtonsRendered(true)
            setPaypalSdkError(false) // Clear any previous errors
          })
          .catch((error: unknown) => {
            console.error('Failed to render PayPal buttons:', error)
            setPaypalSdkError(true)
            setPaypalButtonsRendered(false)
          })
      } catch (error) {
        console.error('Error initializing PayPal buttons:', error)
        setPaypalSdkError(true)
        setPaypalButtonsRendered(false)
      }
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      // Prevent multiple submissions
      if (isProcessingOrder) {
        console.log('⚠️ Already processing order, ignoring duplicate submission')
        return
      }

      // Validate form
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

        // Calculate final total and actual discount amount
        // Use current total (after product discounts) as the base for promo code calculation
        const subtotalAmount = state.subtotal || 0 // Original subtotal for proportional distribution
        const currentTotal = state.totalPrice || 0 // Current total after existing discounts
        const promoDiscountAmount = appliedPromoCode
          ? appliedPromoCode.type === 'percentage'
            ? (currentTotal * appliedPromoCode.discount) / 100 // Apply promo to current total
            : Math.min(appliedPromoCode.discount, currentTotal) // Fixed amount can't exceed current total
          : 0

        // Final total = current cart total (after product discounts) - promo discount
        // Ensure final total is never negative (minimum 0)
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

        // Create order in database
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
              // Calculate promo discount per item (proportional to item value)
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
                totalPrice: Math.max(0, item.price * item.quantity - itemPromoDiscount), // Ensure never negative
                promoCode: appliedPromoCode?.code || '',
                promoDiscount: itemPromoDiscount,
                hasCustomizations: !!(
                  (
                    item.customizations &&
                    (item.customizations.textChanges?.length ||
                      item.customizations.uploadedImages?.length ||
                      item.customizations.uploadedLogo ||
                      item.customizations.customizationNotes)
                  )
                  // NOTE: Predefined color selections are NOT customizations
                  // They are product variants that can be auto-delivered if files exist
                ),
                customizations: item.customizations,
              }
            }),
            subtotal: state.subtotal || 0,
            totalPromoDiscount: promoDiscountAmount,
            totalPrice: finalTotal,
            appliedPromoCodes: appliedPromoCode ? [appliedPromoCode.code] : [],
            customerNotes: formData.notes,
          }),
        })

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json()
          throw new Error(errorData.message || 'فشل في إنشاء الطلب')
        }

        const orderData = await orderResponse.json()
        console.log('Order created successfully:', orderData)

        // Handle free orders (total <= 0) - check for customizable products
        if (finalTotal <= 0) {
          console.log('🎉 Processing free order - checking for customizable products')

          try {
            // Check if any products have EnableCustomizations: true (not actual customization data)
            const hasCustomizableProducts = orderData.hasCustomizableProducts

            // Also check if any products have actual customization data provided
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
              // Products CAN be customized but NO customization data provided - mark as missing customization
              console.log('⚠️ Free order has customizable products but missing customization data')

              await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                  status: 'awaiting_customization',
                  paymentStatus: 'free',
                  note: 'طلب مجاني يحتوي على منتجات قابلة للتخصيص ولكن بيانات التخصيص مفقودة',
                }),
              })

              // Send customer notification email
              await fetch('/api/orders/send-customer-email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                  orderNumber: orderData.orderNumber,
                  isFreeOrder: true,
                  missingCustomization: true,
                }),
              })

              // Send admin notification
              try {
                console.log('🔔 Sending admin notification for free order with missing customizations...')
                const adminNotifyResponse = await fetch('/api/admin/notify-new-order', {
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

                const adminNotifyResult = await adminNotifyResponse.json()
                if (adminNotifyResponse.ok) {
                  console.log('✅ Admin notification sent successfully:', adminNotifyResult)
                } else {
                  console.error('❌ Admin notification failed:', adminNotifyResult)
                }
              } catch (adminError) {
                console.error('❌ Error sending admin notification:', adminError)
              }

              showSuccess(
                'تم إرسال طلبك المجاني!',
                'طلبك يحتوي على منتجات قابلة للتخصيص. يرجى إضافة تفاصيل التخصيص أو سيتواصل معك فريقنا.'
              )

              clearCart()
              router.push(`/checkout/success?order=${orderData.orderNumber}&free=true&pending=true`)
              return
            } else if (hasCustomizableProducts && hasActualCustomizations) {
              // Products have customization data provided - needs admin review
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

              // Send customer notification email
              await fetch('/api/orders/send-customer-email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                  orderNumber: orderData.orderNumber,
                  isFreeOrder: true,
                }),
              })

              // Send admin notification about new free order with customizations
              try {
                console.log('🔔 Sending admin notification for free order with customizations...')
                const adminNotifyResponse = await fetch('/api/admin/notify-new-order', {
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

                const adminNotifyResult = await adminNotifyResponse.json()
                if (adminNotifyResponse.ok) {
                  console.log('✅ Admin notification sent successfully:', adminNotifyResult)
                } else {
                  console.error('❌ Admin notification failed:', adminNotifyResult)
                }
              } catch (adminError) {
                console.error('❌ Error sending admin notification:', adminError)
              }

              showSuccess(
                'تم إرسال طلبك المجاني!',
                'تم إرسال طلبك المجاني! سيقوم فريقنا بمراجعة التخصيصات المطلوبة والتواصل معك قريباً.'
              )

              clearCart()
              router.push(`/checkout/success?order=${orderData.orderNumber}&free=true&pending=true`)
              return
            } else {
              // No customizable products - auto-complete free order
              console.log('✅ Free order has no customizable products - auto-completing')

              await fetch('/api/orders/complete-free-order', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                }),
              })

              // Send customer notification email
              await fetch('/api/orders/send-customer-email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                  orderNumber: orderData.orderNumber,
                  isFreeOrder: true,
                }),
              })

              // Send admin notification about completed free order
              try {
                console.log('🔔 Sending admin notification for completed free order...')
                const adminNotifyResponse = await fetch('/api/admin/notify-new-order', {
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

                const adminNotifyResult = await adminNotifyResponse.json()
                if (adminNotifyResponse.ok) {
                  console.log('✅ Admin notification sent successfully:', adminNotifyResult)
                } else {
                  console.error('❌ Admin notification failed:', adminNotifyResult)
                }
              } catch (adminError) {
                console.error('❌ Error sending admin notification:', adminError)
              }

              showSuccess(
                'تم إكمال طلبك المجاني!',
                'تم إكمال طلبك المجاني وإرسال الملفات! يمكنك تحميلها من رسالة البريد الإلكتروني.'
              )

              clearCart()
              router.push(`/checkout/success?order=${orderData.orderNumber}&free=true&completed=true`)
              return
            }
          } catch (error) {
            console.error('Error processing free order:', error)
            showError('خطأ في الطلب المجاني', 'حدث خطأ في معالجة الطلب المجاني. يرجى المحاولة مرة أخرى.')
            return
          }
        }

        // For paid orders, continue with PayPal flow
        // Reset PayPal button state and set new order ID
        setPaypalButtonsRendered(false)
        setCurrentOrderId(orderData.orderId)

        // PayPal buttons will be initialized by the useEffect hook
      } catch (error) {
        console.error('Error creating order:', error)
        const errorMessage = error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى'
        showError('خطأ في إنشاء الطلب', `حدث خطأ في إنشاء الطلب: ${errorMessage}`)
      } finally {
        setIsProcessingOrder(false)
      }
    }

    // Debug: Check for corrupted cart data
    const hasCorruptedData = state.items.some(
      (item) => item.price < 0 || (item.originalPrice && item.originalPrice < item.price) || item.quantity <= 0
    )

    if (hasCorruptedData) {
      console.error('Corrupted cart data detected:', state.items)
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
                  <div className="item-quantity">
                    <button
                      onClick={() => handleQuantityChange(item.cartItemId, item.quantity - 1)}
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.cartItemId, item.quantity + 1)}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>
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
                    {Math.min(
                      appliedPromoCode.type === 'percentage'
                        ? ((state.totalPrice || 0) * (appliedPromoCode.discount || 0)) / 100
                        : appliedPromoCode.discountAmount || appliedPromoCode.discount || 0,
                      state.totalPrice || 0
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
                      Math.min(
                        appliedPromoCode
                          ? appliedPromoCode.type === 'percentage'
                            ? ((state.totalPrice || 0) * appliedPromoCode.discount) / 100
                            : appliedPromoCode.discount
                          : 0,
                        state.totalPrice || 0
                      )
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

                        {/* Loading overlay - positioned absolutely over the container */}
                        {!paypalButtonsRendered && !isProcessingOrder && (
                          <div className="paypal-loading-overlay">
                            <div className="loading-spinner"></div>
                            <p>جاري تحميل أزرار الدفع...</p>
                          </div>
                        )}

                        {/* Processing overlay */}
                        {isProcessingOrder && (
                          <div className="paypal-processing-overlay">
                            <div className="loading-spinner"></div>
                            <p>جاري معالجة الدفع...</p>
                          </div>
                        )}
                      </div>
                    ) : paypalSdkError ? (
                      <div className="paypal-error">
                        <p>فشل في تحميل PayPal. يرجى المحاولة مرة أخرى.</p>
                        <button onClick={retryPayPalSDK} className="retry-btn">
                          إعادة المحاولة
                        </button>
                      </div>
                    ) : (
                      <div className="loading-paypal">
                        <div className="loading-spinner"></div>
                        <p>جاري تحميل PayPal...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Show submit button only if no order is created yet */}
              {!currentOrderId &&
                (() => {
                  // Calculate final total for button display
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
