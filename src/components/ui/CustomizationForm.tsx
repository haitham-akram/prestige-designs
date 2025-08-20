'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faImage, faTag, faUpload, faTimes, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import { CartItemCustomization } from '@/contexts/CartContext'
import Image from 'next/image'

export interface CustomizationFormRef {
  resetForm: () => void
}

interface ProductColor {
  name: string
  hex: string
}

interface CustomizationFormProps {
  productId: string
  colors?: ProductColor[]
  allowColorChanges?: boolean
  allowTextEditing?: boolean
  allowImageReplacement?: boolean
  allowLogoUpload?: boolean
  onCustomizationChange: (customizations: CartItemCustomization) => void
  initialCustomizations?: CartItemCustomization
}

interface UploadedImage {
  url: string
  publicId: string
}

interface UploadedLogo {
  url: string
  publicId: string
}

const CustomizationForm = forwardRef<CustomizationFormRef, CustomizationFormProps>(
  (
    {
      productId,
      colors = [],
      allowColorChanges = false,
      allowTextEditing = false,
      allowImageReplacement = false,
      allowLogoUpload = false,
      onCustomizationChange,
      initialCustomizations,
    },
    ref
  ) => {
    const [textChanges, setTextChanges] = useState<string>(
      initialCustomizations?.textChanges?.map((tc) => tc.value).join('\n') || ''
    )
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(initialCustomizations?.uploadedImages || [])
    const [uploadedLogo, setUploadedLogo] = useState<UploadedLogo | null>(initialCustomizations?.uploadedLogo || null)
    const [customizationNotes, setCustomizationNotes] = useState<string>(
      initialCustomizations?.customizationNotes || ''
    )

    // Upload states
    const [uploadingImages, setUploadingImages] = useState<boolean>(false)
    const [uploadingLogo, setUploadingLogo] = useState<boolean>(false)
    const [uploadError, setUploadError] = useState<string>('')

    // Track which sections are expanded
    const [expandedSections, setExpandedSections] = useState<{
      text: boolean
      images: boolean
      logo: boolean
      notes: boolean
    }>({
      text: false,
      images: false,
      logo: false,
      notes: false,
    })

    // Reset form function
    const resetForm = () => {
      setTextChanges('')
      setUploadedImages([])
      setUploadedLogo(null)
      setCustomizationNotes('')
      setExpandedSections({
        text: false,
        images: false,
        logo: false,
        notes: false,
      })
      setUploadError('')
      // Clear any file inputs
      const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>
      fileInputs.forEach((input) => {
        input.value = ''
      })
      // Update parent with empty customizations
      onCustomizationChange({})
    }

    // Expose reset function through ref
    useImperativeHandle(ref, () => ({
      resetForm,
    }))

    // Toggle section expansion
    const toggleSection = (section: keyof typeof expandedSections) => {
      setExpandedSections((prev) => ({
        ...prev,
        [section]: !prev[section],
      }))
    }

    // Update parent component whenever customizations change
    const updateCustomizations = (overrideLogo?: UploadedLogo | null, overrideImages?: UploadedImage[]) => {
      const logoToUse = overrideLogo !== undefined ? overrideLogo : uploadedLogo
      const imagesToUse = overrideImages !== undefined ? overrideImages : uploadedImages
      const customizations: CartItemCustomization = {
        textChanges: textChanges.trim() ? [{ field: 'customText', value: textChanges.trim() }] : [],
        uploadedImages: imagesToUse,
        uploadedLogo: logoToUse || undefined,
        customizationNotes,
      }
      console.log('🔄 CustomizationForm - updateCustomizations called:', {
        uploadedLogo,
        uploadedImages,
        logoToUse,
        imagesToUse,
        customizations,
        hasLogo: !!logoToUse,
        hasImages: imagesToUse.length > 0,
      })
      onCustomizationChange(customizations)
    }

    // Handle text change
    const handleTextChange = (value: string) => {
      setTextChanges(value)
      setTimeout(updateCustomizations, 0)
    }

    // Handle image upload to Cloudinary
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Check image limit
      if (uploadedImages.length >= 10) {
        setUploadError('يمكن رفع 10 صور كحد أقصى')
        return
      }

      setUploadingImages(true)
      setUploadError('')

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload/customer', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('فشل في رفع الصورة')
        }

        const result = await response.json()

        if (result.success) {
          const newImage: UploadedImage = {
            url: result.url,
            publicId: result.publicId,
          }
          const newImages = [...uploadedImages, newImage]
          setUploadedImages(newImages)
          // Pass the new images array directly to avoid state timing issues
          setTimeout(() => updateCustomizations(undefined, newImages), 0)
        } else {
          throw new Error(result.error || 'فشل في رفع الصورة')
        }
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'فشل في رفع الصورة')
      } finally {
        setUploadingImages(false)
        // Reset the file input so the same file can be uploaded again
        event.target.value = ''
      }
    }

    // Handle logo upload to Cloudinary
    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setUploadingLogo(true)
      setUploadError('')

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload/customer', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('فشل في رفع الشعار')
        }

        const result = await response.json()

        if (result.success) {
          const newLogo: UploadedLogo = {
            url: result.url,
            publicId: result.publicId,
          }
          setUploadedLogo(newLogo)
          // Pass the new logo directly to avoid state timing issues
          setTimeout(() => updateCustomizations(newLogo), 0)
        } else {
          throw new Error(result.error || 'فشل في رفع الشعار')
        }
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'فشل في رفع الشعار')
      } finally {
        setUploadingLogo(false)
        // Reset the file input so the same file can be uploaded again
        event.target.value = ''
      }
    }

    // Remove uploaded image from Cloudinary
    const removeImage = async (index: number) => {
      const imageToRemove = uploadedImages[index]
      if (!imageToRemove) return

      try {
        const response = await fetch('/api/upload/customer', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: imageToRemove.publicId }),
        })

        if (response.ok) {
          const newImages = uploadedImages.filter((_, i) => i !== index)
          setUploadedImages(newImages)
          // Pass the new images array directly to avoid state timing issues
          setTimeout(() => updateCustomizations(undefined, newImages), 0)
        }
      } catch (error) {
        console.error('Failed to delete image:', error)
      }
    }

    // Remove uploaded logo from Cloudinary
    const removeLogo = async () => {
      if (!uploadedLogo) return

      try {
        const response = await fetch('/api/upload/customer', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: uploadedLogo.publicId }),
        })

        if (response.ok) {
          setUploadedLogo(null)
          // Pass null directly to avoid state timing issues
          setTimeout(() => updateCustomizations(null), 0)
        }
      } catch (error) {
        console.error('Failed to delete logo:', error)
      }
    }

    return (
      <div className="customization-form">
        {/* Text Editing - Button that expands */}
        {allowTextEditing && (
          <div className="customization-section">
            <button
              className={`customization-section-header ${expandedSections.text ? 'expanded' : ''}`}
              onClick={() => toggleSection('text')}
              type="button"
            >
              <div className="header-content">
                <FontAwesomeIcon icon={faPen} className="section-icon" />
                <span>تعديل النصوص</span>
              </div>
              <FontAwesomeIcon icon={expandedSections.text ? faChevronUp : faChevronDown} className="expand-icon" />
            </button>

            {expandedSections.text && (
              <div className="section-content">
                <textarea
                  placeholder="أدخل النصوص المطلوب تعديلها..."
                  value={textChanges}
                  onChange={(e) => handleTextChange(e.target.value)}
                  rows={4}
                  className="text-textarea"
                />
              </div>
            )}
          </div>
        )}

        {/* Image Replacement - Button that expands */}
        {allowImageReplacement && (
          <div className="customization-section">
            <button
              className={`customization-section-header ${expandedSections.images ? 'expanded' : ''}`}
              onClick={() => toggleSection('images')}
              type="button"
            >
              <div className="header-content">
                <FontAwesomeIcon icon={faImage} className="section-icon" />
                <span>إضافة صور</span>
              </div>
              <FontAwesomeIcon icon={expandedSections.images ? faChevronUp : faChevronDown} className="expand-icon" />
            </button>

            {expandedSections.images && (
              <div className="section-content">
                <div className="upload-area">
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="file-input"
                    disabled={uploadingImages}
                  />
                  <label htmlFor="image-upload" className={`upload-button ${uploadingImages ? 'uploading' : ''}`}>
                    {uploadingImages ? (
                      <>
                        <div className="upload-loading">
                          <div className="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faUpload} />
                        رفع صورة جديدة
                      </>
                    )}
                  </label>
                  <p className="upload-info">يمكن رفع 10 صور كحد أقصى ({uploadedImages.length}/10)</p>
                </div>

                {uploadError && <div className="upload-error">{uploadError}</div>}

                {uploadedImages.length > 0 && (
                  <div className="uploaded-images">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="uploaded-image">
                        <Image src={image.url} alt={`Uploaded ${index + 1}`} width={100} height={100} />
                        <button type="button" className="remove-button" onClick={() => removeImage(index)}>
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Logo Upload - Button that expands */}
        {allowLogoUpload && (
          <div className="customization-section">
            <button
              className={`customization-section-header ${expandedSections.logo ? 'expanded' : ''}`}
              onClick={() => toggleSection('logo')}
              type="button"
            >
              <div className="header-content">
                <FontAwesomeIcon icon={faTag} className="section-icon" />
                <span>رفع الشعار</span>
              </div>
              <FontAwesomeIcon icon={expandedSections.logo ? faChevronUp : faChevronDown} className="expand-icon" />
            </button>

            {expandedSections.logo && (
              <div className="section-content">
                {!uploadedLogo ? (
                  <div className="upload-area">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="file-input"
                      disabled={uploadingLogo}
                    />
                    <label htmlFor="logo-upload" className={`upload-button ${uploadingLogo ? 'uploading' : ''}`}>
                      {uploadingLogo ? (
                        <>
                          <div className="upload-loading">
                            <div className="loading-dots">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faUpload} />
                          رفع الشعار
                        </>
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="uploaded-logo">
                    <Image src={uploadedLogo.url} alt="Uploaded Logo" width={120} height={120} />
                    <button type="button" className="remove-button" onClick={removeLogo}>
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                )}

                {uploadError && <div className="upload-error">{uploadError}</div>}
              </div>
            )}
          </div>
        )}

        {/* Customization Notes - Button that expands */}
        <div className="customization-section">
          <button
            className={`customization-section-header ${expandedSections.notes ? 'expanded' : ''}`}
            onClick={() => toggleSection('notes')}
            type="button"
          >
            <div className="header-content">
              <FontAwesomeIcon icon={faPen} className="section-icon" />
              <span>ملاحظات التخصيص</span>
            </div>
            <FontAwesomeIcon icon={expandedSections.notes ? faChevronUp : faChevronDown} className="expand-icon" />
          </button>

          {expandedSections.notes && (
            <div className="section-content">
              <textarea
                placeholder="أضف أي ملاحظات أو متطلبات خاصة للتخصيص..."
                value={customizationNotes}
                onChange={(e) => {
                  setCustomizationNotes(e.target.value)
                  setTimeout(updateCustomizations, 0)
                }}
                rows={3}
                className="notes-textarea"
              />
            </div>
          )}
        </div>

        <style jsx>{`
          .customization-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .customization-section {
            background: linear-gradient(135deg, rgba(37, 37, 48, 0.6), rgba(32, 32, 40, 0.8));
            border-radius: 16px;
            border: 1px solid rgba(130, 97, 198, 0.2);
            overflow: hidden;
            direction: ltr;
            transition: all 0.3s ease;
          }

          .customization-section:hover {
            border-color: rgba(130, 97, 198, 0.3);
            box-shadow: 0 8px 24px rgba(130, 97, 198, 0.1);
          }

          .section-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
            padding: 1.5rem;
            background: rgba(130, 97, 198, 0.1);
          }

          .section-icon {
            color: var(--color-purple-primary);
            font-size: 1.1rem;
          }

          .customization-section-header {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem 1.75rem;
            background: linear-gradient(135deg, rgba(130, 97, 198, 0.05), rgba(236, 72, 153, 0.05));
            border: none;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            color: var(--color-lime-accent);
            position: relative;
            overflow: hidden;
          }

          .customization-section-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(130, 97, 198, 0.1), transparent);
            transition: left 0.6s ease;
          }

          .customization-section-header:hover::before {
            left: 100%;
          }

          .customization-section-header:hover {
            background: linear-gradient(135deg, rgba(130, 97, 198, 0.1), rgba(236, 72, 153, 0.1));
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(130, 97, 198, 0.15);
          }

          .customization-section-header:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(130, 97, 198, 0.1);
          }

          .customization-section-header.expanded {
            background: linear-gradient(135deg, rgba(130, 97, 198, 0.12), rgba(236, 72, 153, 0.12));
            border-bottom: 1px solid rgba(130, 97, 198, 0.3);
          }

          .header-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.1rem;
            font-weight: 600;
            z-index: 1;
            position: relative;
          }

          .section-icon {
            color: var(--color-purple-primary);
            font-size: 1.1rem;
            transition: all 0.3s ease;
          }

          .customization-section-header:hover .section-icon {
            transform: scale(1.1);
            color: var(--color-pink-accent);
          }

          .expand-icon {
            color: var(--color-purple-primary);
            font-size: 0.9rem;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1;
            position: relative;
          }

          .customization-section-header:hover .expand-icon {
            color: var(--color-pink-accent);
            transform: scale(1.1);
          }

          .customization-section-header.expanded .expand-icon {
            transform: rotate(180deg) scale(1.1);
          }

          .section-content {
            padding: 1.5rem;
            background: transparent;
          }

          .text-textarea {
            width: 100%;
            padding: 0.75rem;
            border-radius: 8px;
            border: 1px solid rgba(130, 97, 198, 0.3);
            background: var(--color-dark-primary);
            color: var(--text-primary);
            resize: vertical;
            transition: all 0.3s ease;
            font-family: inherit;
          }

          .text-textarea:focus {
            outline: none;
            border-color: var(--color-purple-primary);
            box-shadow: 0 0 0 2px rgba(130, 97, 198, 0.2);
          }

          .file-input {
            display: none;
          }

          .upload-area {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            align-items: center;
            padding: 2rem;
            border: 2px dashed rgba(130, 97, 198, 0.3);
            border-radius: 12px;
            background: rgba(130, 97, 198, 0.05);
            transition: all 0.3s ease;
          }

          .upload-area:hover {
            border-color: rgba(130, 97, 198, 0.5);
            background: rgba(130, 97, 198, 0.08);
          }

          .upload-button {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 1.75rem;
            background: linear-gradient(135deg, var(--color-purple-primary), var(--color-pink-accent));
            color: white;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 600;
            border: none;
            position: relative;
            overflow: hidden;
          }

          .upload-button.uploading {
            background: linear-gradient(135deg, var(--color-purple-primary), var(--color-pink-accent));
            cursor: not-allowed;
            position: relative;
            overflow: hidden;
          }

          .upload-button.uploading::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            animation: shimmer 1.5s infinite;
          }

          @keyframes shimmer {
            0% {
              left: -100%;
            }
            100% {
              left: 100%;
            }
          }

          .upload-button.uploading:hover {
            transform: none;
            box-shadow: 0 8px 24px rgba(130, 97, 198, 0.3);
          }

          .upload-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
            position: relative;
          }

          .loading-dots {
            display: flex;
            gap: 0.25rem;
          }

          .loading-dots span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.8);
            animation: dots 1.4s infinite ease-in-out;
          }

          .loading-dots span:nth-child(1) {
            animation-delay: -0.32s;
          }

          .loading-dots span:nth-child(2) {
            animation-delay: -0.16s;
          }

          .loading-dots span:nth-child(3) {
            animation-delay: 0s;
          }

          @keyframes dots {
            0%,
            80%,
            100% {
              transform: scale(0.8);
              opacity: 0.5;
            }
            40% {
              transform: scale(1);
              opacity: 1;
            }
          }

          .upload-info {
            font-size: 0.875rem;
            color: var(--text-secondary);
            text-align: center;
            margin: 0;
          }

          .upload-error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
            padding: 0.75rem;
            border-radius: 8px;
            font-size: 0.875rem;
            margin-top: 1rem;
          }

          .upload-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.6s ease;
          }

          .upload-button:hover::before {
            left: 100%;
          }

          .upload-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(130, 97, 198, 0.4);
          }

          .upload-button:active {
            transform: translateY(0);
            box-shadow: 0 6px 20px rgba(130, 97, 198, 0.3);
          }

          .uploaded-images {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            margin-top: 1rem;
          }

          .uploaded-image {
            position: relative;
            width: 100px;
            height: 100px;
            border-radius: 8px;
            overflow: hidden;
          }

          .uploaded-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .uploaded-logo {
            position: relative;
            width: 120px;
            height: 120px;
            border-radius: 8px;
            overflow: hidden;
          }

          .uploaded-logo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .remove-button {
            position: absolute;
            top: 0.25rem;
            right: 0.25rem;
            width: 24px;
            height: 24px;
            background: rgba(239, 68, 68, 0.9);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            transition: all 0.3s ease;
          }

          .remove-button:hover {
            background: rgba(239, 68, 68, 1);
            transform: scale(1.1);
          }

          .notes-textarea {
            width: 100%;
            padding: 0.75rem;
            border-radius: 8px;
            border: 1px solid rgba(130, 97, 198, 0.3);
            background: var(--color-dark-primary);
            color: var(--text-primary);
            resize: vertical;
            transition: all 0.3s ease;
            font-family: inherit;
          }

          .notes-textarea:focus {
            outline: none;
            border-color: var(--color-purple-primary);
            box-shadow: 0 0 0 2px rgba(130, 97, 198, 0.2);
          }

          @media (max-width: 768px) {
            .section-header {
              padding: 0.75rem 1rem;
            }

            .section-content {
              padding: 1rem;
            }

            .section-title {
              padding: 1rem;
              font-size: 1.1rem;
            }

            .colors-grid {
              padding: 1rem;
              gap: 0.5rem;
            }

            .header-content {
              font-size: 1rem;
            }

            .color-option {
              width: 40px;
              height: 40px;
            }
          }
        `}</style>
      </div>
    )
  }
)

CustomizationForm.displayName = 'CustomizationForm'

export default CustomizationForm
