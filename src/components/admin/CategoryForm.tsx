'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCloudUploadAlt, faTimes } from '@fortawesome/free-solid-svg-icons'
import './CategoryForm.css'

interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
  order: number
  isActive: boolean
  isFeatured: boolean
}

interface CategoryFormProps {
  category?: Category | null
  onSave: (category: Category) => void
  onCancel: () => void
}

export default function CategoryForm({ category, onSave, onCancel }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    order: 0,
    isActive: true,
    isFeatured: false,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        image: category.image || '',
        order: category.order || 0,
        isActive: category.isActive ?? true,
        isFeatured: category.isFeatured ?? false,
      })
      if (category.image) {
        setImagePreview(category.image)
      }
    }
  }, [category])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    handleImageFile(file)
  }

  const handleImageFile = (file: File | undefined) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError('')
    } else if (file) {
      setError('يرجى اختيار ملف صورة صحيح (JPG, PNG, WebP, إلخ)')
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleImageFile(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview('')
    setFormData((prev) => ({ ...prev, image: '' }))

    // Clear the file input value to allow selecting the same file again
    const fileInput = document.getElementById('image-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = category ? `/api/admin/categories/${category._id}` : '/api/admin/categories'

      const method = category ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'فشل في حفظ التصنيف')
      }

      onSave(data.data)
    } catch (error) {
      console.error('Error saving category:', error)
      const errorMessage = error instanceof Error ? error.message : 'فشل في حفظ التصنيف. يرجى المحاولة مرة أخرى.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="category-form">
      {error && <div className="form-error">{error}</div>}

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="name">اسم التصنيف *</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            required
            placeholder="أدخل اسم التصنيف"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="slug">رابط التصنيف *</label>
          <input
            id="slug"
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
            required
            placeholder="رابط-التصنيف"
            className="form-input"
          />
          <small className="form-help">سيتم استخدامه في الرابط: /category/{formData.slug}</small>
        </div>

        <div className="form-group full-width">
          <label htmlFor="description">الوصف</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="أدخل وصف التصنيف"
            className="form-textarea"
            rows={3}
          />
        </div>

        <div className="form-group full-width">
          <label>صورة التصنيف</label>
          <div
            className={`image-upload-area ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <div className="image-preview">
                <Image
                  src={imagePreview}
                  alt="معاينة التصنيف"
                  className="preview-image"
                  width={300}
                  height={200}
                  style={{ objectFit: 'cover' }}
                />
                <div className="image-overlay">
                  <button type="button" onClick={removeImage} className="remove-image-btn">
                    <FontAwesomeIcon icon={faTimes} /> إزالة
                  </button>
                </div>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">
                  <FontAwesomeIcon icon={faCloudUploadAlt} />
                </div>
                <p>اسحب وأفلت صورة هنا، أو انقر للاختيار</p>
                <p className="upload-formats">يدعم: JPG, PNG, WebP</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="file-input"
              hidden
              id="image-upload"
            />
            <label htmlFor="image-upload" className="file-input-label">
              اختر صورة
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="order">ترتيب العرض</label>
          <input
            id="order"
            type="number"
            value={formData.order}
            onChange={(e) => setFormData((prev) => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
            min="0"
            className="form-input"
          />
          <small className="form-help">الأرقام الأقل تظهر أولاً</small>
        </div>

        <div className="form-group">
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="toggle-switch"
              />
              <span className="checkbox-text">نشط</span>
            </label>
            <small className="form-help">فقط التصنيفات النشطة مرئية للمستخدمين</small>
          </div>
        </div>

        <div className="form-group">
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                className="form-checkbox"
              />
              <span className="checkbox-text">مميز</span>
            </label>
            <small className="form-help">التصنيفات المميزة تظهر في أقسام خاصة</small>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>
          إلغاء
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <span className="loading-spinner-sm"></span>
              {category ? 'جاري التحديث...' : 'جاري الإنشاء...'}
            </>
          ) : category ? (
            'تحديث التصنيف'
          ) : (
            'إنشاء التصنيف'
          )}
        </button>
      </div>
    </form>
  )
}
