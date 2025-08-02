'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faExclamationTriangle, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons'
import './Alert.css'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface AlertProps {
  type: AlertType
  title: string
  message: string
  duration?: number
  onClose?: () => void
}

export default function Alert({ type, title, message, duration = 5000, onClose }: AlertProps) {
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
    <div className={`alert alert-${type}`}>
      <div className="alert-icon">
        <FontAwesomeIcon icon={getIcon()} />
      </div>
      <div className="alert-content">
        <h4 className="alert-title">{title}</h4>
        <p className="alert-message">{message}</p>
      </div>
      <button onClick={handleClose} className="alert-close">
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  )
}

// Hook for managing alerts
export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertProps[]>([])

  const addAlert = (alert: Omit<AlertProps, 'onClose'>) => {
    const id = Date.now()
    const newAlert = {
      ...alert,
      onClose: () => removeAlert(id),
    }
    setAlerts((prev) => [...prev, newAlert])
  }

  const removeAlert = (id: number) => {
    setAlerts((prev) => prev.filter((alert) => alert !== alerts.find((a) => a === alert)))
  }

  const showSuccess = (title: string, message: string) => {
    addAlert({ type: 'success', title, message })
  }

  const showError = (title: string, message: string) => {
    addAlert({ type: 'error', title, message })
  }

  const showWarning = (title: string, message: string) => {
    addAlert({ type: 'warning', title, message })
  }

  const showInfo = (title: string, message: string) => {
    addAlert({ type: 'info', title, message })
  }

  return {
    alerts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeAlert,
  }
}
