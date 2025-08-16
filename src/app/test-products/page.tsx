'use client'

import { useEffect, useState } from 'react'

interface Product {
  _id: string
  name: string
  slug: string
  isActive: boolean
}

export default function TestProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/products?limit=20')
      const data = await response.json()

      if (response.ok) {
        setProducts(data.data || [])
      } else {
        console.error('Failed to fetch products:', data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test Products Page</h1>
      <p>Total products: {products.length}</p>

      <div style={{ marginTop: '2rem' }}>
        <h2>Products with slugs:</h2>
        {products
          .filter((p) => p.slug)
          .map((product) => (
            <div
              key={product._id}
              style={{
                border: '1px solid #ccc',
                padding: '1rem',
                margin: '0.5rem 0',
                backgroundColor: product.isActive ? '#e8f5e8' : '#ffe8e8',
              }}
            >
              <strong>{product.name}</strong>
              <br />
              <code>Slug: {product.slug}</code>
              <br />
              <span>Active: {product.isActive ? 'Yes' : 'No'}</span>
              <br />
              <a href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer">
                View Product Details
              </a>
            </div>
          ))}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Products without slugs:</h2>
        {products
          .filter((p) => !p.slug)
          .map((product) => (
            <div
              key={product._id}
              style={{
                border: '1px solid #ccc',
                padding: '1rem',
                margin: '0.5rem 0',
                backgroundColor: '#ffe8e8',
              }}
            >
              <strong>{product.name}</strong>
              <br />
              <span style={{ color: 'red' }}>No slug!</span>
              <br />
              <span>Active: {product.isActive ? 'Yes' : 'No'}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
