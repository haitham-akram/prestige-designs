'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faExclamationTriangle, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons'
import './Notification.css'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationProps {
  type: NotificationType
  title: string
  message: string
  duration?: number
  onClose?: () => void
}

export default function Notification({ type, title, message, duration = 5000, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return faCheckCircle
      case 'error':
        return faExclamationTriangle
      case 'warning':
        return faExclamationTriangle
      case 'info':
        return faInfoCircle
      default:
        return faInfoCircle
    }
  }

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-icon">
        <FontAwesomeIcon icon={getIcon()} />
      </div>
      <div className="notification-content">
        <h4 className="notification-title">{title}</h4>
        <p className="notification-message">{message}</p>
      </div>
      <button onClick={handleClose} className="notification-close">
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  )
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([])

  const addNotification = (notification: Omit<NotificationProps, 'onClose'>) => {
    const id = Date.now()
    const newNotification = {
      ...notification,
      onClose: () => removeNotification(id),
    }
    setNotifications((prev) => [...prev, newNotification])
  }

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n !== notifications.find((notif) => notif === n)))
  }

  const showSuccess = (title: string, message: string) => {
    addNotification({ type: 'success', title, message })
  }

  const showError = (title: string, message: string) => {
    addNotification({ type: 'error', title, message })
  }

  const showWarning = (title: string, message: string) => {
    addNotification({ type: 'warning', title, message })
  }

  const showInfo = (title: string, message: string) => {
    addNotification({ type: 'info', title, message })
  }

  return {
    notifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
  }
}
