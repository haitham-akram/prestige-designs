'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faStar } from '@fortawesome/free-solid-svg-icons'
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons'
import './reviews.css'

interface Review {
  _id: string
  name: string
  rating: number
  text: string
  avatar: string
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminReviews() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [deletingReview, setDeletingReview] = useState<string | null>(null)
  const [updatingReview, setUpdatingReview] = useState<string | null>(null)

  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const dataLoadedRef = useRef(false)

  const fetchReviews = useCallback(
    async (params: {
      page: number
      pagination: Pagination
      searchTerm: string
      statusFilter: string
      ratingFilter: string
    }) => {
      try {
        setLoading(true)
        setError('')
        console.log('Fetching reviews with params:', params)

        const searchParams = new URLSearchParams({
          page: params.page.toString(),
          limit: params.pagination.limit.toString(),
          search: params.searchTerm,
          status: params.statusFilter,
          rating: params.ratingFilter,
        })

        const url = `/api/admin/reviews?${searchParams}`
        console.log('Fetching from URL:', url)

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error('Failed to fetch reviews')
        }

        const result = await response.json()
        console.log('Fetch result:', result)

        if (result.success) {
          setReviews(result.data || [])
          setPagination({
            page: 1,
            limit: 10,
            total: result.data?.length || 0,
            totalPages: 1,
          })
          console.log('Reviews updated:', result.data?.length || 0, 'reviews')
        } else {
          setError(result.message || 'Failed to fetch reviews')
        }
      } catch (err) {
        setError('Failed to fetch reviews')
        console.error('Error fetching reviews:', err)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Initial load only
  useEffect(() => {
    if (!dataLoadedRef.current) {
      dataLoadedRef.current = true
      fetchReviews({
        page: 1,
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        searchTerm: '',
        statusFilter: 'all',
        ratingFilter: 'all',
      })
    }
  }, [])

  // Separate effect for search/filter changes
  useEffect(() => {
    if (!dataLoadedRef.current) return // Skip if initial load hasn't happened yet

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchReviews({
        page: 1,
        pagination,
        searchTerm,
        statusFilter,
        ratingFilter,
      })
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, statusFilter, ratingFilter])

  const handlePageChange = (newPage: number) => {
    fetchReviews({
      page: newPage,
      pagination,
      searchTerm,
      statusFilter,
      ratingFilter,
    })
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
      return
    }

    try {
      setDeletingReview(reviewId)
      console.log('Deleting review:', reviewId)

      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      console.log('Delete response:', result)

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete review')
      }

      if (result.success) {
        // Remove the deleted review from state
        setReviews((prev) => prev.filter((review) => review._id !== reviewId))
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
        console.log('Review deleted successfully')
      } else {
        alert(result.message || 'Failed to delete review')
      }
    } catch (err) {
      alert('Failed to delete review')
      console.error('Error deleting review:', err)
    } finally {
      setDeletingReview(null)
    }
  }

  const handleUpdateReviewStatus = async (reviewId: string, isActive: boolean) => {
    try {
      setUpdatingReview(reviewId)
      console.log('Updating review:', reviewId, 'to isActive:', isActive)

      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      })

      const result = await response.json()
      console.log('Update response:', result)

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update review status')
      }

      if (result.success) {
        // Update the review status in state
        setReviews((prev) => {
          const updatedReviews = prev.map((review) => (review._id === reviewId ? { ...review, isActive } : review))
          console.log('Updated reviews state:', updatedReviews)
          return updatedReviews
        })
        console.log('Review status updated successfully')
      } else {
        alert(result.message || 'Failed to update review status')
      }
    } catch (err) {
      alert('Failed to update review status')
      console.error('Error updating review status:', err)
    } finally {
      setUpdatingReview(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="rating-stars">
        {[...Array(5)].map((_, i) => (
          <FontAwesomeIcon
            key={i}
            icon={i < rating ? faStar : faStarRegular}
            className={i < rating ? 'star filled' : 'star'}
          />
        ))}
      </div>
    )
  }

  if (loading && reviews.length === 0) {
    return (
      <div className="admin-reviews">
        <div className="loading">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="admin-reviews">
      <div className="reviews-header">
        <h1>إدارة التقييمات</h1>
        <p>عرض وإدارة تقييمات العملاء</p>
      </div>

      {/* Search and Filters */}
      <div className="reviews-filters">
        <div className="reviews-filters-content">
          <div className="search-section">
            <input
              type="text"
              placeholder="البحث في التقييمات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-section">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
              <option value="all">جميع الحالات</option>
              <option value="true">نشط</option>
              <option value="false">غير نشط</option>
            </select>

            <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="filter-select">
              <option value="all">جميع التقييمات</option>
              <option value="5">5 نجوم</option>
              <option value="4">4 نجوم</option>
              <option value="3">3 نجوم</option>
              <option value="2">2 نجوم</option>
              <option value="1">1 نجمة</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Cards */}
      <div className="reviews-cards-container">
        {error && <div className="error-message">{error}</div>}

        {reviews.length === 0 && !loading ? (
          <div className="no-reviews">
            <p>لا توجد تقييمات</p>
          </div>
        ) : (
          <div className="reviews-grid">
            {reviews.map((review) => (
              <div key={review._id} className="review-card">
                <div className="review-card-header">
                  <div className="review-product-info">
                    <div className="product-image">
                      <Image
                        src={review.avatar.trim()}
                        alt={review.name}
                        height={50}
                        width={50}
                        className="review-avatar-img"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling?.classList.remove('fallback-hidden')
                        }}
                      />
                      <span className="avatar-fallback fallback-hidden">
                        <FontAwesomeIcon icon={faUser} />
                      </span>
                    </div>
                    <div className="product-details">
                      <div className="product-name">{review.name}</div>
                      <div className="review-date">{formatDate(review.createdAt)}</div>
                    </div>
                  </div>
                  <div className="review-status">
                    <span className={`status-badge ${review.isActive ? 'approved' : 'rejected'}`}>
                      {review.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                </div>

                <div className="review-card-body">
                  <div className="review-customer-info">
                    <div className="customer-name">{review.name}</div>
                    <div className="customer-email">تقييم العميل</div>
                  </div>

                  <div className="review-rating">
                    <div className="rating-stars">{renderStars(review.rating)}</div>
                    <div className="rating-number">{review.rating}/5</div>
                  </div>

                  <div className="review-content">
                    <div className="review-comment">{review.text}</div>
                  </div>
                </div>

                <div className="review-card-actions">
                  <button
                    onClick={() => handleUpdateReviewStatus(review._id, !review.isActive)}
                    disabled={updatingReview === review._id}
                    className={`action-btn ${review.isActive ? 'disapprove-btn' : 'approve-btn'}`}
                  >
                    {updatingReview === review._id ? 'جاري...' : review.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                  </button>
                  <button
                    onClick={() => handleDeleteReview(review._id)}
                    disabled={deletingReview === review._id}
                    className="action-btn delete-btn"
                  >
                    {deletingReview === review._id ? 'جاري الحذف...' : 'حذف'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="pagination-btn"
          >
            السابق
          </button>

          <span className="pagination-info">
            صفحة {pagination.page} من {pagination.totalPages}
          </span>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="pagination-btn"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  )
}
