'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShoppingCart, faCheck } from '@fortawesome/free-solid-svg-icons'
import './AddToCartButton.css'

interface AddToCartButtonProps {
  product: {
    id: string
    name: string
    price: number
    originalPrice?: number
    image: string
    category?: string
  }
  className?: string
}

export default function AddToCartButton({ product, className = '' }: AddToCartButtonProps) {
  const { addItem, isInCart, getItemQuantity } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleAddToCart = async () => {
    if (isAdding) return

    setIsAdding(true)

    // Simulate a brief loading state
    await new Promise((resolve) => setTimeout(resolve, 300))

    addItem(product)
    setShowSuccess(true)
    setIsAdding(false)

    // Hide success state after 2 seconds
    setTimeout(() => {
      setShowSuccess(false)
    }, 2000)
  }

  const currentQuantity = getItemQuantity(product.id)
  const isInCartState = isInCart(product.id)

  return (
    <button
      className={`add-to-cart-btn ${className} ${isInCartState ? 'in-cart' : ''} ${isAdding ? 'adding' : ''} ${
        showSuccess ? 'success' : ''
      }`}
      onClick={handleAddToCart}
      disabled={isAdding}
    >
      <div className="btn-content">
        {showSuccess ? (
          <>
            <FontAwesomeIcon icon={faCheck} className="btn-icon success-icon" />
            <span className="btn-text">تم الإضافة!</span>
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faShoppingCart} className="btn-icon" />
            <span className="btn-text">{isInCartState ? `أضيف للمرة ${currentQuantity}` : 'أضف للسلة'}</span>
          </>
        )}
      </div>

      {isAdding && <div className="loading-spinner"></div>}

      {/* Removed quantity badge - no longer showing red circle */}
    </button>
  )
}
