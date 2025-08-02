'use client'

import React, { useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faTimes, faCheckCircle, faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons'
import './FileUpload.css'

export interface DesignFileUploadProps {
  onFileSelect: (file: File) => void
  onFileRemove?: (fileName: string) => void
  accept?: string
  maxSize?: number // in MB
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  externalProgress?: UploadProgress
  onReset?: () => void
  multiple?: boolean
  selectedFiles?: File[]
  uploadedFiles?: Array<{
    fileName: string
    fileType: string
    fileUrl: string
    fileSize: number
  }>
}

export interface UploadProgress {
  progress: number
  status: 'idle' | 'uploading' | 'success' | 'error'
  message?: string
  result?: unknown
}

export default function DesignFileUpload({
  onFileSelect,
  onFileRemove,
  accept = '*/*',
  maxSize = 100, // 100MB default
  label = 'رفع الملف',
  placeholder = 'اختر ملف أو اسحب الملف هنا',
  className = '',
  disabled = false,
  externalProgress,
  onReset,
  multiple = false,
  selectedFiles = [],
  uploadedFiles = [],
}: DesignFileUploadProps) {
  const [internalProgress, setInternalProgress] = useState<UploadProgress>({
    progress: 0,
    status: 'idle',
  })

  // Use external progress if provided, otherwise use internal
  const uploadProgress = externalProgress || internalProgress

  // Initialize external progress if not provided
  React.useEffect(() => {
    if (externalProgress && externalProgress.status === 'idle' && internalProgress.status !== 'idle') {
      setInternalProgress({
        progress: 0,
        status: 'idle',
      })
    }
  }, [externalProgress, internalProgress.status])

  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    // Prevent file selection if already uploading
    if (uploadProgress.status === 'uploading') {
      return
    }

    // Validate file size (only if maxSize > 0)
    if (maxSize > 0 && file.size > maxSize * 1024 * 1024) {
      const error = `حجم الملف كبير جداً. الحد الأقصى ${maxSize}MB`
      if (!externalProgress) {
        setInternalProgress({
          progress: 0,
          status: 'error',
          message: error,
        })
      }
      return
    }

    onFileSelect(file)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      if (multiple) {
        // Handle multiple files
        Array.from(files).forEach((file) => {
          handleFileSelect(file)
        })
      } else {
        // Handle single file
        handleFileSelect(files[0])
      }
      // Clear the input value to allow selecting the same file again
      event.target.value = ''
    }
  }

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true)
    } else if (event.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)

    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      if (multiple) {
        Array.from(files).forEach((file) => {
          handleFileSelect(file)
        })
      } else {
        handleFileSelect(files[0])
      }
    }
  }

  const handleClick = () => {
    if (!disabled && uploadProgress.status !== 'uploading') {
      fileInputRef.current?.click()
    }
  }

  const resetUpload = () => {
    if (!externalProgress) {
      setInternalProgress({
        progress: 0,
        status: 'idle',
      })
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onReset?.()
  }

  const getStatusIcon = () => {
    switch (uploadProgress.status) {
      case 'uploading':
        return <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
      case 'success':
        return <FontAwesomeIcon icon={faCheckCircle} />
      case 'error':
        return <FontAwesomeIcon icon={faExclamationTriangle} />
      default:
        return <FontAwesomeIcon icon={faUpload} />
    }
  }

  const getStatusColor = () => {
    switch (uploadProgress.status) {
      case 'uploading':
        return 'var(--accent-primary)'
      case 'success':
        return '#48bb78'
      case 'error':
        return '#f56565'
      default:
        return 'var(--text-secondary)'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    }
    return `${Math.round(bytes / 1024)}KB`
  }

  return (
    <div className={`design-file-upload-container ${className}`}>
      {label && <label className="file-upload-label">{label}</label>}

      <div
        className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${
          uploadProgress.status !== 'idle' ? 'has-status' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="file-input"
          style={{ pointerEvents: 'none' }}
        />

        <div className="upload-content">
          <div className="upload-icon" style={{ color: getStatusColor() }}>
            {getStatusIcon()}
          </div>

          <div className="upload-text">
            <p className="upload-placeholder">{placeholder}</p>
            <p className="upload-hint">{maxSize > 0 ? `أقصى حجم: ${maxSize}MB` : 'حجم غير محدود'}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {uploadProgress.status === 'uploading' && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress.progress}%` }} />
            </div>
            <span className="progress-text">{Math.round(uploadProgress.progress)}%</span>
          </div>
        )}

        {/* Status Message */}
        {uploadProgress.status !== 'idle' && uploadProgress.message && (
          <div className={`upload-status ${uploadProgress.status}`}>
            <span className="status-message">{uploadProgress.message}</span>
            {uploadProgress.status === 'error' && (
              <button onClick={resetUpload} className="reset-btn">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="file-preview-section">
          <h4>الملفات المحددة:</h4>
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-item selected">
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-type">({file.name.split('.').pop()?.toUpperCase()})</span>
                <span className="file-size">({formatFileSize(file.size)})</span>
                <span className="file-status">في انتظار الرفع...</span>
              </div>
              <button type="button" onClick={() => onFileRemove?.(file.name)} className="remove-file-btn">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="file-preview-section">
          <h4>الملفات المرفوعة:</h4>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="file-item uploaded">
              <div className="file-info">
                <span className="file-name">{file.fileName}</span>
                <span className="file-type">({file.fileType.toUpperCase()})</span>
                <span className="file-size">({formatFileSize(file.fileSize)})</span>
                <span className="file-status success">تم الرفع بنجاح</span>
              </div>
              <button type="button" onClick={() => onFileRemove?.(file.fileName)} className="remove-file-btn">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
