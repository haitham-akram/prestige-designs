'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar, faChevronLeft, faChevronRight, faHeart, faShare } from '@fortawesome/free-solid-svg-icons'
import AddToCartButton from '@/components/ui/AddToCartButton'
import Link from 'next/link'
import CustomerLayout from '@/app/customer-layout'
import LoadingSpinner from '@/components/LoadingSpinner'
import Breadcrumb from '@/components/ui/Breadcrumb'
import './category-page.css'

interface Category {
  _id: string
  name: string
  slug: string
  description: string
  image: string
  icon: string
  color: string
  order: number
  isFeatured: boolean
  designCount: number
  viewCount: number
}

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  images: { url: string; alt?: string; isPrimary?: boolean; order?: number }[]
  price: number
  discountAmount: number
  discountPercentage: number
  finalPrice: number
  isFeatured: boolean
  rating: number
  reviewCount: number
  purchaseCount: number
  EnableCustomizations?: boolean
  categoryId?: {
    _id: string
    name: string
    slug: string
  }
}

export default function CategoryPage() {
  const params = useParams()
  // const searchParams = useSearchParams()
  const slug = params?.slug as string
  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  // const [totalProducts, setTotalProducts] = useState(0)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    if (slug) {
      fetchCategory()
      fetchProducts(true) // Initial load
    }
  }, [slug])

  useEffect(() => {
    if (slug && !loading) {
      fetchProducts(false) // Not initial load
    }
  }, [currentPage, sortBy, sortOrder])

  const fetchCategory = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch categories')
      }

      const foundCategory = data.data.find((cat: Category) => cat.slug === slug)
      if (!foundCategory) {
        setError('Category not found')
        return
      }

      setCategory(foundCategory)
    } catch (error) {
      console.error('Error fetching category:', error)
      setError('Failed to load category')
    }
  }

  const fetchProducts = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true)
      } else {
        setProductsLoading(true)
      }

      const params = new URLSearchParams({
        category: slug,
        page: currentPage.toString(),
        limit: '12',
        sortBy,
        sortOrder,
        isActive: 'true',
      })

      const response = await fetch(`/api/products?${params}`)
      console.log('Frontend API Request:', params.toString())
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch products')
      }

      setProducts(data.data || [])
      setTotalPages(data.pagination?.pages || 1)
      // setTotalProducts(data.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching products:', error)
      setError('Failed to load products')
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      } else {
        setProductsLoading(false)
      }
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  if (error && !category) {
    return (
      <CustomerLayout>
        <div className="container">
          <div className="cat-error-container">
            <h2>خطأ في تحميل الفئة</h2>
            <p>{error}</p>
            <Link href="/" className="btn btn-primary">
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout>
      <div className="container">
        {/* Breadcrumb */}
        <div className="cat-breadcrumb">
          <Breadcrumb
            items={[
              { label: 'الرئيسية', href: '/' },
              { label: category?.name || 'الفئة', isActive: true },
            ]}
          />
        </div>

        {/* Category Title */}
        {category && (
          <div className="cat-simple-title">
            <h1>{category.name}</h1>
          </div>
        )}

        {/* Sorting Only */}
        <div className="cat-sort-section">
          <div className="cat-sort-container">
            <span className="cat-sort-label">ترتيب حسب:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-')
                setSortBy(newSortBy)
                setSortOrder(newSortOrder as 'asc' | 'desc')
                setCurrentPage(1)
              }}
              className="cat-sort-select"
            >
              <option value="createdAt-desc">الأحدث</option>
              <option value="createdAt-asc">الأقدم</option>
              <option value="price-asc">السعر: من الأقل</option>
              <option value="price-desc">السعر: من الأعلى</option>
              <option value="rating-desc">التقييم: الأعلى</option>
              <option value="rating-asc">التقييم: الأقل</option>
              <option value="name-asc">الاسم: أ-ي</option>
              <option value="name-desc">الاسم: ي-أ</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="cat-full-page-loading">
            <div className="cat-loading-text">جاري تحميل المنتجات...</div>
            <div className="cat-loading-dots">
              <div className="cat-loading-dot"></div>
              <div className="cat-loading-dot"></div>
              <div className="cat-loading-dot"></div>
            </div>
          </div>
        ) : productsLoading ? (
          <div className="cat-products-loading">
            <div className="cat-loading-text">جاري تحميل المنتجات...</div>
            <div className="cat-loading-dots">
              <div className="cat-loading-dot"></div>
              <div className="cat-loading-dot"></div>
              <div className="cat-loading-dot"></div>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="cat-empty-state">
            <div className="cat-empty-icon">📦</div>
            <h3>لا توجد منتجات في هذه الفئة</h3>
            <p>جاري العمل على إضافة منتجات جديدة</p>
            <Link href="/" className="btn btn-primary">
              العودة للرئيسية
            </Link>
          </div>
        ) : (
          <>
            <div className="cat-products-grid">
              {products.map((product) => {
                const discountPercentage =
                  product.discountPercentage || Math.round(((product.price - product.finalPrice) / product.price) * 100)

                return (
                  <Link key={product._id} href={`/products/${product.slug}`} className="cp-product-card card">
                    <div className="cp-product-image">
                      <Image
                        src={product.images[0].url || '/placeholder-product.jpg'}
                        alt={product.name}
                        width={300}
                        height={300}
                        loading="lazy"
                        className="cp-product-img"
                        style={{ objectFit: 'contain' }}
                      />
                      {product.isFeatured && <div className="cp-discount-badge">مميز</div>}
                    </div>

                    <div className="cp-product-content">
                      <h3 className="cp-product-name">{product.name}</h3>

                      <div className="cp-product-rating">
                        <div className="cp-stars">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < Math.floor(product.rating) ? 'cp-star filled' : 'cp-star'}>
                              <FontAwesomeIcon icon={faStar} />
                            </span>
                          ))}
                        </div>
                        <span className="cp-rating-text">{product.rating}</span>
                      </div>

                      <div className="cp-product-pricing">
                        <div className="cp-pricing-row">
                          <div className="cp-prices-column">
                            <span className="cp-current-price">${product.finalPrice}</span>
                            {product.finalPrice < product.price && (
                              <span className="cp-original-price">${product.price}</span>
                            )}
                          </div>
                          <div className="cp-discount-savings-column">
                            {discountPercentage > 0 && (
                              <>
                                <span className="cp-discount-text">{discountPercentage}% خصم</span>
                                <span className="cp-savings-badge">
                                  وفرت ${(product.price - product.finalPrice).toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="cp-product-actions" onClick={(e) => e.stopPropagation()}>
                        <AddToCartButton
                          product={{
                            id: product._id,
                            name: product.name,
                            price: product.finalPrice,
                            originalPrice: product.price,
                            image: product.images[0]?.url || '/placeholder-product.jpg',
                            category: product.categoryId?.name || 'غير محدد',
                            EnableCustomizations: product.EnableCustomizations,
                            colors: (product as any).colors || [],
                          }}
                        />
                        <div className="cp-action-buttons">
                          <button className="cp-action-btn" title="إضافة للمفضلة" onClick={(e) => e.stopPropagation()}>
                            <FontAwesomeIcon icon={faHeart} />
                          </button>
                          <button className="cp-action-btn" title="مشاركة" onClick={(e) => e.stopPropagation()}>
                            <FontAwesomeIcon icon={faShare} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="cat-pagination">
                <button
                  className="cat-pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                  السابق
                </button>

                <div className="cat-pagination-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`cat-pagination-number ${currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="cat-pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  التالي
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </CustomerLayout>
  )
}
