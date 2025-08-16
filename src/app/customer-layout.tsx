'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faSearch, faBars, faSignInAlt, faSignOutAlt, faBox } from '@fortawesome/free-solid-svg-icons'
import { faDiscord, faWhatsapp, faTelegram, faYoutube, faTiktok } from '@fortawesome/free-brands-svg-icons'
import { CartProvider } from '@/contexts/CartContext'
import CartDropdown from '@/components/ui/CartDropdown'
import './customer-layout.css'

// Types
// interface Category {
//   _id: string
//   name: string
//   slug: string
//   description?: string
//   image?: string
//   icon?: string
//   color?: string
//   order: number
//   isFeatured: boolean
//   designCount: number
//   viewCount: number
// }

interface CustomerLayoutProps {
  children: ReactNode
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  type NavCategory = { _id: string; name: string; slug: string }
  const [categories, setCategories] = useState<NavCategory[]>([])
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [branding, setBranding] = useState<{ logoUrl?: string } | null>(null)
  const [social, setSocial] = useState<{
    telegram?: string
    discord?: string
    whatsapp?: string
    youtube?: string
    tiktok?: string
    text?: string
  }>({})

  // Fetch categories for navigation
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()

        if (data.success) {
          setCategories(data.data)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
    // Fetch site settings for branding and social
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        setBranding(res?.data?.branding || null)
        setSocial(res?.data?.social || {})
      })
      .catch(() => {})
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen)
  }

  const closeUserDropdown = () => {
    setIsUserDropdownOpen(false)
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <CartProvider>
      <div className="customer-layout">
        {/* Header */}
        <header className="customer-header">
          <div className="container">
            <div className="nav-container">
              {/* Left Side - User Actions */}
              <div className="nav-left">
                <div className="nav-actions">
                  <div className="action-item cart-action">
                    <CartDropdown />
                  </div>

                  {/* Orders Icon - Only show if logged in */}
                  {session?.user && (
                    <div className="action-item">
                      <Link href="/customer/orders" className="action-link">
                        <FontAwesomeIcon icon={faBox} className="action-icon" />
                      </Link>
                    </div>
                  )}

                  {/* User Dropdown */}
                  <div className="action-item user-dropdown-container">
                    {session?.user ? (
                      // Logged in user - show profile image
                      <div className="user-profile" onClick={toggleUserDropdown}>
                        {session.user.image ? (
                          <Image
                            src={session.user.image}
                            alt={session.user.name || 'User'}
                            width={32}
                            height={32}
                            className="user-avatar"
                          />
                        ) : (
                          <div className="user-avatar-placeholder">
                            <FontAwesomeIcon icon={faUser} />
                          </div>
                        )}
                      </div>
                    ) : (
                      // Not logged in - show user icon
                      <div className="user-icon" onClick={toggleUserDropdown}>
                        <FontAwesomeIcon icon={faUser} className="action-icon" />
                      </div>
                    )}

                    {/* User Dropdown Menu */}
                    <div className={`user-dropdown ${isUserDropdownOpen ? 'open' : ''}`}>
                      {session?.user ? (
                        // Logged in user menu
                        <>
                          <div className="dropdown-header">
                            <span className="user-name">{session.user.name}</span>
                            <span className="user-email">{session.user.email}</span>
                          </div>
                          <div className="dropdown-divider"></div>
                          {session?.user.role === 'admin' ? (
                            <Link href="/admin/dashboard" className="dropdown-item" onClick={closeUserDropdown}>
                              <FontAwesomeIcon icon={faUser} />
                              لوحة التحكم
                            </Link>
                          ) : (
                            <Link href="/customer/dashboard" className="dropdown-item" onClick={closeUserDropdown}>
                              <FontAwesomeIcon icon={faUser} />
                              لوحة التحكم
                            </Link>
                          )}
                          <button className="dropdown-item logout-btn" onClick={handleLogout}>
                            <FontAwesomeIcon icon={faSignOutAlt} />
                            تسجيل الخروج
                          </button>
                        </>
                      ) : (
                        // Not logged in menu
                        <Link href="/auth/signin" className="dropdown-item login-btn" onClick={closeUserDropdown}>
                          <FontAwesomeIcon icon={faSignInAlt} />
                          تسجيل الدخول
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="action-item">
                    <FontAwesomeIcon icon={faSearch} className="action-icon" />
                  </div>
                </div>
              </div>

              {/* Center - Navigation Links */}
              <nav className="nav-center">
                <ul className="nav-menu">
                  {!isLoading &&
                    categories.map((category) => (
                      <li key={category._id}>
                        <Link
                          href={`/categories/${category.slug}`}
                          className={`nav-link ${pathname === `/category/${category.slug}` ? 'active' : ''}`}
                          onClick={closeMenu}
                        >
                          {category.name}
                        </Link>
                      </li>
                    ))}
                </ul>
              </nav>

              {/* Right Side - Logo */}
              <div className="nav-right">
                <Link href="/" className="logo-link">
                  <Image
                    src={branding?.logoUrl || '/site/logo.png'}
                    alt="Prestige Designs Logo"
                    width={120}
                    height={40}
                    className="logo-image"
                    priority
                    unoptimized
                  />
                </Link>
              </div>

              {/* Mobile Menu Toggle */}
              <button className="mobile-menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
                <FontAwesomeIcon icon={faBars} />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className={`nav-mobile ${isMenuOpen ? 'open' : ''}`}>
              <ul className="nav-menu">
                <li>
                  <Link
                    href="/packages"
                    className={`nav-link ${pathname === '/packages' ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    باقات
                  </Link>
                </li>
                {!isLoading &&
                  categories.map((category) => (
                    <li key={category._id}>
                      <Link
                        href={`/categories/${category.slug}`}
                        className={`nav-link ${pathname === `/category/${category.slug}` ? 'active' : ''}`}
                        onClick={closeMenu}
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">{children}</main>

        {/* Footer */}
        <footer className="customer-footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-section">
                <h3 className="text-neon-green">Prestige Designs</h3>
                <p>منصة تصميم متقدمة تقدم حلول إبداعية ومبتكرة</p>
              </div>

              <div className="footer-section">
                <h4>تواصل معنا</h4>
                {social.text && <p className="social-text">{social.text}</p>}
                <div className="social-links">
                  {social.discord && (
                    <a
                      href={social.discord}
                      className="social-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Discord"
                    >
                      <FontAwesomeIcon icon={faDiscord} />
                    </a>
                  )}
                  {social.whatsapp && (
                    <a
                      href={social.whatsapp}
                      className="social-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp"
                    >
                      <FontAwesomeIcon icon={faWhatsapp} />
                    </a>
                  )}
                  {social.telegram && (
                    <a
                      href={social.telegram}
                      className="social-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Telegram"
                    >
                      <FontAwesomeIcon icon={faTelegram} />
                    </a>
                  )}
                  {social.youtube && (
                    <a
                      href={social.youtube}
                      className="social-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="YouTube"
                    >
                      <FontAwesomeIcon icon={faYoutube} />
                    </a>
                  )}
                  {social.tiktok && (
                    <a
                      href={social.tiktok}
                      className="social-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="TikTok"
                    >
                      <FontAwesomeIcon icon={faTiktok} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="footer-bottom">
              <p>&copy; {new Date().getFullYear()} Prestige Designs. جميع الحقوق محفوظة</p>
            </div>
          </div>
        </footer>

        {/* Floating WhatsApp Button */}
        {social.whatsapp && (
          <a
            href={social.whatsapp}
            className="floating-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contact us on WhatsApp"
          >
            <FontAwesomeIcon icon={faWhatsapp} className="whatsapp-icon" />
          </a>
        )}
      </div>
    </CartProvider>
  )
}
