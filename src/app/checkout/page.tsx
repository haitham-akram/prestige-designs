'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShoppingCart, faUser, faEnvelope, faPhone, faTrash, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { faPaypal as faPaypalBrand } from '@fortawesome/free-brands-svg-icons'
import CustomerLayout from '@/app/customer-layout'
import { getCustomLabel } from '@/utils/colorTranslations'
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
  }
}

export default function CheckoutPage() {
  console.log('CheckoutPage: Starting to render')

  function CheckoutContent() {
    const { state, removeItem, updateQuantity, clearCart } = useCart()
    const { data: session, status } = useSession()
    const router = useRouter()
    console.log('CheckoutPage: Cart state loaded', state)
    console.log('CheckoutPage: Cart state properties:', {
      totalItems: state.totalItems,
      totalPrice: state.totalPrice,
      totalSavings: state.totalSavings,
      subtotal: state.subtotal,
      itemsCount: state.items.length,
    })
    console.log(
      'CheckoutPage: Cart items details:',
      state.items.map((item) => ({
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        quantity: item.quantity,
        totalPrice: item.price * item.quantity,
        savings: item.originalPrice ? (item.originalPrice - item.price) * item.quantity : 0,
      }))
    )

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

    // Initialize PayPal buttons when conditions are met
    useEffect(() => {
      if (paypalLoaded && currentOrderId && !paypalButtonsRendered && !isProcessingOrder) {
        console.log('Initializing PayPal buttons...')
        const timer = setTimeout(() => {
          initializePayPalButtons()
        }, 200) // Small delay to ensure DOM is ready

        return () => clearTimeout(timer)
      }
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
        console.log(
          'Debug - Cart items being sent:',
          state.items.map((item) => ({
            productId: item.id, // Use item.id, not item.productId
            _id: item.id, // Use item.id, not item._id
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          }))
        )

        const response = await fetch('/api/admin/promo-codes/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: promoCode.trim(),
            orderAmount: state.totalPrice,
            cartItems: state.items.map((item) => ({
              productId: item.id, // Use item.id, not item.productId
              _id: item.id, // Use item.id, not item._id
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
          }),
        })

        const data = await response.json()

        if (response.ok) {
          console.log('Promo code validation response:', data) // Debug log
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
      if (!window.paypal || !currentOrderId) {
        console.log('PayPal not loaded or no current order ID')
        return
      }

      // Clear any existing PayPal buttons
      const paypalContainer = document.getElementById('paypal-button-container')
      if (paypalContainer) {
        paypalContainer.innerHTML = ''
      }

      console.log('Rendering PayPal buttons for order:', currentOrderId)

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
              alert('فشل في إنشاء طلب الدفع')
              throw error
            }
          },
          onApprove: async (data: { orderID: string }) => {
            try {
              console.log('Payment approved, capturing payment...')
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
              alert('حدث خطأ أثناء معالجة الدفع')
            } finally {
              setIsProcessingOrder(false)
            }
          },
          onError: (err: unknown) => {
            console.error('PayPal payment error:', err)
            alert('حدث خطأ في الدفع، يرجى المحاولة مرة أخرى')
            setIsProcessingOrder(false)
          },
          onCancel: (data: { orderID: string }) => {
            console.log('Payment cancelled by user:', data)
            alert('تم إلغاء عملية الدفع')
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
        })
        .catch((error: unknown) => {
          console.error('Failed to render PayPal buttons:', error)
          alert('فشل في تحميل أزرار الدفع، يرجى إعادة تحميل الصفحة')
          setPaypalButtonsRendered(false)
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      // Prevent multiple submissions
      if (isProcessingOrder) {
        console.log('⚠️ Already processing order, ignoring duplicate submission');
        return;
      }

      // Validate form
      if (!formData.firstName || !formData.lastName || !formData.email) {
        alert('يرجى ملء جميع الحقول المطلوبة')
        return
      }

      if (selectedPaymentMethod !== 'paypal') {
        alert('حالياً، دفع PayPal هو الطريقة الوحيدة المتاحة')
        return
      }

      try {
        setIsProcessingOrder(true)
        console.log('🔄 Starting order creation process...');

        // Calculate final total and actual discount amount
        const subtotalAmount = state.totalPrice || 0;
        const finalTotal = subtotalAmount - 
          (appliedPromoCode
            ? appliedPromoCode.type === 'percentage'
              ? (subtotalAmount * appliedPromoCode.discount) / 100
              : appliedPromoCode.discount
            : 0);
        
        const actualDiscountAmount = subtotalAmount - finalTotal;

        console.log('💰 Pricing calculation:', {
          subtotal: subtotalAmount,
          promoCode: appliedPromoCode,
          finalTotal,
          actualDiscountAmount
        });

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
            items: state.items.map((item) => ({
              productId: item.id,
              productName: item.name,
              productSlug: item.name.toLowerCase().replace(/\s+/g, '-'),
              quantity: item.quantity,
              originalPrice: item.originalPrice || item.price,
              discountAmount: (item.originalPrice || item.price) - item.price,
              unitPrice: item.price,
              totalPrice: item.price * item.quantity,
              hasCustomizations: !!(
                item.customizations &&
                (item.customizations.textChanges?.length ||
                  item.customizations.uploadedImages?.length ||
                  item.customizations.uploadedLogo ||
                  item.customizations.customizationNotes)
                // NOTE: Predefined color selections are NOT customizations
                // They are product variants that can be auto-delivered if files exist
              ),
              customizations: item.customizations,
            })),
            subtotal: state.subtotal || 0,
            totalPromoDiscount: actualDiscountAmount,
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

        // Reset PayPal button state and set new order ID
        setPaypalButtonsRendered(false)
        setCurrentOrderId(orderData.orderId)

        // PayPal buttons will be initialized by the useEffect hook
        console.log('Order created, PayPal buttons will be initialized automatically')
      } catch (error) {
        console.error('Error creating order:', error)
        const errorMessage = error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى'
        alert(`حدث خطأ في إنشاء الطلب: ${errorMessage}`)
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
            <p>لا توجد منتجات في السلة لإتمام الطلب</p>
            <a href="/" className="btn btn-primary">
              العودة للتسوق
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className="container">
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
              {state.items.map((item) => (
                <div key={item.cartItemId} className="order-item">
                  <div className="item-image">
                    <img src={item.image} alt={item.name} />
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
                    {appliedPromoCode.type === 'percentage'
                      ? (((state.totalPrice || 0) * (appliedPromoCode.discount || 0)) / 100).toFixed(2)
                      : (appliedPromoCode.discountAmount || appliedPromoCode.discount || 0).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="total-row final-total">
                <span>المجموع النهائي:</span>
                <span>
                  $
                  {(
                    (state.totalPrice || 0) -
                    (appliedPromoCode
                      ? appliedPromoCode.type === 'percentage'
                        ? ((state.totalPrice || 0) * appliedPromoCode.discount) / 100
                        : appliedPromoCode.discount
                      : 0)
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
                      اسم العائلة
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
                      رقم الهاتف
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
                      <>
                        <div className="paypal-container-wrapper">
                          <div id="paypal-button-container"></div>
                        </div>
                        {!paypalButtonsRendered && !isProcessingOrder && (
                          <div className="loading-paypal">
                            <div className="loading-spinner"></div>
                            <p>جاري تحميل أزرار الدفع...</p>
                          </div>
                        )}
                        {isProcessingOrder && (
                          <div className="processing-payment">
                            <div className="loading-spinner"></div>
                            <p>جاري معالجة الدفع...</p>
                          </div>
                        )}
                      </>
                    ) : paypalSdkError ? (
                      <div className="paypal-error">
                        <p>فشل في تحميل PayPal. يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى.</p>
                        <button onClick={() => window.location.reload()} className="retry-btn">
                          إعادة تحميل الصفحة
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
              {!currentOrderId && (
                <button
                  type="submit"
                  className="submit-order-btn"
                  disabled={isProcessingOrder || !paypalLoaded || paypalSdkError}
                >
                  <span>
                    {isProcessingOrder
                      ? 'جاري إنشاء الطلب...'
                      : paypalSdkError
                      ? 'فشل في تحميل PayPal - يرجى إعادة تحميل الصفحة'
                      : !paypalLoaded
                      ? 'جاري تحميل PayPal...'
                      : 'إنشاء الطلب والمتابعة للدفع'}
                  </span>
                  <FontAwesomeIcon icon={faArrowRight} />
                </button>
              )}
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
