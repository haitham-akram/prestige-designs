'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChartLine,
  faFolder,
  faUsers,
  faCog,
  faHome,
  faSignOutAlt,
  faShoppingCart,
  faBars,
  faBox,
  faTicketAlt,
  faStar,
} from '@fortawesome/free-solid-svg-icons'
import './admin-layout.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Helper function to get user initials
  const getUserInitials = (user: any) => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map((name: string) => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'AD' // Default fallback
  }

  // Helper function to check if a navigation item is active
  const isActive = (href: string) => {
    return pathname === href
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'admin') {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner">
          <div className="admin-spinner"></div>
          <p>Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  return (
    <div className="admin-layout-container">
      <div className="admin-layout">
        {/* Desktop Sidebar */}
        <nav className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="admin-sidebar-header">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <FontAwesomeIcon icon={faBars} />
            </button>

            {/* Profile Picture */}
            <div className="admin-profile">
              {session.user.image ? (
                <Image src={session.user.image} alt="Profile" width={48} height={48} className="profile-image" />
              ) : (
                <div className="profile-initials">{getUserInitials(session.user)}</div>
              )}
            </div>

            {!sidebarCollapsed && (
              <div className="admin-info">
                <h2>لوحة التحكم</h2>
                <p>مرحبا بك, {session.user.name || session.user.email}</p>
              </div>
            )}
          </div>

          <div className="admin-nav">
            <Link
              href="/admin/dashboard"
              className={`nav-item ${isActive('/admin/dashboard') ? 'active' : ''}`}
              title="Dashboard"
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faChartLine} />
              </span>
              <span className="nav-text">لوحة التحكم</span>
            </Link>

            <Link
              href="/admin/categories"
              className={`nav-item ${isActive('/admin/categories') ? 'active' : ''}`}
              title="Categories"
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faFolder} />
              </span>
              <span className="nav-text">التصنيفات</span>
            </Link>

            <Link
              href="/admin/products"
              className={`nav-item ${isActive('/admin/products') ? 'active' : ''}`}
              title="Products"
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faBox} />
              </span>
              <span className="nav-text">المنتجات</span>
            </Link>

            <Link
              href="/admin/orders"
              className={`nav-item ${isActive('/admin/orders') ? 'active' : ''}`}
              title="Orders"
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faShoppingCart} />
              </span>
              <span className="nav-text">الطلبات</span>
            </Link>

            <Link
              href="/admin/promo-codes"
              className={`nav-item ${isActive('/admin/promo-codes') ? 'active' : ''}`}
              title="Promo Codes"
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faTicketAlt} />
              </span>
              <span className="nav-text">رموز الخصم</span>
            </Link>

            <Link href="/admin/users" className={`nav-item ${isActive('/admin/users') ? 'active' : ''}`} title="Users">
              <span className="nav-icon">
                <FontAwesomeIcon icon={faUsers} />
              </span>
              <span className="nav-text">المستخدمين</span>
            </Link>

            <Link
              href="/admin/reviews"
              className={`nav-item ${isActive('/admin/reviews') ? 'active' : ''}`}
              title="Reviews"
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faStar} />
              </span>
              <span className="nav-text">التقييمات</span>
            </Link>

            <Link
              href="/admin/settings"
              className={`nav-item ${isActive('/admin/settings') ? 'active' : ''}`}
              title="Settings"
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faCog} />
              </span>
              <span className="nav-text">الاعدادات</span>
            </Link>
          </div>

          <div className="admin-sidebar-footer">
            <Link href="/" className="nav-item" title="Back to Site">
              <span className="nav-icon">
                <FontAwesomeIcon icon={faHome} />
              </span>
              <span className="nav-text">العودة للمتجر</span>
            </Link>

            <button
              onClick={() => {
                signOut({
                  callbackUrl: '/auth/signin',
                })
              }}
              className="nav-item nav-signout"
              title="Sign Out"
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faSignOutAlt} />
              </span>
              <span className="nav-text">تسجيل الخروج</span>
            </button>
          </div>
        </nav>

        {/* Mobile/Tablet Bottom Navigation */}
        <nav className="admin-bottom-nav">
          <Link href="/admin/dashboard" className={`bottom-nav-item ${isActive('/admin/dashboard') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">
              <FontAwesomeIcon icon={faChartLine} />
            </span>
          </Link>

          <Link href="/admin/categories" className={`bottom-nav-item ${isActive('/admin/categories') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">
              <FontAwesomeIcon icon={faFolder} />
            </span>
          </Link>

          <Link href="/admin/products" className={`bottom-nav-item ${isActive('/admin/products') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">
              <FontAwesomeIcon icon={faBox} />
            </span>
          </Link>

          <Link href="/admin/orders" className={`bottom-nav-item ${isActive('/admin/orders') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">
              <FontAwesomeIcon icon={faShoppingCart} />
            </span>
          </Link>

          <Link
            href="/admin/promo-codes"
            className={`bottom-nav-item ${isActive('/admin/promo-codes') ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">
              <FontAwesomeIcon icon={faTicketAlt} />
            </span>
          </Link>

          <Link href="/admin/users" className={`bottom-nav-item ${isActive('/admin/users') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">
              <FontAwesomeIcon icon={faUsers} />
            </span>
          </Link>

          <Link href="/admin/reviews" className={`bottom-nav-item ${isActive('/admin/reviews') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">
              <FontAwesomeIcon icon={faStar} />
            </span>
          </Link>

          <Link href="/admin/settings" className={`bottom-nav-item ${isActive('/admin/settings') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">
              <FontAwesomeIcon icon={faCog} />
            </span>
          </Link>

          <Link href="/" className="bottom-nav-item">
            <span className="bottom-nav-icon">
              <FontAwesomeIcon icon={faHome} />
            </span>
          </Link>

          <button
            onClick={() => {
              signOut({
                callbackUrl: '/auth/signin',
              })
            }}
            className="bottom-nav-item bottom-nav-signout"
          >
            <span className="bottom-nav-icon">
              <FontAwesomeIcon icon={faSignOutAlt} />
            </span>
          </button>
        </nav>

        <main className="admin-main">{children}</main>
      </div>
    </div>
  )
}
