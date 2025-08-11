'use client'

import { useEffect, useState } from 'react'
import ProductCard from './ProductCard'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Product {
  _id: string
  id?: string
  name: string
  slug: string
  price: number
  finalPrice: number
  rating: number
  images: string[]
  category: string
  isFeatured?: boolean
}

interface ProductGridProps {
  category?: string
  limit?: number
  featured?: boolean
}

export default function ProductGrid({ category, limit = 4, featured = false }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [category, limit, featured])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: limit.toString(),
        isActive: 'true',
      })

      if (category) {
        params.append('category', category)
      }

      if (featured) {
        params.append('isFeatured', 'true')
      }

      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch products')
      }

      // Transform API data to match ProductCard interface
      const transformedProducts = (data.data || []).map((product: any) => ({
        _id: product._id,
        id: product._id, // For backward compatibility
        name: product.name,
        slug: product.slug, // This is the important field for routing
        price: product.finalPrice || product.price, // Use finalPrice if available
        originalPrice: product.price, // Original price
        finalPrice: product.finalPrice,
        rating: product.rating || 0,
        image: product.images?.[0] || '/placeholder-product.jpg',
        images: product.images || [],
        category: product.category?.name || '',
        isFeatured: product.isFeatured,
      }))

      setProducts(transformedProducts)
    } catch (error) {
      console.error('Error fetching products:', error)
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="products-grid">
        {Array.from({ length: limit }, (_, i) => (
          <div key={i} className="product-card card loading">
            <div className="product-image">
              <div className="loading-placeholder" />
            </div>
            <div className="product-content">
              <div className="loading-placeholder" style={{ height: '1.2rem', marginBottom: '0.5rem' }} />
              <div className="loading-placeholder" style={{ height: '1rem', width: '60%' }} />
            </div>
          </div>
        ))}
        <style jsx>{`
          .loading-placeholder {
            background: linear-gradient(
              90deg,
              var(--color-dark-secondary) 25%,
              var(--color-border) 50%,
              var(--color-dark-secondary) 75%
            );
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 4px;
          }

          @keyframes loading {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }

          .product-card.loading {
            pointer-events: none;
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-message">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="products-grid">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  )
}
