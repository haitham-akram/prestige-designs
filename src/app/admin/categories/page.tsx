'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const dataLoadedRef = useRef(false) // Track if data has been loaded

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'admin') {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  // Fetch categories when component mounts and user is authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (session?.user && session.user.role === 'admin' && !dataLoadedRef.current) {
      dataLoadedRef.current = true
      fetchCategories()
    }
  }, [session, status]) // Removed router from dependencies

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/categories')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch categories')
      }

      setCategories(data.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      setError('Failed to load categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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

      setCategories(categories.filter((cat) => cat._id !== categoryId))
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

      const updatedCategory = await response.json()
      setCategories(categories.map((cat) => (cat._id === categoryId ? updatedCategory.data : cat)))
    } catch (error) {
      console.error('Error updating category status:', error)
      setError('Failed to update category status. Please try again.')
    }
  }

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              <span className="stat-number">{categories.length}</span>
              <span className="stat-label">إجمالي التصنيفات</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{categories.filter((c) => c.isActive).length}</span>
              <span className="stat-label">نشط</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{categories.filter((c) => c.isFeatured).length}</span>
              <span className="stat-label">مميز</span>
            </div>
          </div>
        </div>

        {/* Categories Table/Grid */}
        <div className="categories-section">
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
                onSave={(savedCategory) => {
                  if (editingCategory) {
                    setCategories(categories.map((cat) => (cat._id === savedCategory._id ? savedCategory : cat)))
                  } else {
                    setCategories([...categories, savedCategory])
                  }
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
