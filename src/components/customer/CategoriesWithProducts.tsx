'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowRight,
  faPlay,
  faHeart,
  faShare,
  faShoppingCart,
  faStar,
} from '@fortawesome/free-solid-svg-icons'
import ProductCard from './ProductCard'
import ProductCarousel from './ProductCarousel'

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
      console.log('Fetching categories...')

      // Fetch categories
      const categoriesResponse = await fetch('/api/categories')
      const categoriesData = await categoriesResponse.json()

      console.log('Categories response:', categoriesData)

      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories')
      }

      if (!categoriesData.data || !Array.isArray(categoriesData.data)) {
        console.error('Invalid categories data:', categoriesData)
        setError('Invalid categories data received')
        return
      }

      const activeCategories = categoriesData.data
      console.log('Active categories:', activeCategories)

      if (activeCategories.length === 0) {
        console.log('No active categories found')
        setCategories([])
        return
      }

      // Sort categories: those with images first, then by order
      const sortedCategories = activeCategories.sort((a, b) => {
        if (a.image && !b.image) return -1
        if (!a.image && b.image) return 1
        return a.order - b.order
      })

      // Fetch products for each category
      const categoriesWithProducts = await Promise.all(
        sortedCategories.map(async (category: Category) => {
          try {
            console.log(`Fetching products for category: ${category.name} (${category.slug})`)
            const productsResponse = await fetch(`/api/products?category=${category.slug}&limit=5&isActive=true`)
            const productsData = await productsResponse.json()

            console.log(`Products for ${category.name}:`, productsData)

            return {
              ...category,
              products: productsData.success ? productsData.data : [],
            }
          } catch (error) {
            console.error(`Error fetching products for category ${category.name}:`, error)
            return {
              ...category,
              products: [],
            }
          }
        })
      )

      console.log('Final categories with products:', categoriesWithProducts)

      // Filter out categories with no products
      const categoriesWithProductsOnly = categoriesWithProducts.filter((category) => category.products.length > 0)
      console.log('Categories with products only:', categoriesWithProductsOnly)

      setCategories(categoriesWithProductsOnly)
    } catch (error) {
      console.error('Error fetching categories with products:', error)
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryStyle = (order: number) => {
    // Different styles based on category order
    const styles = [
      'full-image', // Order 1: Full image with centered name
      'grid-layout', // Order 2: Product grid layout
      'featured', // Order 3: Featured style
      'compact', // Order 4: Compact layout
      'hero-style', // Order 5+: Hero style
    ]

    return styles[Math.min(order - 1, styles.length - 1)]
  }

  const renderCategoryContent = (category: CategoryWithProducts) => {
    // If category has image, show image first, then title
    if (category.image) {
      return (
        <div className="category-with-image">
          <div className="category-hero-image">
            <Image
              src={category.image}
              alt={category.name}
              width={1200}
              height={400}
              className="hero-bg-image"
              priority
            />
          </div>
          <div className="category-title-section">
            <h2 className="category-title">{category.name}</h2>
            {category.description && <p className="category-details-show">{category.description}</p>}
          </div>
          <div className="products-section">
            <ProductCarousel
              products={category.products.map((product) => ({
                id: product._id,
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
              itemsPerView={3}
            />
            <div className="category-footer">
              <Link href={`/category/${category.slug}`} className="btn btn-secondary">
                عرض جميع المنتجات ({category.designCount || 0})
              </Link>
            </div>
          </div>
        </div>
      )
    }

    // For categories without images, use default style
    return (
      <div className="category-default">
        <div className="category-header">
          <h2 className="category-title">{category.name}</h2>
          {category.description && <p className="category-details-show">{category.description}</p>}
        </div>
        <div className="products-section">
          <ProductCarousel
            products={category.products.map((product) => ({
              id: product._id,
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
            itemsPerView={3}
          />
          <div className="category-footer">
            <Link href={`/category/${category.slug}`} className="btn btn-secondary">
              عرض جميع المنتجات ({category.designCount || 0})
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="section">
        <div className="container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>جاري التحميل...</p>
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
      {categories.map((category) => (
        <section key={category._id} className="section category-section">
          <div className="container">{renderCategoryContent(category)}</div>
        </section>
      ))}
    </>
  )
}
