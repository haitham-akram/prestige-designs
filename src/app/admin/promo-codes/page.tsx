'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch,
  faTicketAlt,
  faPlus,
  faTimes,
  faEdit,
  faTrash,
  faToggleOn,
  faToggleOff,
  faFilter,
} from '@fortawesome/free-solid-svg-icons'
import './promo-codes.css'

// Define PromoCode type
interface PromoCode {
  _id: string
  code: string
  productId: string
  product?: {
    _id: string
    name: string
    slug: string
    price: number
    images?: Array<{
      url: string
      alt?: string
      isPrimary?: boolean
      order?: number
    }>
  }
  discountType: 'percentage' | 'fixed_amount'
  discountValue: number
  maxDiscountAmount?: number
  usageLimit?: number
  usageCount: number
  userUsageLimit?: number
  minimumOrderAmount?: number
  startDate?: string
  endDate?: string
  isActive: boolean
  description?: string
  createdAt: string
  updatedAt: string
  isExpired: boolean
  isNotYetActive: boolean
  usagePercentage: number
  isCurrentlyValid: boolean
}

export default function AdminPromoCodesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [products, setProducts] = useState<Array<{ _id: string; name: string; slug: string; price: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')

  const [selectedPromoCodes, setSelectedPromoCodes] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  // Track if data has been loaded to prevent unnecessary reloads
  const dataLoadedRef = useRef(false)

  // Redirect if not admin - only run once on mount
  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'admin') {
      router.push('/auth/signin')
      return
    }
    // Only fetch data if we haven't loaded it yet
    if (!dataLoadedRef.current) {
      dataLoadedRef.current = true
      fetchPromoCodes()
      fetchProducts()
    }
  }, [session, status, router])

  const fetchPromoCodes = async (page = 1, showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(productFilter && { productId: productFilter }),
      })

      const response = await fetch(`/api/admin/promo-codes?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch promo codes')
      }

      setPromoCodes(data.data || [])
      setPagination((prev) => ({
        ...prev,
        page,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
      }))
    } catch (error) {
      console.error('Error fetching promo codes:', error)
      setError('Failed to load promo codes. Please try again.')
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products?limit=100')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch products')
      }

      setProducts(data.data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      // Don't set error for products as it's not critical
    }
  }

  // Debounced search handler - only update data, not full page
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        // Only fetch data, don't trigger full page update
        fetchPromoCodes(1, false)
      }
    }, 500) // 500ms delay

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleDelete = async (promoCodeId: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return

    try {
      const response = await fetch(`/api/admin/promo-codes/${promoCodeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete promo code')
      }

      setPromoCodes(promoCodes.filter((pc) => pc._id !== promoCodeId))
    } catch (error) {
      console.error('Error deleting promo code:', error)
      setError('Failed to delete promo code. Please try again.')
    }
  }

  const handleToggleStatus = async (promoCodeId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/promo-codes/${promoCodeId}`, {
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
        throw new Error(data.message || 'Failed to update promo code')
      }

      const updatedPromoCode = await response.json()
      setPromoCodes(promoCodes.map((pc) => (pc._id === promoCodeId ? updatedPromoCode.data : pc)))
    } catch (error) {
      console.error('Error updating promo code status:', error)
      setError('Failed to update promo code status. Please try again.')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedPromoCodes.length === 0) {
      setError('Please select promo codes to perform bulk action')
      return
    }

    setBulkActionLoading(true)
    setError('') // Clear any previous errors

    try {
      const response = await fetch('/api/admin/promo-codes/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          promoCodeIds: selectedPromoCodes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to perform bulk action')
      }

      // Update the local state without full page reload
      const updatedPromoCodes = promoCodes
        .map((promoCode) => {
          if (selectedPromoCodes.includes(promoCode._id)) {
            if (action === 'activate') {
              return { ...promoCode, isActive: true }
            } else if (action === 'deactivate') {
              return { ...promoCode, isActive: false }
            } else if (action === 'delete') {
              return null // Will be filtered out
            }
          }
          return promoCode
        })
        .filter((promoCode): promoCode is PromoCode => promoCode !== null) // Remove null items (deleted ones)

      setPromoCodes(updatedPromoCodes)
      setSelectedPromoCodes([])
    } catch (error) {
      console.error('Error performing bulk action:', error)
      setError('Failed to perform bulk action. Please try again.')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const getStatusBadge = (promoCode: PromoCode) => {
    if (!promoCode.isActive) {
      return <span className="status-badge inactive">غير نشط</span>
    }
    if (promoCode.isExpired) {
      return <span className="status-badge expired">منتهي الصلاحية</span>
    }
    if (promoCode.isNotYetActive) {
      return <span className="status-badge not-active">غير مفعل بعد</span>
    }
    if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
      return <span className="status-badge limit-reached">تم استنفاذ الحد</span>
    }
    return <span className="status-badge active">نشط</span>
  }

  const getDiscountDisplay = (promoCode: PromoCode) => {
    if (promoCode.discountType === 'percentage') {
      return `${promoCode.discountValue}%`
    }
    return `$${promoCode.discountValue}`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="admin-container">
        <div className="admin-loading-spinner">
          <div className="admin-spinner"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="header-content">
          <h1 className="admin-title">رموز الخصم</h1>
          <p className="admin-subtitle">إدارة رموز الخصم والعروض الترويجية</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowFilters(!showFilters)}>
            <FontAwesomeIcon icon={faFilter} />
            الفلاتر
          </button>
          <Link href="/admin/promo-codes/new" className="btn btn-primary">
            <FontAwesomeIcon icon={faPlus} />
            إضافة رمز خصم
          </Link>
        </div>
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
              placeholder="البحث في رموز الخصم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  fetchPromoCodes(1, false)
                }
              }}
            />
            <div className="search-icon">
              <FontAwesomeIcon icon={faSearch} />
            </div>
            <button className="search-button" onClick={() => fetchPromoCodes(1, false)} type="button">
              <FontAwesomeIcon icon={faSearch} />
            </button>
          </div>

          {showFilters && (
            <div className="filters-panel">
              <div className="filter-group">
                <label>الحالة:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">جميع الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="expired">منتهي الصلاحية</option>
                  <option value="not_active">غير مفعل بعد</option>
                </select>
              </div>
              <div className="filter-group">
                <label>المنتج:</label>
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">جميع المنتجات</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} - ${product.price}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => fetchPromoCodes(1, false)}>
                تطبيق الفلاتر
              </button>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedPromoCodes.length > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">تم تحديد {selectedPromoCodes.length} رمز خصم</span>
            <div className="bulk-buttons">
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleBulkAction('activate')}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? 'جاري التفعيل...' : 'تفعيل المحدد'}
              </button>
              <button
                className="btn btn-sm btn-warning"
                onClick={() => handleBulkAction('deactivate')}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? 'جاري إلغاء التفعيل...' : 'إلغاء تفعيل المحدد'}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? 'جاري الحذف...' : 'حذف المحدد'}
              </button>
            </div>
          </div>
        )}

        {/* Promo Codes Table/Grid */}
        <div className="promo-codes-section">
          {promoCodes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FontAwesomeIcon icon={faTicketAlt} />
              </div>
              <h3>{searchTerm ? 'لا توجد رموز خصم تطابق معايير البحث.' : 'ابدأ بإنشاء أول رمز خصم لك.'}</h3>
              <p>{searchTerm ? 'جرب تغيير معايير البحث أو الفلاتر.' : 'أنشئ رموز خصم لجذب العملاء وزيادة المبيعات.'}</p>
              {!searchTerm && (
                <Link href="/admin/promo-codes/new" className="btn btn-primary">
                  إنشاء أول رمز خصم
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="promo-codes-grid">
                {promoCodes.map((promoCode) => (
                  <div key={promoCode._id} className="promo-code-card">
                    <div className="promo-code-header">
                      <div className="promo-code-info">
                        <div className="promo-code-details">
                          <h3 className="promo-code-name">{promoCode.code}</h3>
                          <p className="promo-code-description">{promoCode.description || 'لا يوجد وصف'}</p>
                        </div>
                      </div>
                      <div className="promo-code-status">{getStatusBadge(promoCode)}</div>
                    </div>

                    {promoCode.product && (
                      <div className="product-section">
                        <div className="product-info">
                          <h4 className="product-name">{promoCode.product.name}</h4>
                          <p className="product-price">${promoCode.product.price}</p>
                        </div>
                        {promoCode.product.images && promoCode.product.images[0] && promoCode.product.images[0].url && (
                          <div className="product-image">
                            <Image
                              src={promoCode.product.images[0].url}
                              alt={promoCode.product.name}
                              width={60}
                              height={60}
                              loading="lazy"
                              className="product-thumbnail"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="discount-info">
                      <div className="discount-type">
                        <span className="discount-label">نوع الخصم:</span>
                        <span className="discount-value">
                          {promoCode.discountType === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}
                        </span>
                      </div>
                      <div className="discount-amount">
                        <span className="discount-label">قيمة الخصم:</span>
                        <span className="discount-value highlight">{getDiscountDisplay(promoCode)}</span>
                      </div>
                      {promoCode.maxDiscountAmount && (
                        <div className="max-discount">
                          <span className="discount-label">الحد الأقصى:</span>
                          <span className="discount-value">${promoCode.maxDiscountAmount}</span>
                        </div>
                      )}
                      {promoCode.minimumOrderAmount && (
                        <div className="minimum-order">
                          <span className="discount-label">الحد الأدنى للطلب:</span>
                          <span className="discount-value">${promoCode.minimumOrderAmount}</span>
                        </div>
                      )}
                    </div>

                    <div className="usage-info">
                      <div className="usage-stats">
                        <div className="usage-item">
                          <span className="usage-label">الاستخدام:</span>
                          <span className="usage-value">
                            {promoCode.usageCount}
                            {promoCode.usageLimit && ` / ${promoCode.usageLimit}`}
                          </span>
                        </div>
                        {promoCode.usageLimit && (
                          <div className="usage-progress">
                            <div className="progress-bar" style={{ width: `${promoCode.usagePercentage}%` }}></div>
                            <span className="progress-text">{promoCode.usagePercentage}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="date-info">
                      {promoCode.startDate && (
                        <div className="date-item">
                          <span className="date-label">تاريخ البداية:</span>
                          <span className="date-value">
                            {new Date(promoCode.startDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                      {promoCode.endDate && (
                        <div className="date-item">
                          <span className="date-label">تاريخ الانتهاء:</span>
                          <span className="date-value">
                            {new Date(promoCode.endDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="promo-code-actions">
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={selectedPromoCodes.includes(promoCode._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPromoCodes([...selectedPromoCodes, promoCode._id])
                            } else {
                              setSelectedPromoCodes(selectedPromoCodes.filter((id) => id !== promoCode._id))
                            }
                          }}
                        />
                        <span className="checkmark"></span>
                      </label>

                      <Link href={`/admin/promo-codes/${promoCode._id}/edit`} className="btn btn-sm btn-secondary">
                        <FontAwesomeIcon icon={faEdit} />
                        تعديل
                      </Link>

                      <button
                        className={`btn btn-sm ${promoCode.isActive ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => handleToggleStatus(promoCode._id, promoCode.isActive)}
                      >
                        <FontAwesomeIcon icon={promoCode.isActive ? faToggleOff : faToggleOn} />
                        {promoCode.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                      </button>

                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(promoCode._id)}
                        disabled={promoCode.usageCount > 0}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => fetchPromoCodes(pagination.page - 1, false)}
                    disabled={!pagination.hasPrevPage}
                  >
                    السابق
                  </button>

                  <span className="pagination-info">
                    صفحة {pagination.page} من {pagination.totalPages}
                  </span>

                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => fetchPromoCodes(pagination.page + 1, false)}
                    disabled={!pagination.hasNextPage}
                  >
                    التالي
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
