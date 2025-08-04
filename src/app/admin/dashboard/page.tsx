/**
 * Admin Dashboard Page
 *
 * This page serves as the main admin dashboard for managing the Prestige Designs store.
 * Only users with admin role can access this page.
 *
 * Features:
 * - User management overview
 * - Store statistics
 * - Quick actions for admin tasks
 * - Navigation to admin features
 * - Category management
 *
 * Access: Admin only (protected by middleware)
 */

'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers,
  faUserTie,
  faTags,
  faBox,
  faTicketAlt,
  faShoppingCart,
  faChartLine,
  faExclamationTriangle,
  faPercent,
  faDollarSign,
} from '@fortawesome/free-solid-svg-icons'
import './dashboard.css'

interface DashboardStats {
  totalUsers: number
  totalCustomers: number
  totalAdmins: number
  totalCategories: number
  totalProducts: number
  totalPromoCodes: number
  totalOrders: number
}

interface PromoCodeStats {
  overview: {
    total: number
    active: number
    inactive: number
    expired: number
    notYetActive: number
    used: number
    unused: number
  }
  usage: {
    totalUsage: number
    averageUsage: number
    maxUsage: number
    totalDiscountValue: number
  }
  topUsed: Array<{
    _id: string
    code: string
    usageCount: number
    usageLimit?: number
    discountType: string
    discountValue: number
    description?: string
    usagePercentage: number
  }>
  expiringSoon: Array<{
    _id: string
    code: string
    endDate: string
    usageCount: number
    usageLimit?: number
    daysUntilExpiry: number
    usagePercentage: number
  }>
  discountTypes: Array<{
    _id: string
    count: number
    totalUsage: number
  }>
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [promoStats, setPromoStats] = useState<PromoCodeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  // Track if data has been loaded to prevent unnecessary reloads
  const dataLoadedRef = useRef(false)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.role !== 'admin') {
      router.push('/customer/dashboard')
      return
    }
  }, [status, session, router])

  const fetchDashboardData = useCallback(async () => {
    if (session?.user?.role !== 'admin') return

    try {
      setLoading(true)
      setError('')

      // Fetch basic stats
      const statsResponse = await fetch('/api/admin/dashboard/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.data)
      }

      // Fetch promo code stats
      const promoResponse = await fetch('/api/admin/promo-codes/stats')
      console.log('Promo stats response:', promoResponse.status)
      if (promoResponse.ok) {
        const promoData = await promoResponse.json()
        console.log('Promo stats data:', promoData)
        setPromoStats(promoData.data)
      } else {
        console.error('Failed to fetch promo stats:', promoResponse.status)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    // Only fetch data if we haven't loaded it yet and user is admin
    if (session?.user?.role === 'admin' && !dataLoadedRef.current) {
      dataLoadedRef.current = true
      fetchDashboardData()
    }
  }, [session, fetchDashboardData])

  const handleSignOut = async () => {
    await signOut({
      callbackUrl: '/auth/signin',
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="admin-dashboard">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4 mx-auto"></div>
            <div>جاري التحميل...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') {
    return null
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div>
            <h1 className="dashboard-title">لوحة التحكم</h1>
            <p className="dashboard-subtitle">مرحباً بك في لوحة تحكم Prestige Designs</p>
          </div>
          <div className="dashboard-user-info">
            <div className="user-role">
              الدور: <span className="user-role-value">مدير</span>
            </div>
            <button onClick={handleSignOut} className="sign-out-btn">
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {error && (
          <div
            style={{
              background: 'var(--error-color)',
              color: 'white',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-icon users">
                <FontAwesomeIcon icon={faUsers} />
              </div>
              <div className="stat-info">
                <p className="stat-label">إجمالي المستخدمين</p>
                <p className="stat-value">{stats?.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-icon customers">
                <FontAwesomeIcon icon={faUserTie} />
              </div>
              <div className="stat-info">
                <p className="stat-label">العملاء</p>
                <p className="stat-value">{stats?.totalCustomers || 0}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-icon categories">
                <FontAwesomeIcon icon={faTags} />
              </div>
              <div className="stat-info">
                <p className="stat-label">التصنيفات</p>
                <p className="stat-value">{stats?.totalCategories || 0}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-icon products">
                <FontAwesomeIcon icon={faBox} />
              </div>
              <div className="stat-info">
                <p className="stat-label">المنتجات</p>
                <p className="stat-value">{stats?.totalProducts || 0}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-icon promocodes">
                <FontAwesomeIcon icon={faTicketAlt} />
              </div>
              <div className="stat-info">
                <p className="stat-label">رموز الخصم</p>
                <p className="stat-value">{stats?.totalPromoCodes || 0}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-icon orders">
                <FontAwesomeIcon icon={faShoppingCart} />
              </div>
              <div className="stat-info">
                <p className="stat-label">الطلبات</p>
                <p className="stat-value">{stats?.totalOrders || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Promo Code Statistics */}
        <div className="promo-stats-section">
          <h3 className="promo-stats-title">
            <FontAwesomeIcon icon={faChartLine} />
            إحصائيات رموز الخصم
          </h3>

          {/* Overview Stats */}
          <div className="promo-stats-grid">
            <div className="promo-stat-item">
              <div className="promo-stat-value">{promoStats?.overview?.total || 0}</div>
              <div className="promo-stat-label">إجمالي الرموز</div>
            </div>
            <div className="promo-stat-item">
              <div className="promo-stat-value">{promoStats?.overview?.active || 0}</div>
              <div className="promo-stat-label">نشط</div>
            </div>
            <div className="promo-stat-item">
              <div className="promo-stat-value">{promoStats?.overview?.used || 0}</div>
              <div className="promo-stat-label">مستخدم</div>
            </div>
            <div className="promo-stat-item">
              <div className="promo-stat-value">{promoStats?.overview?.expired || 0}</div>
              <div className="promo-stat-label">منتهي الصلاحية</div>
            </div>
            <div className="promo-stat-item">
              <div className="promo-stat-value">{promoStats?.usage?.totalUsage || 0}</div>
              <div className="promo-stat-label">إجمالي الاستخدام</div>
            </div>
            <div className="promo-stat-item">
              <div className="promo-stat-value">{promoStats?.usage?.averageUsage || 0}</div>
              <div className="promo-stat-label">متوسط الاستخدام</div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="promo-stats-details">
            {/* Top Used Promo Codes */}
            <div className="promo-detail-card">
              <h4 className="promo-detail-title">أكثر الرموز استخداماً</h4>
              <ul className="promo-detail-list">
                {promoStats?.topUsed?.slice(0, 5).map((promo) => (
                  <li key={promo._id} className="promo-detail-item">
                    <span className="promo-detail-name">{promo.code}</span>
                    <span className="promo-detail-value">{promo.usageCount} استخدام</span>
                  </li>
                )) || <li className="promo-detail-item">لا توجد بيانات</li>}
              </ul>
            </div>

            {/* Expiring Soon */}
            <div className="promo-detail-card">
              <h4 className="promo-detail-title">
                <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: 'var(--warning-color)' }} />
                تنتهي قريباً
              </h4>
              <ul className="promo-detail-list">
                {promoStats?.expiringSoon?.slice(0, 5).map((promo) => (
                  <li key={promo._id} className="promo-detail-item">
                    <span className="promo-detail-name">{promo.code}</span>
                    <span className="promo-detail-value">{promo.daysUntilExpiry} يوم</span>
                  </li>
                )) || <li className="promo-detail-item">لا توجد بيانات</li>}
              </ul>
            </div>

            {/* Discount Types */}
            <div className="promo-detail-card">
              <h4 className="promo-detail-title">
                <FontAwesomeIcon icon={faPercent} />
                أنواع الخصم
              </h4>
              <ul className="promo-detail-list">
                {promoStats?.discountTypes?.map((type) => (
                  <li key={type._id} className="promo-detail-item">
                    <span className="promo-detail-name">{type._id === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</span>
                    <span className="promo-detail-value">{type.count} رمز</span>
                  </li>
                )) || <li className="promo-detail-item">لا توجد بيانات</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h3 className="quick-actions-title">الإجراءات السريعة</h3>
          <div className="quick-actions-grid">
            <Link href="/admin/categories" className="quick-action-card">
              <h4 className="quick-action-title">إدارة الفئات</h4>
              <p className="quick-action-desc">إضافة وتعديل وحذف فئات المنتجات</p>
            </Link>

            <Link href="/admin/products" className="quick-action-card">
              <h4 className="quick-action-title">إدارة المنتجات</h4>
              <p className="quick-action-desc">إضافة وتعديل وحذف المنتجات</p>
            </Link>

            <Link href="/admin/promo-codes" className="quick-action-card">
              <h4 className="quick-action-title">إدارة رموز الخصم</h4>
              <p className="quick-action-desc">إنشاء وإدارة رموز الخصم والعروض</p>
            </Link>

            <Link href="/admin/orders" className="quick-action-card">
              <h4 className="quick-action-title">إدارة الطلبات</h4>
              <p className="quick-action-desc">عرض وإدارة طلبات العملاء</p>
            </Link>

            <Link href="/admin/users" className="quick-action-card">
              <h4 className="quick-action-title">إدارة المستخدمين</h4>
              <p className="quick-action-desc">إدارة حسابات المستخدمين والصلاحيات</p>
            </Link>

            <div className="quick-action-card">
              <h4 className="quick-action-title">إعدادات المتجر</h4>
              <p className="quick-action-desc">تكوين إعدادات المتجر العامة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
