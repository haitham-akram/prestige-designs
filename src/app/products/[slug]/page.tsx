'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar, faHeart, faShare, faImage } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import CustomerLayout from '@/app/customer-layout'
import AddToCartButton from '@/components/ui/AddToCartButton'
import Breadcrumb from '@/components/ui/Breadcrumb'
import CustomizationForm, { CustomizationFormRef } from '@/components/ui/CustomizationForm'
import { CartItemCustomization } from '@/contexts/CartContext'
import ColorPicker from '@/components/ui/ColorPicker'
import './product-details.css'

interface ProductImage {
  url: string
  alt: string
  isPrimary: boolean
  order: number
}

interface ProductColor {
  name: string
  hex: string
}

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  images: ProductImage[]
  youtubeLink?: string
  EnableCustomizations: boolean
  allowColorChanges: boolean
  allowTextEditing: boolean
  allowImageReplacement: boolean
  allowLogoUpload: boolean
  colors: ProductColor[]
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
  images: ProductImage[]
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
  const [customizations, setCustomizations] = useState<CartItemCustomization>({})
  const customizationFormRef = useRef<CustomizationFormRef>(null)

  // Add debug logging for customizations changes
  const handleCustomizationsChange = (newCustomizations: CartItemCustomization) => {
    console.log('📝 Product page - customizations updated:', {
      newCustomizations,
      hasLogo: !!newCustomizations.uploadedLogo,
      logoData: newCustomizations.uploadedLogo,
    })
    setCustomizations(newCustomizations)
  }

  // Function to convert YouTube URL to embed URL
  const getYouTubeEmbedUrl = (url: string): string => {
    if (!url) return ''

    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`
      }
    }

    // If no pattern matches, return the original URL
    return url
  }

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        console.log('🔍 Fetching product with slug:', slug)

        const response = await fetch(`/api/products/${slug}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Product not found')
        }

        setProduct(data.data)
        setRelatedProducts(data.relatedProducts || [])
      } catch (error) {
        console.error('❌ Error fetching product:', error)
        setError('Failed to load product. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchProduct()
    }
  }, [slug])

  if (loading) {
    return (
      <div className="pd-full-page-loading">
        <div className="pd-loading-text">جاري تحميل المنتج...</div>
        <div className="pd-loading-dots">
          <div className="pd-loading-dot"></div>
          <div className="pd-loading-dot"></div>
          <div className="pd-loading-dot"></div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <CustomerLayout>
        <div className="container">
          <div className="pd-error-container">
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

  // Handle adding to cart and resetting form
  const handleAddToCart = () => {
    // Reset the customization form
    customizationFormRef.current?.resetForm()
    // Clear the customizations state
    setCustomizations({})
  }

  return (
    <CustomerLayout>
      <div className="container">
        {/* Breadcrumb */}
        <div className="pd-breadcrumb">
          <Breadcrumb
            items={[
              { label: 'الرئيسية', href: '/' },
              { label: product.category.name, href: `/categories/${product.category.slug}` },
              { label: product.name, isActive: true },
            ]}
          />
        </div>

        {/* Product Details */}
        <div className="pd-product-details">
          <div className="pd-product-gallery">
            {/* Main Image */}
            <div className="pd-main-image-container">
              {product.images && product.images.length > 0 && product.images[selectedImage] ? (
                <Image
                  src={product.images[selectedImage].url}
                  alt={product.name}
                  width={500}
                  height={500}
                  className="pd-main-image"
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <div className="pd-no-image-placeholder">
                  <FontAwesomeIcon icon={faImage} style={{ fontSize: '4rem', color: 'var(--text-secondary)' }} />
                  <p>لا توجد صورة متاحة</p>
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="pd-thumbnail-images">
                {product.images.map(
                  (image, index) =>
                    image && (
                      <button
                        key={index}
                        className={`pd-thumbnail ${selectedImage === index ? 'active' : ''}`}
                        onClick={() => setSelectedImage(index)}
                      >
                        <Image
                          src={image.url}
                          alt={image.alt || `${product.name} - ${index + 1}`}
                          width={80}
                          height={80}
                          style={{ objectFit: 'contain' }}
                        />
                      </button>
                    )
                )}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="pd-product-description">
                <h3>وصف المنتج</h3>
                <div className="pd-description-content" dangerouslySetInnerHTML={{ __html: product.description }} />
              </div>
            )}
          </div>

          <div className="pd-product-info">
            <h1 className="pd-product-title">{product.name}</h1>

            {/* YouTube Link */}
            {product.youtubeLink && (
              <div className="pd-youtube-section">
                <div className="pd-youtube-embed">
                  <iframe
                    src={getYouTubeEmbedUrl(product.youtubeLink)}
                    title={product.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Rating */}
            <div className="pd-product-rating">
              <div className="pd-stars">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < Math.floor(product.rating) ? 'pd-star filled' : 'pd-star'}>
                    <FontAwesomeIcon icon={faStar} />
                  </span>
                ))}
              </div>
              <span className="pd-rating-text">{product.rating}</span>
              <span className="pd-review-count">({product.reviewCount} تقييم)</span>
            </div>

            {/* Pricing */}
            <div className="pd-product-pricing">
              <div className="pd-pricing-row">
                <div className="pd-prices-column">
                  <span className="pd-current-price">${product.finalPrice}</span>
                  {product.isOnSale && <span className="pd-original-price">${product.price}</span>}
                </div>
                <div className="pd-discount-savings-column">
                  {product.isOnSale && (
                    <>
                      <span className="pd-discount-text">{discountPercentage}% خصم</span>
                      <span className="pd-savings-badge">وفرت ${(product.price - product.finalPrice).toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Customization Form */}
            {product.EnableCustomizations && (
              <div className="pd-customization-form-wrapper">
                <h3>خيارات التخصيص</h3>
                <CustomizationForm
                  ref={customizationFormRef}
                  productId={product._id}
                  colors={product.colors}
                  allowColorChanges={product.allowColorChanges}
                  allowTextEditing={product.allowTextEditing}
                  allowImageReplacement={product.allowImageReplacement}
                  allowLogoUpload={product.allowLogoUpload}
                  onCustomizationChange={handleCustomizationsChange}
                  initialCustomizations={customizations}
                />
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="pd-product-tags">
                <h3>العلامات</h3>
                <div className="pd-tags-grid">
                  {product.tags.map((tag, index) => (
                    <span key={index} className="pd-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Colors - Displayed above Add to Cart */}
            {((product.colors && product.colors.length > 0) || product.allowColorChanges) && (
              <div className="pd-product-colors">
                <h3>الألوان المتاحة لتخصيص التصميم</h3>
                <div className="pd-colors-grid">
                  {/* Predefined Colors - Only show if they exist */}
                  {product.colors &&
                    product.colors.length > 0 &&
                    product.colors.map((color, index) => {
                      const isSelected = customizations.colors?.some((c) => c.hex === color.hex) || false
                      return (
                        <div
                          key={`predefined-${index}`}
                          className={`pd-color-option ${isSelected ? 'selected' : ''}`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                          onClick={() => {
                            // Handle color selection for customizations
                            const currentColors = customizations.colors || []
                            const colorExists = currentColors.find((c) => c.hex === color.hex)
                            let newColors

                            if (colorExists) {
                              newColors = currentColors.filter((c) => c.hex !== color.hex)
                            } else {
                              newColors = [...currentColors, { name: color.name, hex: color.hex }]
                            }

                            setCustomizations({
                              ...customizations,
                              colors: newColors,
                            })
                          }}
                        />
                      )
                    })}

                  {/* Color Picker - Only show if color changes are allowed */}
                  {product.allowColorChanges && (
                    <ColorPicker
                      onColorSelect={(customColor) => {
                        const currentColors = customizations.colors || []
                        const colorExists = currentColors.find((c) => c.hex === customColor.hex)
                        let newColors

                        if (colorExists) {
                          newColors = currentColors.filter((c) => c.hex !== customColor.hex)
                        } else {
                          newColors = [...currentColors, customColor]
                        }

                        setCustomizations({
                          ...customizations,
                          colors: newColors,
                        })
                      }}
                    />
                  )}

                  {/* Custom Colors Display - Only show if color changes are allowed */}
                  {product.allowColorChanges &&
                    customizations.colors
                      ?.filter((color) => color.name === 'custom color')
                      .map((customColor, index) => {
                        const isSelected = customizations.colors?.some((c) => c.hex === customColor.hex) || false
                        return (
                          <div
                            key={`custom-${index}`}
                            className={`pd-color-option ${isSelected ? 'selected' : ''}`}
                            style={{ backgroundColor: customColor.hex }}
                            title={`Custom Color: ${customColor.hex}`}
                            onClick={() => {
                              // Handle custom color selection
                              const currentColors = customizations.colors || []
                              const colorExists = currentColors.find((c) => c.hex === customColor.hex)
                              let newColors

                              if (colorExists) {
                                newColors = currentColors.filter((c) => c.hex !== customColor.hex)
                              } else {
                                newColors = [...currentColors, customColor]
                              }

                              setCustomizations({
                                ...customizations,
                                colors: newColors,
                              })
                            }}
                          />
                        )
                      })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pd-product-actions">
              {(() => {
                console.log('🔍 Product data passed to AddToCartButton:', {
                  productName: product.name,
                  EnableCustomizations: product.EnableCustomizations,
                  customizationsObjectKeysLength: Object.keys(customizations).length,
                  customizations: customizations,
                  hasLogo: !!customizations.uploadedLogo,
                  logoData: customizations.uploadedLogo,
                  willPassCustomizations: Object.keys(customizations).length > 0 ? customizations : undefined,
                })
                return null
              })()}
              <AddToCartButton
                product={{
                  id: product._id,
                  _id: product._id,
                  name: product.name,
                  price: product.finalPrice,
                  finalPrice: product.finalPrice,
                  originalPrice: product.price,
                  image: product.images?.[0]?.url || '/placeholder-product.jpg',
                  category: product.category?.name,
                  customizations: Object.keys(customizations).length > 0 ? customizations : undefined,
                  EnableCustomizations: product.EnableCustomizations,
                  colors: product.colors || [],
                }}
                onAddToCart={handleAddToCart}
              />
              <div className="pd-action-buttons">
                <button className="pd-action-btn" title="إضافة للمفضلة">
                  <FontAwesomeIcon icon={faHeart} />
                </button>
                <button className="pd-action-btn" title="مشاركة">
                  <FontAwesomeIcon icon={faShare} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="pd-related-products">
            <h2>منتجات مشابهة</h2>
            <div className="pd-products-grid">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct._id}
                  href={`/products/${relatedProduct.slug}`}
                  className="pd-product-card card"
                >
                  <div className="product-image">
                    {relatedProduct.images && relatedProduct.images.length > 0 && relatedProduct.images[0] ? (
                      <Image
                        src={relatedProduct.images[0].url}
                        alt={relatedProduct.images[0].alt || relatedProduct.name}
                        width={300}
                        height={300}
                        loading="lazy"
                        className="product-img"
                        style={{ objectFit: 'contain' }}
                      />
                    ) : (
                      <div className="pd-no-image-placeholder">
                        <FontAwesomeIcon icon={faImage} style={{ fontSize: '2rem', color: 'var(--text-secondary)' }} />
                        <p>لا توجد صورة</p>
                      </div>
                    )}
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
    </CustomerLayout>
  )
}
