'use client'

import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPalette } from '@fortawesome/free-solid-svg-icons'

interface ColorPickerProps {
  onColorSelect: (color: { name: string; hex: string }) => void
  className?: string
}

export default function ColorPicker({ onColorSelect, className = '' }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#000000')
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setSelectedColor(color)
  }

  const handleConfirm = () => {
    onColorSelect({
      name: 'custom color',
      hex: selectedColor,
    })
    setIsOpen(false)
  }

  return (
    <div className={`color-picker-container ${className}`} ref={pickerRef}>
      <button type="button" className="color-picker-trigger" onClick={() => setIsOpen(!isOpen)} title="اختر لون مخصص">
        <FontAwesomeIcon icon={faPalette} />
      </button>

      {isOpen && (
        <div className="color-picker-dropdown">
          <div className="color-picker-header">
            <span>اختر لون مخصص</span>
          </div>
          <div className="color-picker-content">
            <input type="color" value={selectedColor} onChange={handleColorChange} className="color-input" />
            <div className="selected-color-preview" style={{ backgroundColor: selectedColor }}>
              <span className="color-hex">{selectedColor}</span>
            </div>
            <button type="button" className="confirm-color-btn" onClick={handleConfirm}>
              تأكيد اللون
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .color-picker-container {
          position: relative;
          display: inline-block;
        }

        .color-picker-trigger {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid rgba(130, 97, 198, 0.3);
          background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .color-picker-trigger:hover {
          transform: translateY(-2px);
          border-color: rgba(130, 97, 198, 0.6);
          box-shadow: 0 8px 24px rgba(130, 97, 198, 0.3);
        }

        .color-picker-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 8px;
          background: linear-gradient(135deg, rgba(37, 37, 48, 0.95), rgba(32, 32, 40, 0.95));
          border: 1px solid rgba(130, 97, 198, 0.3);
          border-radius: 12px;
          padding: 1rem;
          min-width: 200px;
          z-index: 1000;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
        }

        .color-picker-header {
          text-align: center;
          margin-bottom: 1rem;
          color: var(--color-lime-accent);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .color-picker-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .color-input {
          width: 100%;
          height: 40px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          background: transparent;
        }

        .color-input::-webkit-color-swatch-wrapper {
          padding: 0;
          border-radius: 8px;
        }

        .color-input::-webkit-color-swatch {
          border: none;
          border-radius: 8px;
        }

        .selected-color-preview {
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(130, 97, 198, 0.3);
        }

        .color-hex {
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .confirm-color-btn {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, var(--color-purple-primary), var(--color-pink-accent));
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .confirm-color-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(130, 97, 198, 0.4);
        }
      `}</style>
    </div>
  )
}
