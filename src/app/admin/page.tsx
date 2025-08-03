'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import './dashboard.css'

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState({
    totalCategories: 0,
    activeCategories: 0,
    totalDesigns: 0,
    totalUsers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch categories stats
      const categoriesResponse = await fetch('/api/admin/categories')
      const categoriesData = await categoriesResponse.json()

      if (categoriesResponse.ok) {
        setStats((prev) => ({
          ...prev,
          totalCategories: categoriesData.categories?.length || 0,
          activeCategories: categoriesData.categories?.filter((c: any) => c.isActive).length || 0,
        }))
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {session?.user?.name || session?.user?.email}!</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">📂</div>
          <div className="stat-info">
            <h3>{stats.totalCategories}</h3>
            <p>Total Categories</p>
          </div>
          <Link href="/admin/categories" className="stat-link">
            Manage →
          </Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{stats.activeCategories}</h3>
            <p>Active Categories</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎨</div>
          <div className="stat-info">
            <h3>{stats.totalDesigns}</h3>
            <p>Total Designs</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <h2>Quick Actions</h2>
        <div className="action-cards">
          <Link href="/admin/categories" className="action-card">
            <div className="action-icon">📂</div>
            <h3>Manage Categories</h3>
            <p>Add, edit, or organize your categories</p>
          </Link>

          <Link href="/admin/designs" className="action-card">
            <div className="action-icon">🎨</div>
            <h3>Manage Designs</h3>
            <p>Upload and organize design assets</p>
          </Link>

          <Link href="/admin/users" className="action-card">
            <div className="action-icon">👥</div>
            <h3>User Management</h3>
            <p>View and manage user accounts</p>
          </Link>

          <Link href="/admin/settings" className="action-card">
            <div className="action-icon">⚙️</div>
            <h3>Settings</h3>
            <p>Configure site settings and preferences</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
