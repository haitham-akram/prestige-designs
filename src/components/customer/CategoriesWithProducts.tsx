'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ProductCard from './ProductCard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
// Types
interface Product {
  _id: string
  name: string
  slug: string
  description?: string
  images: Array<{
    url: string
    alt?: string
    isPrimary: boolean
    order: number
  }>
  price: number
  finalPrice: number
  discountPercentage?: number
  rating: number
  reviewCount: number
  isActive: boolean
  isFeatured: boolean
}

interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
  order: number
  isFeatured: boolean
  designCount: number
  viewCount: number
}

interface CategoryWithProducts extends Category {
  products: Product[]
}

// Animated Section Component
function AnimatedSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 })

  return (
    <section
      ref={elementRef as React.RefObject<HTMLElement>}
      className={`section animated-section ${isVisible ? 'animate-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </section>
  )
}

// Animated Element Component
function AnimatedElement({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  animation?: 'fade-up' | 'fade-left' | 'fade-right' | 'scale-up' | 'rotate-in'
  delay?: number
}) {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.2 })

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={`scroll-animation ${animation} ${isVisible ? 'visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function CategoriesWithProducts() {
  const [categories, setCategories] = useState<CategoryWithProducts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCategoriesWithProducts()
  }, [])

  const fetchCategoriesWithProducts = async () => {
    try {
      setLoading(true)
      const startTime = Date.now()
      console.log('🚀 Starting full page data fetch...')

      // Fetch categories
      const categoriesResponse = await fetch('/api/categories')
      const categoriesData = await categoriesResponse.json()

      console.log('📂 Categories response:', categoriesData)

      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories')
      }

      if (!categoriesData.data || !Array.isArray(categoriesData.data)) {
        console.error('❌ Invalid categories data:', categoriesData)
        setError('Invalid categories data received')
        return
      }

      const activeCategories = categoriesData.data
      console.log('✅ Active categories:', activeCategories.length)

      if (activeCategories.length === 0) {
        console.log('⚠️ No active categories found')
        setCategories([])
        return
      }

      // Sort categories: those with images first, then by order
      const sortedCategories = activeCategories.sort((a: Category, b: Category) => {
        if (a.image && !b.image) return -1
        if (!a.image && b.image) return 1
        return a.order - b.order
      })

      // Fetch products for each category in parallel
      console.log('🔄 Fetching products for all categories in parallel...')
      const categoriesWithProducts = await Promise.all(
        sortedCategories.map(async (category: Category) => {
          try {
            const productsResponse = await fetch(`/api/products?category=${category.slug}&limit=5&isActive=true`)
            const productsData = await productsResponse.json()

            return {
              ...category,
              products: productsData.success ? productsData.data : [],
            }
          } catch (error) {
            console.error(`❌ Error fetching products for category ${category.name}:`, error)
            return {
              ...category,
              products: [],
            }
          }
        })
      )

      // Filter out categories with no products
      const categoriesWithProductsOnly = categoriesWithProducts.filter((category) => category.products.length > 0)
      console.log('✅ Final categories with products:', categoriesWithProductsOnly.length)

      // Ensure minimum loading time for better UX (at least 1 second)
      const elapsedTime = Date.now() - startTime
      const minLoadingTime = 1000
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime)

      if (remainingTime > 0) {
        console.log(`⏱️ Minimum loading time: waiting additional ${remainingTime}ms`)
        await new Promise((resolve) => setTimeout(resolve, remainingTime))
      }

      setCategories(categoriesWithProductsOnly)
      console.log('🎉 Page data loaded successfully!')
    } catch (error) {
      console.error('💥 Error fetching categories with products:', error)
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  // Removed unused getCategoryStyle function

  const renderCategoryContent = (category: CategoryWithProducts) => {
    // Always use default style (without category images)
    return (
      <div className="category-default">
        <AnimatedElement className="category-header" animation="fade-up">
          <h2 className="category-title">{category.name}</h2>
          {category.description && <p className="category-details-show">{category.description}</p>}
        </AnimatedElement>
        <AnimatedElement className="products-section" animation="fade-up" delay={200}>
          <CategoryProductsCarousel
            products={category.products.map((product) => ({
              id: product._id,
              slug: product.slug, // Add the slug field
              name: product.name,
              price: product.finalPrice,
              originalPrice: product.price,
              rating: product.rating,
              image:
                product.images.find((img) => img.isPrimary)?.url ||
                product.images[0]?.url ||
                '/placeholder-product.jpg',
              category: category.name,
            }))}
          />
          <div className="category-footer">
            <Link href={`/categories/${category.slug}`} className="btn btn-secondary">
              عرض جميع المنتجات ({category.designCount || 0})
            </Link>
          </div>
        </AnimatedElement>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="full-page-loader">
        <div className="loader-content">
          <div className="loader-logo">
            <Image
              src="/site/logo.png"
              alt="Prestige Designs"
              width={120}
              height={120}
              priority
              className="logo-image"
            />
          </div>
          <p className="loader-subtitle">جاري تحميل المنتجات...</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="section">
        <div className="container">
          <div className="error-message">
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && categories.length === 0) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty-state">
            <h2>لا توجد تصنيفات متاحة</h2>
            <p>لم يتم العثور على أي تصنيفات نشطة في الوقت الحالي.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {categories.map((category, index) => (
        <AnimatedSection key={category._id} delay={index * 200}>
          <div className="container">{renderCategoryContent(category)}</div>
        </AnimatedSection>
      ))}
    </>
  )
}

function CategoryProductsCarousel({
  products,
}: {
  products: Array<{
    id: string
    slug: string
    name: string
    price: number
    originalPrice: number
    rating: number
    image: string
    category: string
  }>
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'reverse'>('forward')
  const [itemsPerView, setItemsPerView] = useState(3)

  // Responsive items per view
  useEffect(() => {
    const updateItemsPerView = () => {
      if (window.innerWidth <= 480) {
        setItemsPerView(1)
      } else if (window.innerWidth <= 768) {
        setItemsPerView(2)
      } else {
        setItemsPerView(3)
      }
    }

    updateItemsPerView()
    window.addEventListener('resize', updateItemsPerView)
    return () => window.removeEventListener('resize', updateItemsPerView)
  }, [])

  const nextSlide = () => {
    if (isAnimating) return
    setDirection('forward')
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev + 1) % products.length)
    setTimeout(() => setIsAnimating(false), 400)
  }

  const prevSlide = () => {
    if (isAnimating) return
    setDirection('reverse')
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length)
    setTimeout(() => setIsAnimating(false), 400)
  }

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentIndex) return
    setDirection(index > currentIndex ? 'forward' : 'reverse')
    setIsAnimating(true)
    setCurrentIndex(index)
    setTimeout(() => setIsAnimating(false), 400)
  }

  // Get visible items based on responsive itemsPerView
  const getVisibleProducts = () => {
    const visible = []
    for (let i = 0; i < itemsPerView; i++) {
      const index = (currentIndex + i) % products.length
      visible.push({
        ...products[index],
        displayIndex: index,
        isNew: i === (direction === 'forward' ? itemsPerView - 1 : 0), // Only the new item
      })
    }
    return visible
  }

  const visibleProducts = getVisibleProducts()

  // Smart hide logic: hide controls when pagination isn't needed
  const shouldShowControls = () => {
    if (itemsPerView === 1) return products.length > 1 // Mobile: hide if only 1 item
    if (itemsPerView === 2) return products.length > 2 // Tablet: hide if ≤2 items
    if (itemsPerView === 3) return products.length > 3 // Desktop: hide if ≤3 items
    return true
  }

  return (
    <div className="product-carousel">
      <div className="simple-carousel">
        <div className="carousel-track">
          {visibleProducts.map((product, i) => (
            <div
              key={`${product.id}-${currentIndex}-${i}`}
              className={`carousel-item ${
                isAnimating && product.isNew ? `animating ${direction === 'reverse' ? 'reverse' : ''}` : ''
              }`}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Controls under the carousel - only show when needed */}
        {shouldShowControls() && (
          <div className="carousel-controls">
            <button
              className="carousel-nav carousel-prev"
              onClick={prevSlide}
              disabled={isAnimating}
              aria-label="Previous"
            >
              <FontAwesomeIcon icon={faArrowRight} />
            </button>

            <div className="carousel-dots">
              {products.map((_, i) => (
                <button
                  key={i}
                  className={`carousel-dot ${i === currentIndex ? 'active' : ''}`}
                  onClick={() => goToSlide(i)}
                  disabled={isAnimating}
                  aria-label={`Go to product ${i + 1}`}
                />
              ))}
            </div>

            <button className="carousel-nav carousel-next" onClick={nextSlide} disabled={isAnimating} aria-label="Next">
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
