'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faSearch,
  faEdit,
  faTrash,
  faEye,
  faFilter,
  faSort,
  faSortUp,
  faSortDown,
} from '@fortawesome/free-solid-svg-icons'
import './products.css'

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  price: number
  discountAmount?: number
  discountPercentage?: number
  finalPrice: number
  category: {
    _id: string
    name: string
  }
  images: {
    url: string
    alt: string
    isPrimary: boolean
    order: number
  }[]
  isActive: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
  purchaseCount: number
  designFilesCount: number
}

interface Category {
  _id: string
  name: string
  isActive: boolean
}

export default function AdminProducts() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [currentPage, searchTerm, selectedCategory, statusFilter, sortBy, sortOrder])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories')
      const data = await response.json()
      console.log('Categories API response:', data) // Debug log
      if (response.ok) {
        setCategories(data.data || [])
        console.log('Categories set:', data.data || []) // Debug log
      }
    } catch (error) {
      console.error('خطأ في جلب التصنيفات:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        sortBy,
        sortOrder,
      })

      // Only add isActive if a specific status is selected
      if (statusFilter !== 'all') {
        params.append('isActive', statusFilter)
      }

      // Only add categoryId if a category is selected
      if (selectedCategory) {
        params.append('categoryId', selectedCategory)
      }

      console.log('Fetching products with params:', params.toString()) // Debug log
      const response = await fetch(`/api/admin/products?${params}`)
      const data = await response.json()
      console.log('Products API response:', data) // Debug log

      if (response.ok) {
        setProducts(data.data || [])
        setTotalPages(data.pagination?.pages || 1)
        setTotalProducts(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error('خطأ في جلب المنتجات:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟ سيتم حذف جميع الملفات المرتبطة به نهائياً.')) {
      try {
        const response = await fetch(`/api/admin/products?id=${productId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          // Refresh the products list
          fetchProducts()
        } else {
          const errorData = await response.json()
          alert(`خطأ في حذف المنتج: ${errorData.message}`)
        }
      } catch (error) {
        console.error('خطأ في حذف المنتج:', error)
        alert('حدث خطأ أثناء حذف المنتج')
      }
    }
  }

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      })

      if (response.ok) {
        fetchProducts()
      }
    } catch (error) {
      console.error('خطأ في تحديث حالة المنتج:', error)
    }
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading && products.length === 0) {
    return (
      <div className="products-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>جاري تحميل المنتجات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="products-container">
      {/* Header */}
      <div className="products-header">
        <div className="header-content">
          <h1>إدارة المنتجات</h1>
          <p>إضافة وتعديل وإدارة منتجات التصميم الرقمي</p>
        </div>
        <Link href="/admin/products/new" className="add-product-btn">
          <FontAwesomeIcon icon={faPlus} />
          إضافة منتج جديد
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="products-filters">
        <div className="search-section">
          <div className="search-input-wrapper">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder="البحث في المنتجات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="filters-section">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="">جميع التصنيفات</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
            <option value="all">جميع الحالات</option>
            <option value="true">نشط</option>
            <option value="false">غير نشط</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                اسم المنتج
                {sortBy === 'name' && (
                  <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} className="sort-icon" />
                )}
              </th>
              <th>التصنيف</th>
              <th onClick={() => handleSort('price')} className="sortable">
                السعر
                {sortBy === 'price' && (
                  <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} className="sort-icon" />
                )}
              </th>
              <th>الحالة</th>
              <th>الملفات</th>
              <th onClick={() => handleSort('purchaseCount')} className="sortable">
                المشتريات
                {sortBy === 'purchaseCount' && (
                  <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} className="sort-icon" />
                )}
              </th>
              <th onClick={() => handleSort('createdAt')} className="sortable">
                تاريخ الإنشاء
                {sortBy === 'createdAt' && (
                  <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} className="sort-icon" />
                )}
              </th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id} className={!product.isActive ? 'inactive-product' : ''}>
                <td className="product-name">
                  <div className="product-info">
                    {product.images.length > 0 ? (
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        className="product-thumbnail"
                      />
                    ) : (
                      <div className="product-thumbnail-placeholder">
                        <FontAwesomeIcon icon={faEye} />
                        <span>منتج جديد</span>
                      </div>
                    )}
                    <div>
                      <h4>{product.name}</h4>
                      <p className="product-slug">{product.slug}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="category-badge">
                    {product.category && product.category.name ? product.category.name : 'بدون تصنيف'}
                  </span>
                </td>
                <td className="price-cell">
                  <div className="price-info">
                    <span className="final-price">{formatPrice(product.finalPrice)}</span>
                    {product.discountAmount && <span className="original-price">{formatPrice(product.price)}</span>}
                  </div>
                </td>
                <td>
                  <button
                    onClick={() => toggleProductStatus(product._id, product.isActive)}
                    className={`status-toggle ${product.isActive ? 'active' : 'inactive'}`}
                  >
                    {product.isActive ? 'نشط' : 'غير نشط'}
                  </button>
                </td>
                <td>
                  <span className="files-count">
                    {product.designFilesCount || 0}
                    <span className="files-text"> ملف</span>
                  </span>
                </td>
                <td>
                  <span className="purchase-count">{product.purchaseCount}</span>
                </td>
                <td>{formatDate(product.createdAt)}</td>
                <td className="actions-cell">
                  <div className="action-buttons">
                    <Link href={`/admin/products/${product._id}`} className="action-btn edit-btn" title="تعديل المنتج">
                      <FontAwesomeIcon icon={faEdit} />
                    </Link>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="action-btn delete-btn"
                      title="حذف المنتج"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && !loading && (
          <div className="no-products">
            <div className="no-products-content">
              <h3>لا توجد منتجات</h3>
              <p>ابدأ بإضافة منتج جديد لإدارة ملفات التصميم</p>
              <Link href="/admin/products/new" className="add-first-product-btn">
                <FontAwesomeIcon icon={faPlus} />
                إضافة أول منتج
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            السابق
          </button>

          <span className="pagination-info">
            صفحة {currentPage} من {totalPages} ({totalProducts} منتج)
          </span>

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  )
}
