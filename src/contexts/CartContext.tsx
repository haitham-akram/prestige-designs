'use client'

import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react'

export interface CartItemCustomization {
  colors?: { name: string; hex: string }[]
  textChanges?: { field: string; value: string }[]
  uploadedImages?: { url: string; publicId: string }[]
  uploadedLogo?: { url: string; publicId: string }
  customizationNotes?: string
}

export interface CartItem {
  id: string // Original product ID
  cartItemId: string // Unique cart item ID (includes customizations)
  name: string
  price: number
  originalPrice?: number
  image: string
  quantity: number
  category?: string
  customizations?: CartItemCustomization
}

interface CartState {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  totalSavings: number
  subtotal: number
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity' | 'cartItemId'> }
  | { type: 'REMOVE_ITEM'; payload: string } // cartItemId
  | { type: 'UPDATE_QUANTITY'; payload: { cartItemId: string; quantity: number } }
  | { type: 'UPDATE_CUSTOMIZATIONS'; payload: { cartItemId: string; customizations: CartItemCustomization } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] }

const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  totalSavings: 0,
  subtotal: 0,
}

function calculateTotals(state: CartState): CartState {
  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0)

  // Calculate subtotal using original prices (before discounts)
  const subtotal = state.items.reduce((sum, item) => {
    const originalPrice = item.originalPrice || item.price
    return sum + originalPrice * item.quantity
  }, 0)

  // Calculate total savings from discounts
  const totalSavings = state.items.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + (item.originalPrice - item.price) * item.quantity
    }
    return sum
  }, 0)

  // Final total is subtotal minus savings
  const finalTotal = subtotal - totalSavings

  return {
    ...state,
    totalItems,
    totalPrice: finalTotal, // Keep totalPrice as final total for backward compatibility
    totalSavings,
    subtotal,
  }
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      // Create a unique cartItemId that includes customizations
      const cartItemId = action.payload.customizations
        ? `${action.payload.id}-${JSON.stringify(action.payload.customizations)}`
        : action.payload.id

      const existingItem = state.items.find((item) => item.cartItemId === cartItemId)

      if (existingItem) {
        const updatedItems = state.items.map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        )
        return calculateTotals({ ...state, items: updatedItems })
      } else {
        const newItem: CartItem = { ...action.payload, cartItemId, quantity: 1 }
        const updatedItems = [...state.items, newItem]
        return calculateTotals({ ...state, items: updatedItems })
      }
    }

    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter((item) => item.cartItemId !== action.payload)
      return calculateTotals({ ...state, items: updatedItems })
    }

    case 'UPDATE_QUANTITY': {
      const { cartItemId, quantity } = action.payload

      if (quantity <= 0) {
        const updatedItems = state.items.filter((item) => item.cartItemId !== cartItemId)
        return calculateTotals({ ...state, items: updatedItems })
      } else {
        const updatedItems = state.items.map((item) => (item.cartItemId === cartItemId ? { ...item, quantity } : item))
        return calculateTotals({ ...state, items: updatedItems })
      }
    }

    case 'UPDATE_CUSTOMIZATIONS': {
      const { cartItemId, customizations } = action.payload
      const updatedItems = state.items.map((item) =>
        item.cartItemId === cartItemId ? { ...item, customizations } : item
      )
      return calculateTotals({ ...state, items: updatedItems })
    }

    case 'CLEAR_CART':
      return initialState

    case 'LOAD_CART':
      return calculateTotals({ ...state, items: action.payload })

    default:
      return state
  }
}

const CART_STORAGE_KEY = 'prestige_cart'

function saveCartToStorage(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error)
  }
}

function loadCartFromStorage(): CartItem[] {
  try {
    const cartData = localStorage.getItem(CART_STORAGE_KEY)
    if (!cartData) return []

    const items = JSON.parse(cartData)

    // Migrate existing cart items to include cartItemId
    const migratedItems = items.map((item: Partial<CartItem> & { id: string }) => {
      if (!item.cartItemId) {
        // Generate cartItemId for existing items
        const cartItemId = item.customizations ? `${item.id}-${JSON.stringify(item.customizations)}` : item.id
        return { ...item, cartItemId } as CartItem
      }
      return item as CartItem
    })

    return migratedItems
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error)
    return []
  }
}

interface CartContextType {
  state: CartState
  addItem: (item: Omit<CartItem, 'quantity' | 'cartItemId'>) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  updateCustomizations: (cartItemId: string, customizations: CartItemCustomization) => void
  clearCart: () => void
  getItemQuantity: (id: string) => number
  isInCart: (id: string) => boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    try {
      const savedCart = loadCartFromStorage()
      if (savedCart.length > 0) {
        dispatch({ type: 'LOAD_CART', payload: savedCart })
      }
    } catch (error) {
      console.error('Failed to initialize cart:', error)
      // Clear corrupted cart data
      localStorage.removeItem(CART_STORAGE_KEY)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  useEffect(() => {
    saveCartToStorage(state.items)
  }, [state.items])

  const addItem = (item: Omit<CartItem, 'quantity' | 'cartItemId'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item })
  }

  const removeItem = async (cartItemId: string) => {
    // Clean up uploaded images from Cloudinary before removing item
    const item = state.items.find((item) => item.cartItemId === cartItemId)
    if (item?.customizations) {
      try {
        // Delete uploaded images
        if (item.customizations.uploadedImages) {
          for (const image of item.customizations.uploadedImages) {
            await fetch('/api/upload/customer', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicId: image.publicId }),
            })
          }
        }

        // Delete uploaded logo
        if (item.customizations.uploadedLogo) {
          await fetch('/api/upload/customer', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicId: item.customizations.uploadedLogo.publicId }),
          })
        }
      } catch (error) {
        console.error('Failed to cleanup images:', error)
      }
    }

    dispatch({ type: 'REMOVE_ITEM', payload: cartItemId })
  }

  const updateQuantity = (cartItemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { cartItemId, quantity } })
  }

  const updateCustomizations = (cartItemId: string, customizations: CartItemCustomization) => {
    dispatch({ type: 'UPDATE_CUSTOMIZATIONS', payload: { cartItemId, customizations } })
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
  }

  const getItemQuantity = (id: string): number => {
    // For quantity check, we sum all items with the same product ID regardless of customizations
    const itemsWithSameId = state.items.filter((item) => item.id === id)
    return itemsWithSameId.reduce((total, item) => total + item.quantity, 0)
  }

  const isInCart = (id: string): boolean => {
    return state.items.some((item) => item.id === id)
  }

  const value: CartContextType = {
    state,
    addItem,
    removeItem,
    updateQuantity,
    updateCustomizations,
    clearCart,
    getItemQuantity,
    isInCart,
  }

  // Don't render children until cart is initialized
  if (!isInitialized) {
    return <div style={{ display: 'none' }}>Loading cart...</div>
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
