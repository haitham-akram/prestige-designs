'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar, faFilter, faSort, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import CustomerLayout from '@/app/customer-layout'
import LoadingSpinner from '@/components/LoadingSpinner'
import Breadcrumb from '@/components/ui/Breadcrumb'

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
  images: string[]
  price: number
  discountAmount: number
  discountPercentage: number
  finalPrice: number
  isFeatured: boolean
  rating: number
  reviewCount: number
  purchaseCount: number
  category: {
    _id: string
    name: string
    slug: string
  }
}

export default function CategoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params?.slug as string
  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (slug) {
      fetchCategory()
      fetchProducts()
    }
  }, [slug, currentPage, sortBy, sortOrder])

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

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        category: slug,
        page: currentPage.toString(),
        limit: '12',
        sortBy,
        sortOrder,
        isActive: 'true',
      })

      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch products')
      }

      setProducts(data.data || [])
      setTotalPages(data.pagination?.pages || 1)
      setTotalProducts(data.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching products:', error)
      setError('Failed to load products')
    } finally {
      setLoading(false)
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
          <div className="error-container">
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
        <Breadcrumb
          items={[
            { label: 'الرئيسية', href: '/' },
            { label: category?.name || 'الفئة', isActive: true },
          ]}
        />

        {/* Category Header */}
        {category && (
          <div className="category-header">
            <div className="category-info">
              {category.image && (
                <div className="category-image">
                  <Image
                    src={category.image}
                    alt={category.name}
                    width={120}
                    height={120}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}
              <div className="category-details">
                <h1 className="category-title">{category.name}</h1>
                {category.description && <p className="category-description">{category.description}</p>}
                <div className="category-stats">
                  <span className="stat">
                    <strong>{totalProducts}</strong> منتج
                  </span>
                  <span className="stat">
                    <strong>{category.viewCount || 0}</strong> مشاهدة
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Sorting */}
        <div className="filters-section">
          <div className="filters-header">
            <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
              <FontAwesomeIcon icon={faFilter} />
              الفلاتر
            </button>
            <div className="sort-options">
              <span className="sort-label">ترتيب حسب:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-')
                  setSortBy(newSortBy)
                  setSortOrder(newSortOrder as 'asc' | 'desc')
                  setCurrentPage(1)
                }}
                className="sort-select"
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
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>جاري تحميل المنتجات...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>لا توجد منتجات في هذه الفئة</h3>
            <p>جاري العمل على إضافة منتجات جديدة</p>
            <Link href="/" className="btn btn-primary">
              العودة للرئيسية
            </Link>
          </div>
        ) : (
          <>
            <div className="products-grid">
              {products.map((product) => {
                const discountPercentage =
                  product.discountPercentage || Math.round(((product.price - product.finalPrice) / product.price) * 100)

                return (
                  <Link key={product._id} href={`/products/${product.slug}`} className="product-card card">
                    <div className="product-image">
                      <Image
                        src={product.images[0] || '/placeholder-product.jpg'}
                        alt={product.name}
                        width={300}
                        height={300}
                        loading="lazy"
                        className="product-img"
                        style={{ objectFit: 'contain' }}
                      />
                      {product.isFeatured && <div className="featured-badge">مميز</div>}
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
                          <div className="prices-column">
                            <span className="current-price">${product.finalPrice}</span>
                            {product.finalPrice < product.price && (
                              <span className="original-price">${product.price}</span>
                            )}
                          </div>
                          <div className="discount-savings-column">
                            {discountPercentage > 0 && (
                              <>
                                <span className="discount-text">{discountPercentage}% خصم</span>
                                <span className="savings-badge">
                                  وفرت ${(product.price - product.finalPrice).toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                  السابق
                </button>

                <div className="pagination-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="pagination-btn"
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

      <style jsx>{`
        .error-container,
        .loading-container,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 1rem;
          text-align: center;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .category-header {
          margin-bottom: 3rem;
          padding: 2rem;
          background: var(--color-dark-secondary);
          border-radius: 12px;
        }

        .category-info {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .category-image {
          border-radius: 12px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .category-details {
          flex: 1;
        }

        .category-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 1rem 0;
        }

        .category-description {
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .category-stats {
          display: flex;
          gap: 2rem;
        }

        .stat {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }

        .stat strong {
          color: var(--color-primary);
          font-weight: 600;
        }

        .filters-section {
          margin-bottom: 2rem;
        }

        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--color-dark-secondary);
          border-radius: 8px;
        }

        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.3s ease;
        }

        .filter-toggle:hover {
          background: var(--color-primary-dark);
        }

        .sort-options {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .sort-label {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }

        .sort-select {
          padding: 0.5rem 1rem;
          background: var(--color-dark-primary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .product-card {
          text-decoration: none;
          color: inherit;
          transition: transform 0.3s ease;
        }

        .product-card:hover {
          transform: translateY(-4px);
        }

        .product-image {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: var(--color-dark-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 250px;
        }

        .product-img {
          max-width: 100%;
          height: auto;
        }

        .featured-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: var(--color-primary);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .product-content {
          padding: 1rem;
        }

        .product-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 0.5rem 0;
          line-height: 1.4;
        }

        .product-rating {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .stars {
          display: flex;
          gap: 0.25rem;
        }

        .star {
          color: var(--color-text-secondary);
          font-size: 0.8rem;
        }

        .star.filled {
          color: #ffd700;
        }

        .rating-text {
          font-weight: 600;
          color: var(--color-text-primary);
          font-size: 0.9rem;
        }

        .product-pricing {
          background: var(--color-dark-secondary);
          padding: 1rem;
          border-radius: 8px;
        }

        .pricing-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .prices-column {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .current-price {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--color-primary);
        }

        .original-price {
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          text-decoration: line-through;
        }

        .discount-savings-column {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .discount-text {
          background: var(--color-primary);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .savings-badge {
          background: #22c55e;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 3rem;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--color-dark-secondary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .pagination-btn:hover:not(:disabled) {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-numbers {
          display: flex;
          gap: 0.5rem;
        }

        .pagination-number {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-dark-secondary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .pagination-number:hover {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .pagination-number.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        @media (max-width: 768px) {
          .category-info {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .category-title {
            font-size: 2rem;
          }

          .category-stats {
            justify-content: center;
          }

          .filters-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .sort-options {
            justify-content: space-between;
          }

          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
          }

          .pagination {
            flex-direction: column;
            gap: 1rem;
          }

          .pagination-numbers {
            order: -1;
          }
        }
      `}</style>
    </CustomerLayout>
  )
}
