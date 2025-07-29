'use client'

import { useState } from 'react'
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
} from '@fortawesome/free-solid-svg-icons'

interface Order {
  id: string
  customerName: string
  email: string
  total: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  date: string
  items: number
}

// Sample data - replace with actual API call
const sampleOrders: Order[] = [
  {
    id: 'ORD-001',
    customerName: 'John Doe',
    email: 'john@example.com',
    total: 299.99,
    status: 'completed',
    date: '2024-01-15',
    items: 3,
  },
  {
    id: 'ORD-002',
    customerName: 'Jane Smith',
    email: 'jane@example.com',
    total: 149.99,
    status: 'processing',
    date: '2024-01-14',
    items: 1,
  },
  {
    id: 'ORD-003',
    customerName: 'Mike Johnson',
    email: 'mike@example.com',
    total: 89.99,
    status: 'pending',
    date: '2024-01-13',
    items: 2,
  },
]

const statusColors = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
}

const statusIcons = {
  pending: faClock,
  processing: faEdit,
  completed: faCheck,
  cancelled: faTimes,
}

export default function OrdersPage() {
  const [orders] = useState<Order[]>(sampleOrders)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalRevenue = orders.reduce((sum, order) => (order.status === 'completed' ? sum + order.total : sum), 0)

  return (
    <div className="admin-container">
      <div className="admin-content">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-main">
            <div className="admin-header-icon">
              <FontAwesomeIcon icon={faShoppingCart} />
            </div>
            <div>
              <h1>Orders Management</h1>
              <p>Manage customer orders and track sales</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faShoppingCart} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{orders.length}</div>
              <div className="stat-label">Total Orders</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faDollarSign} />
            </div>
            <div className="stat-content">
              <div className="stat-value">${totalRevenue.toFixed(2)}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faCheck} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{orders.filter((o) => o.status === 'completed').length}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faClock} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{orders.filter((o) => o.status === 'pending').length}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="admin-filters">
          <div className="search-box">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder="Search orders by customer name, email, or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <FontAwesomeIcon icon={faFilter} className="filter-icon" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="admin-card">
          <div className="card-header">
            <h3>Orders ({filteredOrders.length})</h3>
          </div>

          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="order-id">{order.id}</span>
                    </td>
                    <td>
                      <div className="customer-info">
                        <div className="customer-name">{order.customerName}</div>
                        <div className="customer-email">{order.email}</div>
                      </div>
                    </td>
                    <td>{new Date(order.date).toLocaleDateString()}</td>
                    <td>{order.items} items</td>
                    <td className="order-total">${order.total.toFixed(2)}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: `${statusColors[order.status]}20`,
                          color: statusColors[order.status],
                          border: `1px solid ${statusColors[order.status]}40`,
                        }}
                      >
                        <FontAwesomeIcon icon={statusIcons[order.status]} />
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn view-btn" title="View Order">
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button className="action-btn edit-btn" title="Edit Order">
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredOrders.length === 0 && (
              <div className="empty-state">
                <FontAwesomeIcon icon={faShoppingCart} size="3x" />
                <h3>No orders found</h3>
                <p>
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Orders will appear here when customers place them'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
