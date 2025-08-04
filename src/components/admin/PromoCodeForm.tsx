'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave, faTimes, faDice } from '@fortawesome/free-solid-svg-icons'
import Image from 'next/image'
import './PromoCodeForm.css'

interface Product {
  _id: string
  name: string
  slug: string
  price: number
  images?: string[]
}

interface PromoCode {
  _id: string
  code: string
  productId: string
  product?: Product
  discountType: 'percentage' | 'fixed_amount'
  discountValue: number
  maxDiscountAmount?: number
  usageLimit?: number
  usageCount: number
  userUsageLimit?: number
  minimumOrderAmount?: number
  startDate?: string
  endDate?: string
  isActive: boolean
  description?: string
}

interface PromoCodeFormProps {
  promoCode?: PromoCode | null
  onSuccess?: () => void
  onCancel?: () => void
}

export default function PromoCodeForm({ promoCode, onSuccess, onCancel }: PromoCodeFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    productId: '',
    discountType: 'percentage' as 'percentage' | 'fixed_amount',
    discountValue: 0,
    maxDiscountAmount: undefined as number | undefined,
    usageLimit: undefined as number | undefined,
    userUsageLimit: undefined as number | undefined,
    minimumOrderAmount: undefined as number | undefined,
    startDate: '',
    endDate: '',
    isActive: true,
    description: '',
  })

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetchProducts()
    if (promoCode) {
      setFormData({
        code: promoCode.code,
        productId: promoCode.productId,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        maxDiscountAmount: promoCode.maxDiscountAmount,
        usageLimit: promoCode.usageLimit,
        userUsageLimit: promoCode.userUsageLimit,
        minimumOrderAmount: promoCode.minimumOrderAmount,
        startDate: promoCode.startDate ? new Date(promoCode.startDate).toISOString().slice(0, 16) : '',
        endDate: promoCode.endDate ? new Date(promoCode.endDate).toISOString().slice(0, 16) : '',
        isActive: promoCode.isActive,
        description: promoCode.description || '',
      })
      setSelectedProduct(promoCode.product || null)
    }
  }, [promoCode])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products')
      const data = await response.json()
      if (response.ok) {
        setProducts(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData((prev) => ({ ...prev, code: result }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.code.trim()) {
      newErrors.code = 'رمز الخصم مطلوب'
    } else if (formData.code.length < 3) {
      newErrors.code = 'رمز الخصم يجب أن يكون 3 أحرف على الأقل'
    } else if (!/^[A-Z0-9]+$/.test(formData.code)) {
      newErrors.code = 'رمز الخصم يجب أن يحتوي على أحرف كبيرة وأرقام فقط'
    }

    if (!formData.productId) {
      newErrors.productId = 'المنتج مطلوب'
    }

    if (formData.discountValue <= 0) {
      newErrors.discountValue = 'قيمة الخصم يجب أن تكون أكبر من صفر'
    }

    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      newErrors.discountValue = 'نسبة الخصم لا يمكن أن تتجاوز 100%'
    }

    if (formData.maxDiscountAmount !== undefined && formData.maxDiscountAmount <= 0) {
      newErrors.maxDiscountAmount = 'الحد الأقصى للخصم يجب أن يكون أكبر من صفر'
    }

    if (formData.usageLimit !== undefined && formData.usageLimit <= 0) {
      newErrors.usageLimit = 'حد الاستخدام يجب أن يكون أكبر من صفر'
    }

    if (formData.userUsageLimit !== undefined && formData.userUsageLimit <= 0) {
      newErrors.userUsageLimit = 'حد الاستخدام لكل مستخدم يجب أن يكون أكبر من صفر'
    }

    if (formData.minimumOrderAmount !== undefined && formData.minimumOrderAmount < 0) {
      newErrors.minimumOrderAmount = 'الحد الأدنى للطلب لا يمكن أن يكون سالب'
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      if (startDate >= endDate) {
        newErrors.endDate = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Error message translations
  const getErrorMessage = (error: string) => {
    const errorMessages: Record<string, string> = {
      'Promo code already exists': 'الكود موجود بالفعل',
      'Product not found': 'المنتج غير موجود',
      'Percentage discount cannot exceed 100%': 'نسبة الخصم لا يمكن أن تتجاوز 100%',
      'Discount value must be greater than 0': 'قيمة الخصم يجب أن تكون أكبر من صفر',
      'Start date must be before end date': 'تاريخ البداية يجب أن يكون قبل تاريخ الانتهاء',
      'End date must be after start date': 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية',
      'Usage limit must be greater than 0': 'حد الاستخدام يجب أن يكون أكبر من صفر',
      'Minimum order amount must be greater than 0': 'الحد الأدنى للطلب يجب أن يكون أكبر من صفر',
      'Maximum discount amount must be greater than 0': 'الحد الأقصى للخصم يجب أن يكون أكبر من صفر',
      'User usage limit must be greater than 0': 'حد استخدام المستخدم يجب أن يكون أكبر من صفر',
      'Invalid promo code format': 'تنسيق رمز الخصم غير صحيح',
      'Promo code is required': 'رمز الخصم مطلوب',
      'Product is required': 'المنتج مطلوب',
      'Discount type is required': 'نوع الخصم مطلوب',
      'Discount value is required': 'قيمة الخصم مطلوبة',
    }

    return errorMessages[error] || error || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({}) // Clear previous errors

    try {
      const url = promoCode ? `/api/admin/promo-codes/${promoCode._id}` : '/api/admin/promo-codes'

      const method = promoCode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific field errors
        if (data.errors && typeof data.errors === 'object') {
          const fieldErrors: Record<string, string> = {}
          Object.keys(data.errors).forEach((field) => {
            fieldErrors[field] = getErrorMessage(data.errors[field])
          })
          setErrors(fieldErrors)
        } else {
          // Handle general error
          const errorMessage = getErrorMessage(data.error || data.message || 'Failed to save promo code')
          setErrors({ submit: errorMessage })
        }
        return
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error saving promo code:', error)
      setErrors({ submit: 'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleProductChange = (productId: string) => {
    handleInputChange('productId', productId)
    const product = products.find((p) => p._id === productId)
    setSelectedProduct(product || null)
  }

  return (
    <form onSubmit={handleSubmit} className="promo-code-form">
      {/* General Error Display */}
      {errors.submit && (
        <div className="error-message">
          {errors.submit}
          <button onClick={() => setErrors({})} className="error-close">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}

      <div className="form-sections">
        {/* Basic Information Section */}
        <div className="form-section">
          <h3 className="section-title">المعلومات الأساسية</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="code" className="form-label">
                رمز الخصم *
              </label>
              <div className="input-with-button">
                <input
                  type="text"
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  className={`form-input ${errors.code ? 'error' : ''}`}
                  placeholder="مثال: SAVE20"
                  maxLength={20}
                />
                <button type="button" onClick={generateRandomCode} className="generate-btn" title="توليد رمز عشوائي">
                  <FontAwesomeIcon icon={faDice} />
                </button>
              </div>
              {errors.code && <span className="error-message">{errors.code}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                الوصف
              </label>
              <input
                type="text"
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="form-input"
                placeholder="وصف مختصر للعرض الترويجي"
                maxLength={200}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="productId" className="form-label">
              المنتج *
            </label>
            <select
              id="productId"
              value={formData.productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className={`form-select ${errors.productId ? 'error' : ''}`}
            >
              <option value="">اختر المنتج</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name} - ${product.price}
                </option>
              ))}
            </select>
            {errors.productId && <span className="error-message">{errors.productId}</span>}

            {selectedProduct && (
              <div className="selected-product">
                <div className="product-preview">
                  {selectedProduct.images &&
                  selectedProduct.images[0] &&
                  selectedProduct.images[0].url &&
                  typeof selectedProduct.images[0].url === 'string' &&
                  selectedProduct.images[0].url.trim() !== '' ? (
                    <Image
                      src={selectedProduct.images[0].url}
                      alt={selectedProduct.name}
                      width={60}
                      height={60}
                      className="product-image"
                    />
                  ) : (
                    <div className="product-image-placeholder">
                      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"
                          fill="currentColor"
                        />
                        <path
                          d="M14 14C15.1 14 16 13.1 16 12C16 10.9 15.1 10 14 10C12.9 10 12 10.9 12 12C12 13.1 12.9 14 14 14Z"
                          fill="currentColor"
                        />
                        <path d="M5 19L8 16L11 19L14 16L19 21H5V19Z" fill="currentColor" />
                      </svg>
                    </div>
                  )}
                  <div className="product-details">
                    <h4>{selectedProduct.name}</h4>
                    <p className="product-price">${selectedProduct.price}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Discount Configuration Section */}
        <div className="form-section">
          <h3 className="section-title">إعدادات الخصم</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="discountType" className="form-label">
                نوع الخصم *
              </label>
              <select
                id="discountType"
                value={formData.discountType}
                onChange={(e) => handleInputChange('discountType', e.target.value)}
                className="form-select"
              >
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed_amount">مبلغ ثابت ($)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="discountValue" className="form-label">
                قيمة الخصم *
              </label>
              <input
                type="number"
                id="discountValue"
                value={formData.discountValue}
                onChange={(e) => handleInputChange('discountValue', parseFloat(e.target.value) || 0)}
                className={`form-input ${errors.discountValue ? 'error' : ''}`}
                placeholder={formData.discountType === 'percentage' ? '20' : '15'}
                min="0"
                max={formData.discountType === 'percentage' ? '100' : undefined}
                step="0.01"
              />
              {errors.discountValue && <span className="error-message">{errors.discountValue}</span>}
            </div>
          </div>

          {formData.discountType === 'percentage' && (
            <div className="form-group">
              <label htmlFor="maxDiscountAmount" className="form-label">
                الحد الأقصى للخصم (اختياري)
              </label>
              <input
                type="number"
                id="maxDiscountAmount"
                value={formData.maxDiscountAmount || ''}
                onChange={(e) =>
                  handleInputChange('maxDiscountAmount', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                className={`form-input ${errors.maxDiscountAmount ? 'error' : ''}`}
                placeholder="50"
                min="0"
                step="0.01"
              />
              <small className="form-help">مثال: إذا كانت نسبة الخصم 20% والحد الأقصى $50، فلن يتجاوز الخصم $50</small>
              {errors.maxDiscountAmount && <span className="error-message">{errors.maxDiscountAmount}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="minimumOrderAmount" className="form-label">
              الحد الأدنى للطلب (اختياري)
            </label>
            <input
              type="number"
              id="minimumOrderAmount"
              value={formData.minimumOrderAmount || ''}
              onChange={(e) =>
                handleInputChange('minimumOrderAmount', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              className={`form-input ${errors.minimumOrderAmount ? 'error' : ''}`}
              placeholder="100"
              min="0"
              step="0.01"
            />
            <small className="form-help">الحد الأدنى لمبلغ الطلب لتطبيق الخصم</small>
            {errors.minimumOrderAmount && <span className="error-message">{errors.minimumOrderAmount}</span>}
          </div>
        </div>

        {/* Usage Limits Section */}
        <div className="form-section">
          <h3 className="section-title">حدود الاستخدام</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="usageLimit" className="form-label">
                الحد الأقصى للاستخدام (اختياري)
              </label>
              <input
                type="number"
                id="usageLimit"
                value={formData.usageLimit || ''}
                onChange={(e) => handleInputChange('usageLimit', e.target.value ? parseInt(e.target.value) : undefined)}
                className={`form-input ${errors.usageLimit ? 'error' : ''}`}
                placeholder="100"
                min="1"
              />
              <small className="form-help">عدد المرات التي يمكن استخدام هذا الرمز</small>
              {errors.usageLimit && <span className="error-message">{errors.usageLimit}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="userUsageLimit" className="form-label">
                الحد لكل مستخدم (اختياري)
              </label>
              <input
                type="number"
                id="userUsageLimit"
                value={formData.userUsageLimit || ''}
                onChange={(e) =>
                  handleInputChange('userUsageLimit', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className={`form-input ${errors.userUsageLimit ? 'error' : ''}`}
                placeholder="1"
                min="1"
              />
              <small className="form-help">عدد المرات التي يمكن لكل مستخدم استخدام هذا الرمز</small>
              {errors.userUsageLimit && <span className="error-message">{errors.userUsageLimit}</span>}
            </div>
          </div>
        </div>

        {/* Date Settings Section */}
        <div className="form-section">
          <h3 className="section-title">إعدادات التاريخ</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate" className="form-label">
                تاريخ البداية (اختياري)
              </label>
              <input
                type="datetime-local"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="form-input"
              />
              <small className="form-help">تاريخ بدء صلاحية الرمز (اتركه فارغاً للبدء فوراً)</small>
            </div>

            <div className="form-group">
              <label htmlFor="endDate" className="form-label">
                تاريخ الانتهاء (اختياري)
              </label>
              <input
                type="datetime-local"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={`form-input ${errors.endDate ? 'error' : ''}`}
              />
              <small className="form-help">تاريخ انتهاء صلاحية الرمز (اتركه فارغاً لعدم انتهاء الصلاحية)</small>
              {errors.endDate && <span className="error-message">{errors.endDate}</span>}
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div className="form-section">
          <h3 className="section-title">الحالة</h3>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="form-checkbox"
              />
              <span className="checkmark"></span>
              تفعيل الرمز فوراً
            </label>
            <small className="form-help">يمكنك إلغاء التفعيل لاحقاً من لوحة التحكم</small>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>
          <FontAwesomeIcon icon={faTimes} />
          إلغاء
        </button>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          <FontAwesomeIcon icon={faSave} />
          {loading ? 'جاري الحفظ...' : promoCode ? 'تحديث' : 'إنشاء'}
        </button>
      </div>

      {errors.submit && <div className="form-error">{errors.submit}</div>}
    </form>
  )
}
