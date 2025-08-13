'use client'

import { useState, useRef, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useSession } from 'next-auth/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShoppingCart, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons'
import Image from 'next/image'
import { translateColorNames } from '@/utils/colorTranslations'
import { useRouter } from 'next/navigation'
import LoginAlert from './LoginAlert'
import './CartDropdown.css'

export default function CartDropdown() {
  const { state, removeItem, updateQuantity } = useCart()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showLoginAlert, setShowLoginAlert] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      updateQuantity(id, newQuantity)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  if (state.totalItems === 0) {
    return (
      <div className="cart-dropdown-container" ref={dropdownRef}>
        <div
          className="cart-icon-wrapper"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <FontAwesomeIcon icon={faShoppingCart} className="cart-icon" />
          <span className="cart-badge">0</span>

          {/* Empty Cart Preview */}
          {isHovered && (
            <div className="cart-preview">
              <div className="cart-preview-content">
                <p className="cart-preview-empty">سلة التسوق فارغة</p>
                <p className="cart-preview-subtitle">أضف منتجات لبدء التسوق</p>
              </div>
            </div>
          )}
        </div>

        <LoginAlert isOpen={showLoginAlert} onClose={() => setShowLoginAlert(false)} />
      </div>
    )
  }

  return (
    <div className="cart-dropdown-container" ref={dropdownRef}>
      <div
        className="cart-icon-wrapper"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <FontAwesomeIcon icon={faShoppingCart} className="cart-icon" />
        <span className="cart-badge">{state.totalItems}</span>

        {/* Cart Preview on Hover */}
        {isHovered && !isOpen && (
          <div className="cart-preview">
            <div className="cart-preview-header">
              <h4>سلة التسوق ({state.totalItems})</h4>
            </div>
            <div className="cart-preview-items">
              {state.items.slice(0, 3).map((item) => (
                <div key={item.cartItemId} className="cart-preview-item">
                  <div className="cart-preview-item-image">
                    <Image src={item.image} alt={item.name} width={40} height={40} className="preview-image" />
                  </div>
                  <div className="cart-preview-item-details">
                    <p className="cart-preview-item-name">{item.name}</p>
                    {item.customizations?.colors && item.customizations.colors.length > 0 && (
                      <p className="cart-preview-item-colors">
                        {translateColorNames(item.customizations.colors.map((c) => c.name)).join(', ')}
                      </p>
                    )}
                    <p className="cart-preview-item-price">
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
              {state.items.length > 3 && <p className="cart-preview-more">+{state.items.length - 3} منتجات أخرى</p>}
            </div>
            <div className="cart-preview-footer">
              <p className="cart-preview-total">المجموع: {formatPrice(state.totalPrice)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Full Cart Dropdown */}
      {isOpen && (
        <div className="cart-dropdown">
          <div className="cart-dropdown-header">
            <h3>سلة التسوق ({state.totalItems})</h3>
            <button className="close-cart-btn" onClick={() => setIsOpen(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="cart-items">
            {state.items.map((item) => (
              <div key={item.cartItemId} className="cart-item">
                <div className="cart-item-image">
                  <Image src={item.image} alt={item.name} width={60} height={60} className="item-image" />
                </div>

                <div className="cart-item-details">
                  <h4 className="cart-item-name">{item.name}</h4>
                  {item.customizations?.colors && item.customizations.colors.length > 0 && (
                    <p className="cart-item-colors">
                      {translateColorNames(item.customizations.colors.map((c) => c.name)).join(', ')}
                    </p>
                  )}
                  <p className="cart-item-price">
                    {formatPrice(item.price)}
                    {item.originalPrice && (
                      <span className="cart-item-original-price">{formatPrice(item.originalPrice)}</span>
                    )}
                  </p>

                  <div className="cart-item-quantity">
                    <button
                      className="quantity-btn"
                      onClick={() => handleQuantityChange(item.cartItemId, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span className="quantity-value">{item.quantity}</span>
                    <button
                      className="quantity-btn"
                      onClick={() => handleQuantityChange(item.cartItemId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="cart-item-actions">
                  <button className="remove-item-btn" onClick={() => removeItem(item.cartItemId)}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-dropdown-footer">
            <div className="cart-totals">
              <div className="cart-total-row">
                <span>المجموع:</span>
                <span>{formatPrice(state.totalPrice)}</span>
              </div>
              {state.totalSavings > 0 && (
                <div className="cart-savings">
                  <span>التوفير:</span>
                  <span className="savings-amount">-{formatPrice(state.totalSavings)}</span>
                </div>
              )}
            </div>

            <button
              className="checkout-btn"
              onClick={() => {
                console.log('Checkout button clicked, session:', session)
                setIsOpen(false)
                if (session?.user) {
                  console.log('User is logged in, navigating to checkout')
                  router.push('/checkout')
                } else {
                  console.log('User is not logged in, showing login alert')
                  setShowLoginAlert(true)
                }
              }}
            >
              إتمام الطلب
            </button>
          </div>
        </div>
      )}

      <LoginAlert isOpen={showLoginAlert} onClose={() => setShowLoginAlert(false)} />
    </div>
  )
}
