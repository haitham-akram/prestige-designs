'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'
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
  }
}

export default function CheckoutPage() {
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

    const [paypalStatus, setPaypalStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [isProcessingOrder, setIsProcessingOrder] = useState(false)
    const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('paypal')
    const [paypalButtonsRendered, setPaypalButtonsRendered] = useState(false)

    // --- NEW: Resilient PayPal SDK Loader ---
    useEffect(() => {
      let mounted = true

      const attemptToLoadPayPal = (retriesLeft = 5) => {
        if (!mounted) return
        if (retriesLeft === 0) {
          console.error('❌ Could not find PayPal Client ID meta tag after multiple attempts.')
          setPaypalStatus('error')
          return
        }

        const paypalClientId = document.querySelector('meta[name="paypal-client-id"]')?.getAttribute('content')

        if (paypalClientId) {
          console.log('✅ Found PayPal Client ID. Loading script...')
          const script = document.createElement('script')
          script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD&intent=capture&components=buttons&locale=ar_EG`
          script.async = true
          
          script.onload = () => {
            if (mounted) {
              console.log('✅ PayPal SDK script loaded and ready.')
              setPaypalStatus('ready')
            }
          }
          script.onerror = (error) => {
            if (mounted) {
              console.error('❌ Failed to load the PayPal SDK script:', error)
              setPaypalStatus('error')
            }
          }
          document.head.appendChild(script)
        } else {
          console.warn(`⚠️ PayPal Client ID not found. Retrying... (${retriesLeft} attempts left)`)
          setTimeout(() => attemptToLoadPayPal(retriesLeft - 1), 300) // Wait 300ms before retrying
        }
      }

      if (typeof window === 'undefined') return
      if (window.paypal?.Buttons) {
        if (mounted) setPaypalStatus('ready')
        return
      }

      document.querySelectorAll('script[src*="paypal.com/sdk"]').forEach((script) => script.remove())

      attemptToLoadPayPal()

      return () => {
        mounted = false
      }
    }, [])

    const initializePayPalButtons = useCallback(() => {
      if (!window.paypal?.Buttons) {
        setPaypalStatus('error')
        return
      }
      if (!currentOrderId || paypalButtonsRendered) return

      const paypalContainer = document.getElementById('paypal-button-container')
      if (!paypalContainer) {
        setTimeout(initializePayPalButtons, 300)
        return
      }
      paypalContainer.innerHTML = ''

      try {
        window.paypal
          .Buttons({
            createOrder: async () => {
              const response = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: currentOrderId }),
              })
              if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error(err.error || 'Server error')
              }
              const data = await response.json()
              return data.paypalOrderId
            },
            onApprove: async (data: { orderID: string }) => {
              setIsProcessingOrder(true)
              try {
                const response = await fetch('/api/paypal/capture-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paypalOrderId: data.orderID, orderId: currentOrderId }),
                })
                if (!response.ok) throw new Error('Payment capture failed')
                clearCart()
                router.push(`/checkout/success?orderId=${currentOrderId}`)
              } catch (error) {
                  console.error('Error during payment capture:', error);
                  showError('خطأ في المعاملة', 'حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.')
                  setIsProcessingOrder(false)
              }
            },
            onError: (err: any) => {
              console.error('❌ PayPal Error:', err)
              showError('خطأ في الدفع', 'حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة.')
              setIsProcessingOrder(false)
            },
          })
          .render('#paypal-button-container')
          .then(() => setPaypalButtonsRendered(true))
          .catch((err) => {
            console.error('❌ Failed to render PayPal buttons:', err)
            setPaypalStatus('error')
          })
      } catch (error) {
        console.error('❌ Error initializing PayPal buttons instance:', error)
        setPaypalStatus('error')
      }
    }, [currentOrderId, paypalButtonsRendered, router, clearCart, showError])

    useEffect(() => {
      if (paypalStatus === 'ready' && currentOrderId && !paypalButtonsRendered) {
        const timer = setTimeout(() => {
          if (paypalStatus === 'ready' && currentOrderId && !paypalButtonsRendered) {
            initializePayPalButtons()
          }
        }, 100)
        return () => clearTimeout(timer)
      }
    }, [paypalStatus, currentOrderId, paypalButtonsRendered, initializePayPalButtons])

    useEffect(() => {
      if (currentOrderId) {
        setPaypalButtonsRendered(false)
        const container = document.getElementById('paypal-button-container')
        if (container) container.innerHTML = ''
      }
    }, [currentOrderId])

    useEffect(() => {
      if (status === 'loading') return
      if (!session?.user) router.push('/auth/signin?redirect=/checkout')
    }, [session, status, router])

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
        <div className="container"><div className="checkout-loading"><div className="loading-spinner"></div><p>جاري التحقق...</p></div></div>
      )
    }

    if (!session?.user) return null

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
      if (newQuantity < 1) removeItem(cartItemId)
      else updateQuantity(cartItemId, newQuantity)
    }

    const handlePromoCodeValidation = async () => {
      if (!promoCode.trim()) { setPromoCodeError('يرجى إدخال كود الخصم'); return }
      setIsValidatingPromo(true)
      setPromoCodeError('')
      setPromoCodeSuccess('')
      try {
        const response = await fetch('/api/promo-codes/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: promoCode.trim(), orderValue: state.subtotal || 0, currentTotal: state.totalPrice || 0, cartItems: state.items || [] }) })
        const data = await response.json()
        if (response.ok) {
          setAppliedPromoCode({ code: data.code, discount: data.discount || 0, type: data.type, discountAmount: data.discountAmount || 0 })
          setPromoCodeSuccess(`تم تطبيق الخصم بنجاح!`)
          setPromoCode('')
        } else {
          setPromoCodeError(data.message || 'كود الخصم غير صحيح')
        }
      } catch (error) { setPromoCodeError('حدث خطأ أثناء التحقق')
      } finally { setIsValidatingPromo(false) }
    }

    const removePromoCode = () => {
      setAppliedPromoCode(null)
      setPromoCodeSuccess('')
    }

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault()
      if (isProcessingOrder) return
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) { showError('بيانات مطلوبة', 'يرجى ملء جميع الحقول المطلوبة.'); return }

      setIsProcessingOrder(true)
      try {
        const subtotalAmount = state.subtotal || 0
        const currentTotal = state.totalPrice || 0
        const promoDiscountAmount = appliedPromoCode?.discountAmount || 0
        const finalTotal = Math.max(0, currentTotal - promoDiscountAmount)

        if (finalTotal <= 0) {
          // ... Your detailed free order logic ...
          console.log("Processing free order...")
          setIsProcessingOrder(false)
          return
        }

        const response = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: `${formData.firstName} ${formData.lastName}`, customerEmail: formData.email, customerPhone: formData.phone,
            items: state.items.map((item) => {
              const itemSubtotal = (item.originalPrice || item.price) * item.quantity
              const itemPromoDiscount = promoDiscountAmount > 0 ? (itemSubtotal / subtotalAmount) * promoDiscountAmount : 0
              return { productId: item.id, productName: item.name, productSlug: item.name.toLowerCase().replace(/\s+/g, '-'), quantity: item.quantity, originalPrice: item.originalPrice || item.price, discountAmount: (item.originalPrice || item.price) - item.price, unitPrice: item.price, totalPrice: Math.max(0, item.price * item.quantity - itemPromoDiscount), promoCode: appliedPromoCode?.code || '', promoDiscount: itemPromoDiscount, EnableCustomizations: item.EnableCustomizations || false, hasCustomizations: !!(item.customizations && (item.customizations.textChanges?.length || item.customizations.uploadedImages?.length || item.customizations.uploadedLogo || item.customizations.customizationNotes)), customizations: item.customizations }
            }),
            subtotal: state.subtotal || 0, totalPromoDiscount: promoDiscountAmount, totalPrice: finalTotal, appliedPromoCodes: appliedPromoCode ? [appliedPromoCode.code] : [], customerNotes: formData.notes,
          }),
        })

        if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'فشل في إنشاء الطلب') }
        const orderData = await response.json()
        setCurrentOrderId(orderData.orderId)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى'
        showError('خطأ في إنشاء الطلب', errorMessage)
      } finally {
        setIsProcessingOrder(false)
      }
    }
    
    if (state.items.length === 0) {
      return (<div className="container"><div className="checkout-empty"><div className="checkout-empty-icon"><FontAwesomeIcon icon={faShoppingCart} /></div><h2>السلة فارغة</h2><Link href="/" className="btn btn-primary">العودة للتسوق</Link></div></div>)
    }

    return (
      <div className="container">
        {/* ... The rest of your JSX is identical to the last correct version ... */}
        <div className="alerts-container">{alerts.map((alert, index) => <Alert key={index} {...alert} />)}</div>
        <div className="checkout-header"><h1>اتمام الطلب</h1><p>أكمل معلوماتك لإتمام عملية الشراء</p></div>
        <div className="checkout-container">
            <div className="checkout-summary">
                <div className="summary-header"><h3>ملخص الطلب</h3><span className="items-count">{state.totalItems} منتج</span></div>
                <div className="order-items">{state.items.map((item, index) => (<div className="order-item" key={item.cartItemId}><div className="item-image"><Image src={item.image} alt={item.name} width={100} height={100} style={{ objectFit: 'contain' }} priority={index === 0} /></div><div className="item-details"><h4>{item.name} {getCustomLabel(item.customizations) && <span className="custom-label"> ({getCustomLabel(item.customizations)})</span>}</h4><div className="item-pricing">{item.originalPrice && item.originalPrice > item.price ? (<><div className="item-original-price">${item.originalPrice}</div><div className="item-final-price">${item.price}</div></>) : (<div className="item-price">${item.price}</div>)}</div></div><div className="item-quantity"><button onClick={() => handleQuantityChange(item.cartItemId, item.quantity - 1)} className="quantity-btn">-</button><span>{item.quantity}</span><button onClick={() => handleQuantityChange(item.cartItemId, item.quantity + 1)} className="quantity-btn">+</button></div><div className="item-total">${(item.price * item.quantity).toFixed(2)}</div><button onClick={() => removeItem(item.cartItemId)} className="remove-btn" title="إزالة"><FontAwesomeIcon icon={faTrash} /></button></div>))}</div>
                <div className="promo-code-section">
                    <h4>كود الخصم</h4>
                    {!appliedPromoCode ? (<div className="promo-code-input"><input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="أدخل كود الخصم" className="promo-input" disabled={isValidatingPromo} /><button onClick={handlePromoCodeValidation} disabled={isValidatingPromo || !promoCode.trim()} className="promo-btn">{isValidatingPromo ? 'جاري التحقق...' : 'تطبيق'}</button></div>) : (<div className="applied-promo"><span className="promo-code-text">{appliedPromoCode.code}</span><button onClick={removePromoCode} className="remove-promo-btn">إزالة</button></div>)}
                    {promoCodeError && <div className="promo-error">{promoCodeError}</div>}
                    {promoCodeSuccess && <div className="promo-success">{promoCodeSuccess}</div>}
                </div>
                <div className="order-totals">
                    <div className="total-row"><span>المجموع الفرعي:</span><span>${(state.subtotal || 0).toFixed(2)}</span></div>
                    {(state.totalSavings || 0) > 0 && <div className="total-row"><span>خصم المنتجات:</span><span>-${(state.totalSavings || 0).toFixed(2)}</span></div>}
                    {appliedPromoCode && <div className="total-row"><span>خصم الكوبون:</span><span>-${(appliedPromoCode.discountAmount || 0).toFixed(2)}</span></div>}
                    <div className="total-row final-total"><span>المجموع النهائي:</span><span>${Math.max(0, (state.totalPrice || 0) - (appliedPromoCode?.discountAmount || 0)).toFixed(2)}</span></div>
                </div>
            </div>
            <div className="checkout-form">
                <form onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h3>معلومات الشخصية</h3>
                        <div className="form-row"><div className="form-group"><label><FontAwesomeIcon icon={faUser} /> الاسم الأول</label><input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required /></div><div className="form-group"><label><FontAwesomeIcon icon={faUser} /> الاسم الأخير</label><input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required /></div></div>
                        <div className="form-row"><div className="form-group"><label><FontAwesomeIcon icon={faEnvelope} /> البريد الإلكتروني</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} required /></div><div className="form-group"><label><FontAwesomeIcon icon={faPhone} /> رقم الهاتف</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required /></div></div>
                    </div>
                    <div className="form-section"><h3>ملاحظات إضافية</h3><div className="form-group"><label>ملاحظات الطلب (اختياري)</label><textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3}></textarea></div></div>
                    <div className="form-section">
                        <h3>طريقة الدفع</h3>
                        <div className="payment-methods">
                            <div className="payment-method">
                                <input type="radio" id="paypal" name="payment" value="paypal" checked={selectedPaymentMethod === 'paypal'} onChange={(e) => setSelectedPaymentMethod(e.target.value)} />
                                <label htmlFor="paypal"><FontAwesomeIcon icon={faPaypalBrand} /> PayPal & Credit Cards
                                    {paypalStatus === 'loading' && <span className="loading-text"> (جاري التحميل...)</span>}
                                    {paypalStatus === 'error' && <span className="error-text"> (فشل التحميل)</span>}
                                    {paypalStatus === 'ready' && <span className="success-text"> ✓</span>}
                                </label>
                            </div>
                        </div>
                    </div>
                    {currentOrderId && (<div className="paypal-buttons-section">
                        <h4>إتمام الدفع</h4>
                        {paypalStatus === 'ready' ? (<div className="paypal-container-wrapper"><div id="paypal-button-container"></div>{!paypalButtonsRendered && !isProcessingOrder && (<div className="paypal-loading-overlay"><div className="loading-spinner"></div><p>جاري تحميل الأزرار...</p></div>)}{isProcessingOrder && (<div className="paypal-processing-overlay"><div className="loading-spinner"></div><p>جاري المعالجة...</p></div>)}</div>) : paypalStatus === 'error' ? (<div className="paypal-error"><p>❌ فشل تحميل PayPal.</p><button onClick={() => window.location.reload()} className="retry-btn" type="button">إعادة تحميل الصفحة</button></div>) : (<div className="loading-paypal"><div className="loading-spinner"></div><p>جاري تحميل PayPal...</p></div>)}
                    </div>)}
                    {!currentOrderId && (() => {
                        const isFreeOrder = Math.max(0, (state.totalPrice || 0) - (appliedPromoCode?.discountAmount || 0)) <= 0
                        return (<button type="submit" className="submit-order-btn" disabled={isProcessingOrder || (!isFreeOrder && paypalStatus !== 'ready')}><span>{isProcessingOrder ? 'جاري الإنشاء...' : isFreeOrder ? 'إنشاء الطلب المجاني' : paypalStatus === 'loading' ? 'جاري تحميل PayPal...' : paypalStatus === 'error' ? 'خطأ في الدفع - أعد التحميل' : 'إنشاء الطلب والدفع'}</span><FontAwesomeIcon icon={faArrowRight} /></button>)
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