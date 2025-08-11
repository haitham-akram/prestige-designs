'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'

export interface CartItem {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  quantity: number
  category?: string
}

interface CartState {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  totalSavings: number
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] }

const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  totalSavings: 0,
}

function calculateTotals(state: CartState): CartState {
  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalSavings = state.items.reduce((sum, item) => {
    if (item.originalPrice) {
      return sum + (item.originalPrice - item.price) * item.quantity
    }
    return sum
  }, 0)

  return { ...state, totalItems, totalPrice, totalSavings }
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find((item) => item.id === action.payload.id)

      if (existingItem) {
        const updatedItems = state.items.map((item) =>
          item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item
        )
        return calculateTotals({ ...state, items: updatedItems })
      } else {
        const newItem: CartItem = { ...action.payload, quantity: 1 }
        const updatedItems = [...state.items, newItem]
        return calculateTotals({ ...state, items: updatedItems })
      }
    }

    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter((item) => item.id !== action.payload)
      return calculateTotals({ ...state, items: updatedItems })
    }

    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload

      if (quantity <= 0) {
        const updatedItems = state.items.filter((item) => item.id !== id)
        return calculateTotals({ ...state, items: updatedItems })
      } else {
        const updatedItems = state.items.map((item) => (item.id === id ? { ...item, quantity } : item))
        return calculateTotals({ ...state, items: updatedItems })
      }
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
    return cartData ? JSON.parse(cartData) : []
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error)
    return []
  }
}

interface CartContextType {
  state: CartState
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (id: string) => number
  isInCart: (id: string) => boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  useEffect(() => {
    const savedCart = loadCartFromStorage()
    if (savedCart.length > 0) {
      dispatch({ type: 'LOAD_CART', payload: savedCart })
    }
  }, [])

  useEffect(() => {
    saveCartToStorage(state.items)
  }, [state.items])

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item })
  }

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id })
  }

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } })
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
  }

  const getItemQuantity = (id: string): number => {
    const item = state.items.find((item) => item.id === id)
    return item ? item.quantity : 0
  }

  const isInCart = (id: string): boolean => {
    return state.items.some((item) => item.id === id)
  }

  const value: CartContextType = {
    state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
    isInCart,
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
