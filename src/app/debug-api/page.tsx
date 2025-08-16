'use client'

import { useState } from 'react'
import CustomerLayout from '@/app/customer-layout'

export default function DebugAPIPage() {
  const [slug, setSlug] = useState('')
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const testAPI = async () => {
    if (!slug.trim()) {
      setError('Please enter a product slug')
      return
    }

    try {
      setLoading(true)
      setError('')
      setApiResponse(null)

      console.log('🧪 Testing API with slug:', slug)

      const response = await fetch(`/api/products/${slug}`)
      const data = await response.json()

      console.log('📡 API Response:', data)
      setApiResponse(data)

      if (!response.ok) {
        setError(data.message || 'API request failed')
      }
    } catch (error) {
      console.error('❌ API Test Error:', error)
      setError('Failed to test API')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CustomerLayout>
      <div className="container">
        <h1>🔍 API Debug Tool</h1>

        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="slug" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Product Slug:
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Enter product slug..."
            style={{
              padding: '0.5rem',
              width: '300px',
              marginRight: '1rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />
          <button
            onClick={testAPI}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#8261c6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Testing...' : 'Test API'}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
            ❌ {error}
          </div>
        )}

        {apiResponse && (
          <div>
            <h2>📡 API Response:</h2>
            <div
              style={{
                backgroundColor: '#f5f5f5',
                padding: '1rem',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '600px',
              }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(apiResponse, null, 2)}</pre>
            </div>

            {apiResponse.data && (
              <div style={{ marginTop: '2rem' }}>
                <h3>📦 Product Data Summary:</h3>
                <ul>
                  <li>
                    <strong>ID:</strong> {apiResponse.data._id}
                  </li>
                  <li>
                    <strong>Name:</strong> {apiResponse.data.name}
                  </li>
                  <li>
                    <strong>Slug:</strong> {apiResponse.data.slug}
                  </li>
                  <li>
                    <strong>Images:</strong> {apiResponse.data.images?.length || 0} images
                  </li>
                  <li>
                    <strong>Price:</strong> ${apiResponse.data.price}
                  </li>
                  <li>
                    <strong>Final Price:</strong> ${apiResponse.data.finalPrice}
                  </li>
                  <li>
                    <strong>Category:</strong> {apiResponse.data.category?.name || 'N/A'}
                  </li>
                  <li>
                    <strong>Is On Sale:</strong> {apiResponse.data.isOnSale ? 'Yes' : 'No'}
                  </li>
                </ul>

                {apiResponse.data.images && apiResponse.data.images.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4>🖼️ Images:</h4>
                    <ul>
                      {apiResponse.data.images.map((image: string, index: number) => (
                        <li key={index}>
                          <strong>Image {index + 1}:</strong> {image || 'Empty string'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {apiResponse.relatedProducts && apiResponse.relatedProducts.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4>🔗 Related Products ({apiResponse.relatedProducts.length}):</h4>
                    <ul>
                      {apiResponse.relatedProducts.map((product: any, index: number) => (
                        <li key={index}>
                          <strong>{product.name}</strong> - {product.images?.length || 0} images
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}
