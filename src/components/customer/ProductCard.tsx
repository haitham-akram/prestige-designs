'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faHeart, faShare, faStar } from '@fortawesome/free-solid-svg-icons'
import AddToCartButton from '@/components/ui/AddToCartButton'

interface Product {
  id: string
  _id?: string
  name: string
  slug?: string
  price: number
  originalPrice: number
  rating: number
  image: string
  category: string
  EnableCustomizations?: boolean
}

interface ProductCardProps {
  product: Product & { colors?: { name: string; hex: string }[] }
}

export default function ProductCard({ product }: ProductCardProps) {
  const discountPercentage = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)

  // Ensure we have a slug for routing
  if (!product.slug) {
    console.error('Product missing slug:', product)
    return null // Don't render if no slug
  }

  return (
    <Link href={`/products/${product.slug}`} className="product-card card">
      <div className="product-image">
        <Image
          src={product.image}
          alt={product.name}
          width={300}
          height={300}
          loading="lazy"
          className="product-img"
          style={{ objectFit: 'contain' }}
        />
        {/* <div className="product-overlay">
          <button className="preview-btn" title="معاينة">
            <FontAwesomeIcon icon={faPlay} />
          </button>
        </div> */}
      </div>

      <div className="product-content">
        <h3 className="product-name">{product.name}</h3>

        <div className="product-rating">
          <div className="stars">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < Math.floor(product.rating) ? 'star filled' : 'star'}>
                <FontAwesomeIcon icon={faStar} />
              </span>
            ))}
          </div>
          <span className="rating-text">{product.rating}</span>
        </div>

        <div className="product-pricing">
          <div className="pricing-row">
            {/* Right Column: Prices */}
            <div className="prices-column">
              <span className="current-price">${product.price}</span>
              {product.originalPrice > product.price && (
                <span className="original-price">${product.originalPrice}</span>
              )}
            </div>
            {/* Left Column: Discount & Savings */}
            <div className="discount-savings-column">
              {discountPercentage > 0 && (
                <>
                  <span className="discount-text">{discountPercentage}% خصم</span>
                  <span className="savings-badge">وفرت ${(product.originalPrice - product.price).toFixed(2)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="product-actions" onClick={(e) => e.stopPropagation()}>
          <AddToCartButton product={product} />
          <div className="action-buttons">
            <button className="action-btn" title="إضافة للمفضلة" onClick={(e) => e.stopPropagation()}>
              <FontAwesomeIcon icon={faHeart} />
            </button>
            <button className="action-btn" title="مشاركة" onClick={(e) => e.stopPropagation()}>
              <FontAwesomeIcon icon={faShare} />
            </button>
          </div>
        </div>

        <style jsx>{`
          .product-actions {
            position: relative;
            z-index: 10;
          }

          .action-btn {
            cursor: pointer;
          }

          .action-btn:hover {
            transform: scale(1.1);
          }
        `}</style>
      </div>
    </Link>
  )
}
