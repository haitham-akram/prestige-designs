/**
 * Admin Users Management Page
 *
 * This page allows admins to view and manage all users in the system.
 * Features include viewing user details, changing roles, and managing user status.
 *
 * Access: Admin only (protected by middleware)
 */

'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers,
  faSearch,
  faUserTie,
  faUser,
  faCrown,
  faEye,
  faEdit,
  faTrash,
  faCheck,
  faTimes,
  faPlus,
} from '@fortawesome/free-solid-svg-icons'
import './users.css'

interface User {
  _id: string
  name: string
  email: string
  role: 'admin' | 'customer'
  isActive?: boolean
  createdAt: string
  lastLogin?: string
  avatar?: string
  purchaseCount?: number
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function AdminUsers() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
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

  const fetchUsers = useCallback(
    async (page = 1, showLoading = true) => {
      if (session?.user?.role !== 'admin') return

      try {
        if (showLoading) setLoading(true)
        setError('')

        // Ensure pagination exists
        const currentPagination = pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }

        const params = new URLSearchParams()
        params.append('page', (page || 1).toString())
        params.append('limit', (currentPagination.limit || 10).toString())

        if (searchTerm && searchTerm.trim()) {
          params.append('search', searchTerm.trim())
        }

        if (roleFilter && roleFilter !== 'all') {
          params.append('role', roleFilter)
        }

        if (statusFilter && statusFilter !== 'all') {
          params.append('status', statusFilter)
        }

        const response = await fetch(`/api/admin/users?${params.toString()}`)

        if (response.ok) {
          const responseData = await response.json()

          // Extract data from nested structure
          const data = responseData.data

          setUsers(data?.users || [])
          setPagination({
            page: data?.page || 1,
            limit: data?.limit || 10,
            total: data?.total || 0,
            totalPages: data?.totalPages || 0,
          })
        } else {
          const errorText = await response.text()
          setError('Failed to load users')
        }
      } catch (error) {
        console.error('Error fetching users:', error)
        setError('Failed to load users')
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [session, searchTerm, roleFilter, statusFilter, pagination.limit]
  )

  useEffect(() => {
    // Only fetch data if we haven't loaded it yet and user is admin
    if (session?.user?.role === 'admin' && !dataLoadedRef.current) {
      dataLoadedRef.current = true
      fetchUsers(1, true)
    }
  }, [session, fetchUsers])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dataLoadedRef.current && session?.user?.role === 'admin') {
        fetchUsers(1, false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm, roleFilter, statusFilter, fetchUsers, session])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers(1, false)
  }

  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, false)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users?.map((user) => user._id) || [])
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, userId])
    } else {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId))
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete' | 'makeAdmin' | 'makeCustomer') => {
    if (selectedUsers.length === 0) return

    // Check if admin is trying to deactivate themselves
    if (action === 'deactivate' && selectedUsers.includes(session?.user?.id || '')) {
      setError('لا يمكنك إلغاء تفعيل حسابك الخاص')
      return
    }

    // Check if admin is trying to delete themselves
    if (action === 'delete' && selectedUsers.includes(session?.user?.id || '')) {
      setError('لا يمكنك حذف حسابك الخاص')
      return
    }

    // Check if admin is trying to demote themselves to customer
    if (action === 'makeCustomer' && selectedUsers.includes(session?.user?.id || '')) {
      setError('لا يمكنك تحويل نفسك إلى عميل')
      return
    }

    try {
      setBulkActionLoading(true)
      setError('')

      const response = await fetch('/api/admin/users/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          action,
        }),
      })

      if (response.ok) {
        // Update local state
        const updatedUsers = users
          .map((user) => {
            if (selectedUsers.includes(user._id)) {
              if (action === 'activate') {
                return { ...user, isActive: true }
              } else if (action === 'deactivate') {
                return { ...user, isActive: false }
              } else if (action === 'makeAdmin') {
                return { ...user, role: 'admin' as const }
              } else if (action === 'makeCustomer') {
                return { ...user, role: 'customer' as const }
              } else if (action === 'delete') {
                return null
              }
            }
            return user
          })
          .filter((user): user is User => user !== null)

        setUsers(updatedUsers)
        setSelectedUsers([])
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to perform bulk action')
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
      setError('Failed to perform bulk action')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <FontAwesomeIcon icon={faCrown} className="role-icon admin" />
      case 'customer':
        return <FontAwesomeIcon icon={faUser} className="role-icon customer" />
      default:
        return <FontAwesomeIcon icon={faUserTie} className="role-icon" />
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'مدير'
      case 'customer':
        return 'عميل'
      default:
        return role
    }
  }

  // Helper functions to determine button visibility
  const getSelectedUsersData = () => {
    return users.filter((user) => selectedUsers.includes(user._id))
  }

  const shouldShowActivateButton = () => {
    const selectedUsersData = getSelectedUsersData()
    return selectedUsersData.some((user) => user.isActive === false)
  }

  const shouldShowDeactivateButton = () => {
    const selectedUsersData = getSelectedUsersData()
    return selectedUsersData.some((user) => user.isActive !== false)
  }

  const shouldShowMakeAdminButton = () => {
    const selectedUsersData = getSelectedUsersData()
    return selectedUsersData.some((user) => user.role === 'customer')
  }

  const shouldShowMakeCustomerButton = () => {
    const selectedUsersData = getSelectedUsersData()
    // Only show if there are admins selected AND the current admin is not among them
    return (
      selectedUsersData.some((user) => user.role === 'admin') &&
      !selectedUsersData.some((user) => user._id === session?.user?.id)
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div className="admin-users">
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
    <div className="admin-users">
      {/* Header */}
      <div className="users-header">
        <div className="users-header-content">
          <div>
            <h1 className="users-title">
              <FontAwesomeIcon icon={faUsers} />
              إدارة المستخدمين
            </h1>
            <p className="users-subtitle">عرض وإدارة جميع المستخدمين في النظام</p>
          </div>
          <div className="users-actions">{/* Users are added through registration/login only */}</div>
        </div>
      </div>

      {/* Content */}
      <div className="users-content">
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError('')} className="error-close">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}

        {/* Filters and Search */}
        <div className="admin-users-filters">
          <form onSubmit={handleSearch} className="admin-search-form">
            <div className="admin-search-input-group">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="البحث في المستخدمين..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <button type="submit" className="search-btn">
              بحث
            </button>
          </form>

          <div className="admin-filter-group">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="admin-filter-select">
              <option value="all">جميع الأدوار</option>
              <option value="admin">مدير</option>
              <option value="customer">عميل</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-filter-select"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('')
                setRoleFilter('all')
                setStatusFilter('all')
              }}
              className="clear-filters-btn"
            >
              مسح الفلاتر
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="bulk-actions">
            <div className="bulk-info">تم تحديد {selectedUsers.length} مستخدم</div>
            <div className="bulk-buttons">
              {shouldShowActivateButton() && (
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionLoading}
                  className="admin-btn admin-btn-sm admin-btn-success"
                >
                  {bulkActionLoading ? 'جاري التفعيل...' : 'تفعيل المحدد'}
                </button>
              )}
              {shouldShowDeactivateButton() && (
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={bulkActionLoading || selectedUsers.includes(session?.user?.id || '')}
                  className="admin-btn admin-btn-sm admin-btn-warning"
                  title={selectedUsers.includes(session?.user?.id || '') ? 'لا يمكنك إلغاء تفعيل حسابك الخاص' : ''}
                >
                  {bulkActionLoading ? 'جاري الإلغاء...' : 'إلغاء تفعيل المحدد'}
                </button>
              )}
              {shouldShowMakeAdminButton() && (
                <button
                  onClick={() => handleBulkAction('makeAdmin')}
                  disabled={bulkActionLoading}
                  className="admin-btn admin-btn-sm admin-btn-info"
                >
                  {bulkActionLoading ? 'جاري التحديث...' : 'تعيين كمدير'}
                </button>
              )}
              {shouldShowMakeCustomerButton() && (
                <button
                  onClick={() => handleBulkAction('makeCustomer')}
                  disabled={bulkActionLoading}
                  className="admin-btn admin-btn-sm admin-btn-secondary"
                >
                  {bulkActionLoading ? 'جاري التحديث...' : 'تعيين كعميل'}
                </button>
              )}
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionLoading || selectedUsers.includes(session?.user?.id || '')}
                className="admin-btn admin-btn-sm admin-btn-danger"
                title={selectedUsers.includes(session?.user?.id || '') ? 'لا يمكنك حذف حسابك الخاص' : ''}
              >
                {bulkActionLoading ? 'جاري الحذف...' : 'حذف المحدد'}
              </button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === (users?.length || 0) && (users?.length || 0) > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="select-checkbox"
                  />
                </th>
                <th>المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>تاريخ التسجيل</th>
                <th>آخر تسجيل دخول</th>
                <th>عدد المشتريات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {!users || users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-data">
                    <div className="no-data-content">
                      <FontAwesomeIcon icon={faUsers} />
                      <p>لا يوجد مستخدمين</p>
                      <Link href="/admin/users/new" className="add-first-user-btn">
                        إضافة أول مستخدم
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                users?.map((user) => (
                  <tr
                    key={user._id}
                    className={selectedUsers.includes(user._id) ? 'selected' : ''}
                    data-user-id={user._id}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={(e) => handleSelectUser(user._id, e.target.checked)}
                        className="select-checkbox"
                      />
                    </td>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {user.avatar ? (
                            <Image
                              src={user.avatar}
                              alt={user.name || 'User'}
                              width={40}
                              height={40}
                              className="avatar-image"
                              onError={() => {
                                // Fallback to initials if image fails to load
                                const avatarElement = document.querySelector(
                                  `[data-user-id="${user._id}"] .avatar-image`
                                )
                                const initialsElement = document.querySelector(
                                  `[data-user-id="${user._id}"] .avatar-initials`
                                )
                                if (avatarElement) avatarElement.style.display = 'none'
                                if (initialsElement) initialsElement.classList.remove('fallback')
                              }}
                            />
                          ) : null}
                          <div className={`avatar-initials ${user.avatar ? 'fallback' : ''}`}>
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.name || 'مستخدم بدون اسم'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <div className="role-badge">
                        {getRoleIcon(user.role)}
                        <span>{getRoleText(user.role)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${user.isActive !== false ? 'active' : 'inactive'}`}>
                        {user.isActive !== false ? (
                          <>
                            <FontAwesomeIcon icon={faCheck} />
                            نشط
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faTimes} />
                            غير نشط
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td>
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'لم يسجل دخول'}
                    </td>
                    <td>
                      <div className="purchase-count">{user.purchaseCount || 0}</div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          title={user._id === session?.user?.id ? 'لا يمكنك حذف حسابك الخاص' : 'حذف'}
                          disabled={user._id === session?.user?.id}
                          onClick={() => {
                            if (user._id === session?.user?.id) {
                              setError('لا يمكنك حذف حسابك الخاص')
                            }
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

            <div className="pagination-info">
              صفحة {pagination.page} من {pagination.totalPages}
            </div>

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
    </div>
  )
}
