'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShoppingCart, faCheck } from '@fortawesome/free-solid-svg-icons'
import './AddToCartButton.css'

interface AddToCartButtonProps {
  product: {
    id?: string
    _id?: string
    name: string
    price: number
    finalPrice?: number
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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

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

  const productId = product.id || product._id || ''
  const currentQuantity = getItemQuantity(productId)
  const isInCartState = isInCart(productId)

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
    </button>
  )
}
