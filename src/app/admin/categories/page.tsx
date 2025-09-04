'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faFolder, faPlus, faStar, faTimes } from '@fortawesome/free-solid-svg-icons'
import CategoryForm from '../../../components/admin/CategoryForm'
import './categories.css'
import '../../../components/admin/CategoryForm.css'

// Define Category type
interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
  order: number
  isActive: boolean
  isFeatured: boolean
  productsCount?: number
}

export default function AdminCategoriesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([]) // Store all categories for stats
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(false) // Separate loading for categories only
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCategories, setTotalCategories] = useState(0)
  const itemsPerPage = 6 // Show 6 categories per page
  const dataLoadedRef = useRef(false) // Track if data has been loaded

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'admin') {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  const fetchCategories = useCallback(
    async (page = 1, showPageLoader = false) => {
      try {
        if (showPageLoader) {
          setLoading(true)
        } else {
          setCategoriesLoading(true)
        }

        // Fetch paginated data for display
        const response = await fetch(`/api/admin/categories?page=${page}&limit=${itemsPerPage}&search=${searchTerm}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch categories')
        }

        setCategories(data.data || [])
        setTotalPages(data.pagination?.pages || 0)
        setTotalCategories(data.pagination?.total || 0)
        setCurrentPage(page)

        // Fetch all categories for stats (only on first load or when no search term)
        if (page === 1 && !searchTerm && showPageLoader) {
          const allResponse = await fetch('/api/admin/categories/all')
          const allData = await allResponse.json()
          if (allResponse.ok) {
            setAllCategories(allData.data || [])
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        setError('Failed to load categories. Please try again.')
      } finally {
        if (showPageLoader) {
          setLoading(false)
        } else {
          setCategoriesLoading(false)
        }
      }
    },
    [searchTerm, itemsPerPage]
  )

  // Fetch categories when component mounts and user is authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (session?.user && session.user.role === 'admin' && !dataLoadedRef.current) {
      dataLoadedRef.current = true
      fetchCategories(1, true) // Show page loader on initial load
    }
  }, [session, status, fetchCategories])

  // Add effect to handle search changes
  useEffect(() => {
    if (dataLoadedRef.current) {
      setCurrentPage(1) // Reset to first page when searching
      fetchCategories(1, false) // Don't show page loader for search
    }
  }, [searchTerm, fetchCategories])

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete category')
      }

      // Update categories list locally without full page refresh
      setCategories(categories.filter((cat) => cat._id !== categoryId))
      setAllCategories(allCategories.filter((cat) => cat._id !== categoryId))

      // If current page becomes empty and it's not page 1, go to previous page
      if (categories.length === 1 && currentPage > 1) {
        fetchCategories(currentPage - 1, false)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      setError('Failed to delete category. Please try again.')
    }
  }

  const handleToggleStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update category')
      }

      // Update categories list locally without full page refresh
      setCategories(categories.map((cat) => (cat._id === categoryId ? { ...cat, isActive: !currentStatus } : cat)))
      setAllCategories(
        allCategories.map((cat) => (cat._id === categoryId ? { ...cat, isActive: !currentStatus } : cat))
      )
    } catch (error) {
      console.error('Error updating category status:', error)
      setError('Failed to update category status. Please try again.')
    }
  }

  // Add effect to handle search changes
  useEffect(() => {
    if (dataLoadedRef.current) {
      setCurrentPage(1) // Reset to first page when searching
      fetchCategories(1)
    }
  }, [searchTerm, fetchCategories])

  const filteredCategories = categories // Remove frontend filtering since backend handles it now

  if (status === 'loading' || loading) {
    return (
      <div className="admin-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="header-content">
          <h1 className="admin-title">التصنيفات</h1>
          <p className="admin-subtitle">إدارة تصنيفات المتجر</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingCategory(null)
            setShowModal(true)
          }}
        >
          <FontAwesomeIcon icon={faPlus} />
          إضافة تصنيف
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')} className="error-close">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}

      <div className="admin-content">
        {/* Search and Filters */}
        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="البحث في التصنيفات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">
              <FontAwesomeIcon icon={faSearch} />
            </div>
          </div>
          <div className="category-stats">
            <div className="stat-item">
              <span className="stat-number">{allCategories.length}</span>
              <span className="stat-label">إجمالي التصنيفات</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{allCategories.filter((c) => c.isActive).length}</span>
              <span className="stat-label">نشط</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{allCategories.filter((c) => c.isFeatured).length}</span>
              <span className="stat-label">مميز</span>
            </div>
          </div>
        </div>

        {/* Categories Table/Grid */}
        <div className="categories-section">
          {categoriesLoading && (
            <div className="categories-loading">
              <div className="loading-spinner-small">
                <div className="spinner-small"></div>
                <p>جاري التحديث...</p>
              </div>
            </div>
          )}
          {filteredCategories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FontAwesomeIcon icon={faFolder} />
              </div>
              <h3>{searchTerm ? 'لا توجد تصنيفات تطابق معايير البحث.' : 'ابدأ بإنشاء أول تصنيف لك.'}</h3>
              <p>{searchTerm ? 'لا توجد تصنيفات تطابق معايير البحث.' : 'ابدأ بإنشاء أول تصنيف لك.'}</p>
              {!searchTerm && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingCategory(null)
                    setShowModal(true)
                  }}
                >
                  إنشاء أول تصنيف
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="categories-grid">
                {filteredCategories.map((category) => (
                  <div key={category._id} className="category-card">
                    <div className="category-header">
                      <div className="category-info">
                        <div className="category-details">
                          <h3 className="category-name">{category.name}</h3>
                          <p className="category-slug">/{category.slug}</p>
                        </div>
                      </div>
                      <div className="category-status">
                        <span className={`status-badge ${category.isActive ? 'active' : 'inactive'}`}>
                          {category.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                        {category.isFeatured && (
                          <span className="featured-badge">
                            <FontAwesomeIcon icon={faStar} /> مميز
                          </span>
                        )}
                      </div>
                    </div>

                    {category.image && (
                      <div className="category-image-section">
                        <Image
                          src={category.image}
                          alt={category.name}
                          width={200}
                          height={150}
                          loading="lazy"
                          className="category-display-image"
                        />
                      </div>
                    )}

                    {category.description && <p className="category-description">{category.description}</p>}

                    <div className="category-stats">
                      <div className="stat">
                        <span className="stat-value">{category.productsCount || 0}</span>
                        <span className="stat-name">المنتجات</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{category.order}</span>
                        <span className="stat-name">الترتيب</span>
                      </div>
                    </div>

                    <div className="category-actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setEditingCategory(category)
                          setShowModal(true)
                        }}
                      >
                        تعديل
                      </button>
                      <button
                        className={`btn btn-sm ${category.isActive ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => handleToggleStatus(category._id, category.isActive)}
                      >
                        {category.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(category._id)}>
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    عرض {categories.length} من {totalCategories} تصنيف
                  </div>
                  <div className="pagination">
                    <button
                      className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
                      onClick={() => currentPage > 1 && fetchCategories(currentPage - 1, false)}
                      disabled={currentPage === 1}
                    >
                      السابق
                    </button>

                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1
                      return (
                        <button
                          key={page}
                          className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                          onClick={() => fetchCategories(page, false)}
                        >
                          {page}
                        </button>
                      )
                    })}

                    <button
                      className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
                      onClick={() => currentPage < totalPages && fetchCategories(currentPage + 1, false)}
                      disabled={currentPage === totalPages}
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <CategoryForm
                category={editingCategory}
                onSave={() => {
                  // Refresh current page after save without page loader
                  fetchCategories(currentPage, false)
                  setShowModal(false)
                  setEditingCategory(null)
                }}
                onCancel={() => {
                  setShowModal(false)
                  setEditingCategory(null)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
