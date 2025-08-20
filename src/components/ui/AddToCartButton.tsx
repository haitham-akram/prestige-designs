'use client'

import { useState } from 'react'
import { useCart, CartItemCustomization } from '@/contexts/CartContext'
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
    customizations?: CartItemCustomization
    EnableCustomizations?: boolean
    colors?: { name: string; hex: string }[]
  }
  className?: string
  onAddToCart?: () => void
}

export default function AddToCartButton({ product, className = '', onAddToCart }: AddToCartButtonProps) {
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

    // Prepare customizations, auto-select first color if needed
    const customizations = product.customizations ? { ...product.customizations } : {}
    const isAutoDeliver = !product.EnableCustomizations
    const hasPredefinedColors = Array.isArray(product.colors) && product.colors.length > 0
    const hasColorSelected =
      customizations.colors && Array.isArray(customizations.colors) && customizations.colors.length > 0

    if (isAutoDeliver && hasPredefinedColors && !hasColorSelected && product.colors) {
      // Auto-select the first color
      customizations.colors = [product.colors[0]]
    }

    const cartItem = {
      id: product.id || product._id || '',
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      category: product.category,
      customizations,
      EnableCustomizations: product.EnableCustomizations,
    }

    console.log('🛒 Adding item to cart:', {
      productName: cartItem.name,
      productIdFromProps: product.id,
      productIdFromDB: product._id,
      finalCartItemId: cartItem.id,
      EnableCustomizations: cartItem.EnableCustomizations,
      hasCustomizations: !!(cartItem.customizations && Object.keys(cartItem.customizations || {}).length > 0),
      customizations: cartItem.customizations,
    })

    addItem(cartItem)
    setShowSuccess(true)
    setIsAdding(false)

    // Call the onAddToCart callback if provided
    if (onAddToCart) {
      onAddToCart()
    }

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

      {isAdding && (
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
      )}
    </button>
  )
}
