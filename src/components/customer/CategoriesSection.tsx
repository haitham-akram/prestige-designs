'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import './CategoriesSection.css'

interface Category {
  _id: string
  name: string
  slug: string
  image: string
  description?: string
}

export default function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()

        if (data.success) {
          setCategories(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (loading) {
    return (
      <section className="csn-categories-section">
        <div className="container">
          <div className="csn-categories-loading">
            <div className="csn-loading-spinner"></div>
            <p>جاري تحميل الأقسام...</p>
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) {
    return null
  }

  // Take first 6 categories for the grid layout
  const displayCategories = categories.slice(0, 6)
  const categoryCount = displayCategories.length

  // Determine grid class based on number of categories
  const getGridClass = (count: number) => {
    if (count === 1) return 'csn-grid-1'
    if (count === 2) return 'csn-grid-2'
    if (count === 3) return 'csn-grid-3'
    if (count === 4) return 'csn-grid-4'
    if (count === 5) return 'csn-grid-5'
    if (count === 6) return 'csn-grid-6'
    if (count === 7) return 'csn-grid-7'
    return 'csn-grid-6' // Default for 8+ categories
  }

  // Determine which category should be large based on count
  const getLargeCategoryIndex = (count: number) => {
    if (count === 5) return 1 // Second category (item2) is large
    if (count === 7) return 2 // Third category (item3) is large
    return -1 // No large category for other counts
  }

  return (
    <section className="csn-categories-section">
      <div className="container">
        <div className="csn-categories-header">
          <h2 className="csn-categories-title">الأقسام</h2>
          {/* <div className="csn-title-decoration"></div> */}
        </div>

        <div className={`csn-categories-grid ${getGridClass(categoryCount)}`}>
          {displayCategories.map((category, index) => {
            const largeIndex = getLargeCategoryIndex(categoryCount)
            const isLarge = index === largeIndex
            return (
              <Link
                key={category._id}
                href={`/categories/${category.slug}`}
                className={`csn-category-card csn-category-item-${index + 1} ${isLarge ? 'csn-category-large' : ''}`}
              >
                <div className="csn-category-image">
                  <Image
                    src={category.image || '/placeholder-product.jpg'}
                    alt={category.name}
                    width={400}
                    height={400}
                    className="csn-category-img"
                    quality={100}
                    unoptimized={true}
                    loading="lazy"
                  />
                  <div className="csn-category-overlay"></div>
                </div>

                <div className="csn-category-glow"></div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
