'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import './CustomRichTextEditor.css'

interface CustomRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

const CustomRichTextEditor: React.FC<CustomRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'اكتب وصف المنتج هنا...',
  disabled = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null)

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      onChange(html)
    }
  }, [onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault()
            document.execCommand('bold', false)
            handleInput()
            break
          case 'i':
            e.preventDefault()
            document.execCommand('italic', false)
            handleInput()
            break
          case 'u':
            e.preventDefault()
            document.execCommand('underline', false)
            handleInput()
            break
        }
      }
    },
    [handleInput]
  )

  const handleCommand = useCallback(
    (command: string, value?: string) => {
      editorRef.current?.focus()

      if (command === 'formatBlock') {
        // Check if current selection already has this format
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          let parent = range.commonAncestorContainer

          // Find the closest block element
          while (parent && parent.nodeType !== Node.ELEMENT_NODE) {
            parent = parent.parentNode
          }

          // If already this format, remove it (make it paragraph)
          if (parent && parent.nodeName.toLowerCase() === value?.toLowerCase()) {
            document.execCommand('formatBlock', false, 'p')
          } else {
            document.execCommand(command, false, value)
          }
        } else {
          document.execCommand(command, false, value)
        }
      } else if (command === 'foreColor') {
        // Custom color handling with span elements
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          if (!selection.isCollapsed) {
            // Text is selected, apply color
            const range = selection.getRangeAt(0)
            const selectedText = range.extractContents()
            const span = document.createElement('span')
            span.style.color = value || '#000000'
            span.appendChild(selectedText)
            range.insertNode(span)
            selection.removeAllRanges()
          } else {
            // No text selected, insert colored placeholder or apply to next typed text
            const range = selection.getRangeAt(0)
            const span = document.createElement('span')
            span.style.color = value || '#000000'
            span.innerHTML = '&nbsp;'
            range.insertNode(span)

            // Move cursor after the span
            range.setStartAfter(span)
            range.setEndAfter(span)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      } else if (command === 'backColor') {
        // Custom background color handling
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          const range = selection.getRangeAt(0)
          const selectedText = range.extractContents()
          const span = document.createElement('span')
          span.style.backgroundColor = value || 'transparent'
          span.appendChild(selectedText)
          range.insertNode(span)
          selection.removeAllRanges()
        }
      } else {
        document.execCommand(command, false, value)
      }

      handleInput()
      editorRef.current?.focus()
    },
    [handleInput]
  )

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  return (
    <div className="custom-rich-editor">
      {/* Toolbar */}
      <div className="custom-editor-toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => handleCommand('formatBlock', 'h1')}
            title="عنوان رئيسي"
          >
            H1
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => handleCommand('formatBlock', 'h2')}
            title="عنوان فرعي"
          >
            H2
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => handleCommand('formatBlock', 'h3')}
            title="عنوان صغير"
          >
            H3
          </button>
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <button type="button" className="toolbar-button" onClick={() => handleCommand('bold')} title="نص عريض">
            <strong>B</strong>
          </button>
          <button type="button" className="toolbar-button" onClick={() => handleCommand('italic')} title="نص مائل">
            <em>I</em>
          </button>
          <button type="button" className="toolbar-button" onClick={() => handleCommand('underline')} title="نص مسطر">
            <u>U</u>
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => handleCommand('strikeThrough')}
            title="نص مشطوب"
          >
            <s>S</s>
          </button>
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => handleCommand('insertOrderedList')}
            title="قائمة مرقمة"
          >
            1.
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => handleCommand('insertUnorderedList')}
            title="قائمة نقطية"
          >
            •
          </button>
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => handleCommand('justifyRight')}
            title="محاذاة يمين"
          >
            ⇥
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => handleCommand('justifyCenter')}
            title="محاذاة وسط"
          >
            ↔
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => handleCommand('justifyLeft')}
            title="محاذاة يسار"
          >
            ⇤
          </button>
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <input
            type="color"
            className="color-picker"
            onChange={(e) => handleCommand('foreColor', e.target.value)}
            title="لون النص"
          />
          <input
            type="color"
            className="color-picker"
            onChange={(e) => handleCommand('backColor', e.target.value)}
            title="لون الخلفية"
          />
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => {
              const url = prompt('أدخل رابط URL:')
              if (url) handleCommand('createLink', url)
            }}
            title="إضافة رابط"
          >
            🔗
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => handleCommand('removeFormat')}
            title="إزالة التنسيق"
          >
            ✂
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        className="custom-editor-content"
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
        style={{
          minHeight: '150px',
          padding: '15px',
          border: '1px solid #e0e7ff',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          outline: 'none',
          direction: 'rtl',
          textAlign: 'right',
          fontFamily: "'Cairo', 'Segoe UI', sans-serif",
          fontSize: '14px',
          lineHeight: '1.6',
          backgroundColor: 'white',
          color: '#1e293b',
        }}
      />
    </div>
  )
}

export default CustomRichTextEditor
