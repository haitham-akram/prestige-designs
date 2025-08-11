'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar, faHeart, faShare, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import CustomerLayout from '@/app/customer-layout'
import AddToCartButton from '@/components/ui/AddToCartButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import Breadcrumb from '@/components/ui/Breadcrumb'

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  images: string[]
  youtubeLink?: string
  EnableCustomizations: boolean
  allowColorChanges: boolean
  allowTextEditing: boolean
  allowImageReplacement: boolean
  allowLogoUpload: boolean
  colors: string[]
  category: {
    _id: string
    name: string
    slug: string
  }
  tags: string[]
  price: number
  discountAmount: number
  discountPercentage: number
  finalPrice: number
  isFeatured: boolean
  rating: number
  reviewCount: number
  purchaseCount: number
  calculatedDiscountPercentage: number
  isOnSale: boolean
}

interface RelatedProduct {
  _id: string
  name: string
  slug: string
  price: number
  finalPrice: number
  images: string[]
  rating: number
}

export default function ProductDetailsPage() {
  const params = useParams()
  const slug = params?.slug as string
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    if (slug) {
      fetchProduct()
    }
  }, [slug])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${slug}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Product not found')
      }

      setProduct(data.data)
      setRelatedProducts(data.relatedProducts || [])
    } catch (error) {
      console.error('Error fetching product:', error)
      setError('Failed to load product. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <CustomerLayout>
        <div className="container">
          <div className="loading-container">
            <LoadingSpinner />
            <p>جاري تحميل المنتج...</p>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  if (error || !product) {
    return (
      <CustomerLayout>
        <div className="container">
          <div className="error-container">
            <h2>خطأ في تحميل المنتج</h2>
            <p>{error || 'المنتج غير موجود'}</p>
            <Link href="/" className="btn btn-primary">
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  const discountPercentage = Math.round(((product.price - product.finalPrice) / product.price) * 100)

  return (
    <CustomerLayout>
      <div className="container">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'الرئيسية', href: '/' },
            { label: product.category.name, href: `/categories/${product.category.slug}` },
            { label: product.name, isActive: true },
          ]}
        />

        {/* Product Details */}
        <div className="product-details">
          <div className="product-gallery">
            {/* Main Image */}
            <div className="main-image-container">
              <Image
                src={product.images?.[selectedImage] || '/placeholder-product.jpg'}
                alt={product.name}
                width={500}
                height={500}
                className="main-image"
                style={{ objectFit: 'contain' }}
              />
            </div>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="thumbnail-images">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} - ${index + 1}`}
                      width={80}
                      height={80}
                      style={{ objectFit: 'contain' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <h1 className="product-title">{product.name}</h1>

            {/* Rating */}
            <div className="product-rating">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < Math.floor(product.rating) ? 'star filled' : 'star'}>
                    <FontAwesomeIcon icon={faStar} />
                  </span>
                ))}
              </div>
              <span className="rating-text">{product.rating}</span>
              <span className="review-count">({product.reviewCount} تقييم)</span>
            </div>

            {/* Pricing */}
            <div className="product-pricing">
              <div className="pricing-row">
                <div className="prices-column">
                  <span className="current-price">${product.finalPrice}</span>
                  {product.isOnSale && <span className="original-price">${product.price}</span>}
                </div>
                <div className="discount-savings-column">
                  {product.isOnSale && (
                    <>
                      <span className="discount-text">{discountPercentage}% خصم</span>
                      <span className="savings-badge">وفرت ${(product.price - product.finalPrice).toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="product-description">
                <h3>الوصف</h3>
                <p>{product.description}</p>
              </div>
            )}

            {/* Customization Options */}
            {product.EnableCustomizations && (
              <div className="customization-options">
                <h3>خيارات التخصيص</h3>
                <div className="options-grid">
                  {product.allowColorChanges && (
                    <div className="option-item">
                      <span className="option-icon">🎨</span>
                      <span>تغيير الألوان</span>
                    </div>
                  )}
                  {product.allowTextEditing && (
                    <div className="option-item">
                      <span className="option-icon">✏️</span>
                      <span>تعديل النصوص</span>
                    </div>
                  )}
                  {product.allowImageReplacement && (
                    <div className="option-item">
                      <span className="option-icon">🖼️</span>
                      <span>استبدال الصور</span>
                    </div>
                  )}
                  {product.allowLogoUpload && (
                    <div className="option-item">
                      <span className="option-icon">🏷️</span>
                      <span>رفع الشعار</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="product-colors">
                <h3>الألوان المتاحة</h3>
                <div className="colors-grid">
                  {product.colors.map((color, index) => (
                    <div key={index} className="color-option" style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="product-tags">
                <h3>العلامات</h3>
                <div className="tags-grid">
                  {product.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="product-actions">
              <AddToCartButton product={product} />
              <div className="action-buttons">
                <button className="action-btn" title="إضافة للمفضلة">
                  <FontAwesomeIcon icon={faHeart} />
                </button>
                <button className="action-btn" title="مشاركة">
                  <FontAwesomeIcon icon={faShare} />
                </button>
              </div>
            </div>

            {/* YouTube Link */}
            {product.youtubeLink && (
              <div className="youtube-section">
                <h3>فيديو تعريفي</h3>
                <div className="youtube-embed">
                  <iframe
                    src={product.youtubeLink.replace('watch?v=', 'embed/')}
                    title={product.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="related-products">
            <h2>منتجات مشابهة</h2>
            <div className="products-grid">
              {relatedProducts.map((relatedProduct) => (
                <Link key={relatedProduct._id} href={`/products/${relatedProduct.slug}`} className="product-card card">
                  <div className="product-image">
                    <Image
                      src={relatedProduct.images[0] || '/placeholder-product.jpg'}
                      alt={relatedProduct.name}
                      width={300}
                      height={300}
                      loading="lazy"
                      className="product-img"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <div className="product-content">
                    <h3 className="product-name">{relatedProduct.name}</h3>
                    <div className="product-rating">
                      <div className="stars">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={i < Math.floor(relatedProduct.rating) ? 'star filled' : 'star'}>
                            <FontAwesomeIcon icon={faStar} />
                          </span>
                        ))}
                      </div>
                      <span className="rating-text">{relatedProduct.rating}</span>
                    </div>
                    <div className="product-pricing">
                      <span className="current-price">${relatedProduct.finalPrice}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 1rem;
        }

        .error-container {
          text-align: center;
          padding: 2rem;
          min-height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }

        .product-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          margin-bottom: 4rem;
        }

        .product-gallery {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .main-image-container {
          border-radius: 12px;
          overflow: hidden;
          background: var(--color-dark-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .main-image {
          max-width: 100%;
          height: auto;
        }

        .thumbnail-images {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .thumbnail {
          border: 2px solid transparent;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: border-color 0.3s ease;
          background: var(--color-dark-secondary);
          padding: 0.25rem;
        }

        .thumbnail.active {
          border-color: var(--color-primary);
        }

        .thumbnail img {
          border-radius: 4px;
        }

        .product-info {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .product-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }

        .product-rating {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .stars {
          display: flex;
          gap: 0.25rem;
        }

        .star {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }

        .star.filled {
          color: #ffd700;
        }

        .rating-text {
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .review-count {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }

        .product-pricing {
          background: var(--color-dark-secondary);
          padding: 1.5rem;
          border-radius: 12px;
        }

        .pricing-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .prices-column {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .current-price {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-primary);
        }

        .original-price {
          font-size: 1.2rem;
          color: var(--color-text-secondary);
          text-decoration: line-through;
        }

        .discount-savings-column {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        .discount-text {
          background: var(--color-primary);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .savings-badge {
          background: #22c55e;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .product-description h3,
        .customization-options h3,
        .product-colors h3,
        .product-tags h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: 0.5rem;
        }

        .product-description p {
          color: var(--color-text-secondary);
          line-height: 1.6;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .option-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--color-dark-secondary);
          border-radius: 8px;
          color: var(--color-text-primary);
        }

        .option-icon {
          font-size: 1.2rem;
        }

        .colors-grid {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .color-option {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid var(--color-border);
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .color-option:hover {
          transform: scale(1.1);
        }

        .tags-grid {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .tag {
          background: var(--color-dark-secondary);
          color: var(--color-text-primary);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
        }

        .product-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          width: 48px;
          height: 48px;
          border: 2px solid var(--color-border);
          background: var(--color-dark-secondary);
          color: var(--color-text-primary);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .youtube-section {
          margin-top: 2rem;
        }

        .youtube-embed {
          position: relative;
          width: 100%;
          height: 0;
          padding-bottom: 56.25%;
          border-radius: 12px;
          overflow: hidden;
        }

        .youtube-embed iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .related-products {
          margin-top: 4rem;
        }

        .related-products h2 {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 2rem;
          text-align: center;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
        }

        @media (max-width: 768px) {
          .product-details {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .product-title {
            font-size: 1.5rem;
          }

          .current-price {
            font-size: 1.5rem;
          }

          .pricing-row {
            flex-direction: column;
            gap: 1rem;
          }

          .discount-savings-column {
            align-items: flex-start;
          }

          .options-grid {
            grid-template-columns: 1fr;
          }

          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
          }
        }
      `}</style>
    </CustomerLayout>
  )
}
