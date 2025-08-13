'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faShoppingCart,
  faCreditCard,
  faUser,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faTrash,
  faArrowRight,
  faPaypal,
} from '@fortawesome/free-solid-svg-icons'
import { faPaypal as faPaypalBrand } from '@fortawesome/free-brands-svg-icons'
import CustomerLayout from '@/app/customer-layout'
import './checkout.css'

interface CheckoutForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  zipCode: string
  notes: string
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
      address: '',
      city: '',
      country: '',
      zipCode: '',
      notes: '',
    })

    const [promoCode, setPromoCode] = useState('')
    const [promoCodeError, setPromoCodeError] = useState('')
    const [promoCodeSuccess, setPromoCodeSuccess] = useState('')
    const [appliedPromoCode, setAppliedPromoCode] = useState<{
      code: string
      discount: number
      type: 'percentage' | 'fixed'
    } | null>(null)
    const [isValidatingPromo, setIsValidatingPromo] = useState(false)

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
        const response = await fetch('/api/admin/promo-codes/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: promoCode.trim(),
            totalAmount: state.totalPrice,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          setAppliedPromoCode({
            code: data.code,
            discount: data.discount,
            type: data.type,
          })
          setPromoCodeSuccess(
            `تم تطبيق كود الخصم! خصم ${data.type === 'percentage' ? data.discount + '%' : '$' + data.discount}`
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

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      // Handle order submission logic here
      console.log('Order submitted:', { formData, items: state.items, appliedPromoCode })
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
                    <h4>{item.name}</h4>
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
                      ? (((state.totalPrice || 0) * appliedPromoCode.discount) / 100).toFixed(2)
                      : appliedPromoCode.discount.toFixed(2)}
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
                <h3>عنوان التوصيل</h3>
                <div className="form-group">
                  <label>
                    <FontAwesomeIcon icon={faMapMarkerAlt} />
                    العنوان
                  </label>
                  <input type="text" name="address" value={formData.address} onChange={handleInputChange} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>المدينة</label>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>الدولة</label>
                    <input type="text" name="country" value={formData.country} onChange={handleInputChange} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>الرمز البريدي</label>
                  <input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} required />
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
                    <input type="radio" id="paypal" name="payment" value="paypal" defaultChecked />
                    <label htmlFor="paypal">
                      <FontAwesomeIcon icon={faPaypalBrand} />
                      PayPal
                    </label>
                  </div>
                  <div className="payment-method">
                    <input type="radio" id="card" name="payment" value="card" />
                    <label htmlFor="card">
                      <FontAwesomeIcon icon={faCreditCard} />
                      بطاقة ائتمان
                    </label>
                  </div>
                  <div className="payment-method">
                    <input type="radio" id="cash" name="payment" value="cash" />
                    <label htmlFor="cash">
                      <FontAwesomeIcon icon={faCreditCard} />
                      الدفع عند الاستلام
                    </label>
                  </div>
                </div>
              </div>

              <button type="submit" className="submit-order-btn">
                <span>إتمام الطلب</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
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
