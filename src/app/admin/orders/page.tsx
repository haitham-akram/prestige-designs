'use client'

import { useState, useEffect } from 'react'
import './orders.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faShoppingCart,
  faSearch,
  faFilter,
  faEye,
  faEdit,
  faCheck,
  faTimes,
  faClock,
  faDollarSign,
  faUpload,
  faEnvelope,
  faDownload,
  faSpinner,
  faCalendar,
  faUser,
  faBox,
  faPalette,
  faFileUpload,
  faTrash,
  faRefresh,
  faSort,
  faSortUp,
  faSortDown,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons'
import { useRouter } from 'next/navigation'

// Types
interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  colorName?: string
  hasCustomizations: boolean
  customizationStatus: 'pending' | 'processing' | 'completed'
}

interface Order {
  _id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  items: OrderItem[]
  totalAmount?: number
  totalPrice?: number
  subtotal?: number
  totalPromoDiscount?: number
  appliedPromoCodes?: string[]
  orderStatus: 'pending' | 'processing' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  customizationStatus: 'none' | 'pending' | 'processing' | 'completed'
  hasCustomizableProducts: boolean
  createdAt: string
  updatedAt: string
  estimatedDelivery?: string
  actualDelivery?: string
  adminNotes?: string
  customerNotes?: string
}

interface OrderStats {
  totalOrders: number
  totalRevenue: number
  completedOrders: number
  pendingOrders: number
  processingOrders: number
  cancelledOrders: number
  customizationOrders: number
  avgOrderValue: number
}

interface OrderFilters {
  page: number
  limit: number
  status?: string
  paymentStatus?: string
  customizationStatus?: string
  search?: string
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const statusColors = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
  awaiting_customization: '#f59e0b',
}

const paymentStatusColors = {
  pending: '#f59e0b',
  paid: '#10b981',
  failed: '#ef4444',
  refunded: '#6b7280',
  free: '#22c55e',
}

const customizationStatusColors = {
  none: '#6b7280',
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  awaiting_customization: '#f59e0b',
}

const statusIcons = {
  pending: faClock,
  processing: faEdit,
  completed: faCheck,
  cancelled: faTimes,
  awaiting_customization: faClock,
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters and pagination
  const [filters, setFilters] = useState<OrderFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [customizationStatusFilter, setCustomizationStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams()
      queryParams.append('page', filters.page.toString())
      queryParams.append('limit', filters.limit.toString())
      queryParams.append('sortBy', filters.sortBy || 'createdAt')
      queryParams.append('sortOrder', filters.sortOrder || 'desc')

      if (filters.status) queryParams.append('status', filters.status)
      if (filters.paymentStatus) queryParams.append('paymentStatus', filters.paymentStatus)
      if (filters.customizationStatus) queryParams.append('customizationStatus', filters.customizationStatus)
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)

      const response = await fetch(`/api/admin/orders?${queryParams}`)

      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/orders/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.overview)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  // Load data on mount and filter changes
  useEffect(() => {
    fetchOrders()
    fetchStats()
  }, [filters])

  // Handle search with debounce
  useEffect(() => {
    setIsSearching(true)
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchTerm, page: 1 }))
      setIsSearching(false)
    }, 800) // Increased debounce time to 800ms

    return () => {
      clearTimeout(timer)
      setIsSearching(false)
    }
  }, [searchTerm])

  // Handle status filter changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
      customizationStatus: customizationStatusFilter !== 'all' ? customizationStatusFilter : undefined,
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
      page: 1,
    }))
  }, [statusFilter, paymentStatusFilter, customizationStatusFilter, dateRange])

  // Handle sorting
  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }))
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Get status icon
  const getSortIcon = (field: string) => {
    if (filters.sortBy !== field) return faSort
    return filters.sortOrder === 'asc' ? faSortUp : faSortDown
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <div className="error-state">
            <FontAwesomeIcon icon={faTimes} size="3x" />
            <h3>خطأ في تحميل الطلبات</h3>
            <p>{error}</p>
            <button onClick={fetchOrders} className="btn btn-primary">
              <FontAwesomeIcon icon={faRefresh} /> إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="orders-container">
      <div className="admin-content">
        {/* Header */}
        <div className="orders-header">
          <div className="header-content">
            <h1>إدارة الطلبات</h1>
            <p>إدارة طلبات العملاء والتخصيصات ورفع الملفات</p>
          </div>
          <div className="admin-header-actions">
            <button onClick={fetchOrders} className="btn btn-secondary" disabled={loading}>
              <FontAwesomeIcon icon={faRefresh} spin={loading} /> تحديث
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <FontAwesomeIcon icon={faShoppingCart} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalOrders}</div>
                <div className="stat-label">إجمالي الطلبات</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FontAwesomeIcon icon={faDollarSign} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
                <div className="stat-label">إجمالي الإيرادات</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FontAwesomeIcon icon={faCheck} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.completedOrders}</div>
                <div className="stat-label">مكتمل</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FontAwesomeIcon icon={faPalette} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.customizationOrders}</div>
                <div className="stat-label">التخصيصات</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FontAwesomeIcon icon={faClock} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.pendingOrders}</div>
                <div className="stat-label">في الانتظار</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FontAwesomeIcon icon={faEdit} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.processingOrders}</div>
                <div className="stat-label">قيد المعالجة</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="admin-filters">
          <div className="search-section">
            <div className="search-input-wrapper">
              <FontAwesomeIcon
                icon={isSearching ? faSpinner : faSearch}
                className={`search-icon ${isSearching ? 'fa-spin' : ''}`}
              />
              <input
                type="text"
                placeholder="البحث في الطلبات بالاسم أو البريد الإلكتروني أو رقم الطلب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="filters-section">
            <div className="filter-group">
              <FontAwesomeIcon icon={faFilter} className="filter-icon" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
                <option value="all">جميع الحالات</option>
                <option value="pending">في الانتظار</option>
                <option value="processing">قيد المعالجة</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>

            <div className="filter-group">
              <FontAwesomeIcon icon={faDollarSign} className="filter-icon" />
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">جميع حالات الدفع</option>
                <option value="pending">في الانتظار</option>
                <option value="paid">مدفوع</option>
                <option value="failed">فشل</option>
                <option value="refunded">مسترد</option>
              </select>
            </div>

            <div className="filter-group">
              <FontAwesomeIcon icon={faPalette} className="filter-icon" />
              <select
                value={customizationStatusFilter}
                onChange={(e) => setCustomizationStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">جميع حالات التخصيص</option>
                <option value="none">بدون تخصيص</option>
                <option value="pending">في الانتظار</option>
                <option value="processing">قيد المعالجة</option>
                <option value="completed">مكتمل</option>
              </select>
            </div>

            <div className="filter-group">
              <FontAwesomeIcon icon={faCalendar} className="filter-icon" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                className="filter-date"
                placeholder="Start Date"
              />
            </div>

            <div className="filter-group">
              <FontAwesomeIcon icon={faCalendar} className="filter-icon" />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                className="filter-date"
                placeholder="End Date"
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="admin-card">
          <div className="card-header">
            <h3>الطلبات ({orders.length})</h3>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="loading-state">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                <p>جاري تحميل الطلبات...</p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('orderNumber')} className="sortable">
                      رقم الطلب <FontAwesomeIcon icon={getSortIcon('orderNumber')} />
                    </th>
                    <th onClick={() => handleSort('customerName')} className="sortable">
                      العميل <FontAwesomeIcon icon={getSortIcon('customerName')} />
                    </th>
                    <th onClick={() => handleSort('createdAt')} className="sortable">
                      التاريخ <FontAwesomeIcon icon={getSortIcon('createdAt')} />
                    </th>
                    <th>المنتجات</th>
                    <th onClick={() => handleSort('totalPrice')} className="sortable">
                      المجموع <FontAwesomeIcon icon={getSortIcon('totalPrice')} />
                    </th>
                    <th>حالة الطلب</th>
                    <th>حالة الدفع</th>
                    <th>التخصيص</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <span className="order-id">{order.orderNumber}</span>
                      </td>
                      <td>
                        <div className="customer-info">
                          <div className="customer-name">{order.customerName}</div>
                          <div className="customer-email">{order.customerEmail}</div>
                        </div>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <div className="items-info">
                          <span>{order.items.length} منتج</span>
                          {order.hasCustomizableProducts && (
                            <span className="customization-badge">
                              <FontAwesomeIcon icon={faPalette} /> مخصص
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="order-total">{formatCurrency(order.totalPrice || order.totalAmount || 0)}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: `${statusColors[order.orderStatus]}20`,
                            color: statusColors[order.orderStatus],
                            border: `1px solid ${statusColors[order.orderStatus]}40`,
                          }}
                        >
                          <FontAwesomeIcon icon={statusIcons[order.orderStatus] || faClock} />
                          {order.orderStatus === 'pending'
                            ? 'في الانتظار'
                            : order.orderStatus === 'processing'
                            ? 'قيد المعالجة'
                            : order.orderStatus === 'completed'
                            ? 'مكتمل'
                            : order.orderStatus === 'cancelled'
                            ? 'ملغي'
                            : order.orderStatus === 'awaiting_customization'
                            ? 'في انتظار التخصيص'
                            : order.orderStatus}
                        </span>
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: `${paymentStatusColors[order.paymentStatus]}20`,
                            color: paymentStatusColors[order.paymentStatus],
                            border: `1px solid ${paymentStatusColors[order.paymentStatus]}40`,
                          }}
                        >
                          {order.paymentStatus === 'pending'
                            ? 'في الانتظار'
                            : order.paymentStatus === 'paid'
                            ? 'مدفوع'
                            : order.paymentStatus === 'failed'
                            ? 'فشل'
                            : order.paymentStatus === 'refunded'
                            ? 'مسترد'
                            : order.paymentStatus === 'free'
                            ? 'مجاني'
                            : order.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: `${customizationStatusColors[order.customizationStatus]}20`,
                            color: customizationStatusColors[order.customizationStatus],
                            border: `1px solid ${customizationStatusColors[order.customizationStatus]}40`,
                          }}
                        >
                          <FontAwesomeIcon icon={faPalette} />
                          {order.customizationStatus === 'none'
                            ? 'بدون تخصيص'
                            : order.customizationStatus === 'pending'
                            ? 'في الانتظار'
                            : order.customizationStatus === 'processing'
                            ? 'قيد المعالجة'
                            : order.customizationStatus === 'completed'
                            ? 'مكتمل'
                            : order.customizationStatus === 'awaiting_customization'
                            ? 'في انتظار التخصيص'
                            : order.customizationStatus}
                        </span>

                        {/* Red Alert for Orders Needing Customer Input */}
                        {order.hasCustomizableProducts &&
                          order.customizationStatus === 'pending' &&
                          (order.paymentStatus === 'paid' || order.paymentStatus === 'free') && (
                            <div className="customization-alert" title="يحتاج مراجعة التخصيصات">
                              <FontAwesomeIcon icon={faExclamationTriangle} />
                              <span>يحتاج مراجعة</span>
                            </div>
                          )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view-btn"
                            title="View Order Details"
                            onClick={() => router.push(`/admin/orders/${order._id}`)}
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          {order.hasCustomizableProducts &&
                            (order.orderStatus === 'pending' || order.orderStatus === 'processing') && (
                              <button
                                className="action-btn upload-btn"
                                title="Upload Design Files"
                                onClick={() => router.push(`/admin/orders/${order._id}/upload`)}
                              >
                                <FontAwesomeIcon icon={faUpload} />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!loading && orders.length === 0 && (
              <div className="empty-state">
                <FontAwesomeIcon icon={faShoppingCart} size="3x" />
                <h3>لا توجد طلبات</h3>
                <p>
                  {searchTerm ||
                  statusFilter !== 'all' ||
                  paymentStatusFilter !== 'all' ||
                  customizationStatusFilter !== 'all'
                    ? 'جرب تعديل معايير البحث أو التصفية'
                    : 'ستظهر الطلبات هنا عندما يضع العملاء طلباتهم'}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {orders.length > 0 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page <= 1}
                className="pagination-btn"
              >
                السابق
              </button>
              <span className="pagination-info">
                صفحة {filters.page} من {Math.ceil(orders.length / filters.limit)}
              </span>
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={orders.length < filters.limit}
                className="pagination-btn"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
