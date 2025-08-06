'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faSpinner, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'

export default function TestEmailPage() {
  const [testEmail, setTestEmail] = useState('')
  const [emailType, setEmailType] = useState('completed')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)

  const testConnection = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/test-email')
      const data = await response.json()

      if (response.ok) {
        setConnectionStatus('✅ متصل')
      } else {
        setConnectionStatus('❌ فشل الاتصال')
      }
    } catch (error) {
      setConnectionStatus('❌ خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      setResult({ success: false, message: 'يرجى إدخال بريد إلكتروني للاختبار' })
      return
    }

    try {
      setLoading(true)
      setResult(null)

      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailType, testEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: 'تم إرسال البريد الإلكتروني بنجاح!' })
      } else {
        setResult({ success: false, message: data.error || 'فشل في إرسال البريد الإلكتروني' })
      }
    } catch (error) {
      setResult({ success: false, message: 'خطأ في الاتصال' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <div className="page-header">
          <h1>
            <FontAwesomeIcon icon={faEnvelope} /> اختبار البريد الإلكتروني
          </h1>
          <p>اختبار قوالب البريد الإلكتروني وإعدادات SMTP</p>
        </div>

        <div className="test-email-section">
          {/* Connection Test */}
          <div className="connection-test">
            <h3>اختبار الاتصال</h3>
            <button onClick={testConnection} className="btn btn-secondary" disabled={loading}>
              {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faEnvelope} />}
              اختبار الاتصال بـ SMTP
            </button>
            {connectionStatus && (
              <div className={`status ${connectionStatus.includes('✅') ? 'success' : 'error'}`}>
                {connectionStatus}
              </div>
            )}
          </div>

          {/* Email Test */}
          <div className="email-test">
            <h3>اختبار قوالب البريد الإلكتروني</h3>

            <div className="form-group">
              <label htmlFor="testEmail">البريد الإلكتروني للاختبار:</label>
              <input
                type="email"
                id="testEmail"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="أدخل بريد إلكتروني للاختبار"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="emailType">نوع البريد الإلكتروني:</label>
              <select
                id="emailType"
                value={emailType}
                onChange={(e) => setEmailType(e.target.value)}
                className="form-select"
              >
                <option value="completed">إكمال الطلب</option>
                <option value="cancelled">إلغاء الطلب</option>
              </select>
            </div>

            <button onClick={sendTestEmail} className="btn btn-primary" disabled={loading || !testEmail}>
              {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faEnvelope} />}
              إرسال بريد إلكتروني تجريبي
            </button>

            {result && (
              <div className={`result ${result.success ? 'success' : 'error'}`}>
                <FontAwesomeIcon icon={result.success ? faCheck : faTimes} />
                {result.message}
              </div>
            )}
          </div>

          {/* Email Templates Preview */}
          <div className="templates-preview">
            <h3>معاينة القوالب</h3>
            <div className="template-info">
              <div className="template-item">
                <h4>📧 بريد إكمال الطلب</h4>
                <ul>
                  <li>✅ شعار الشركة مع الألوان المخصصة</li>
                  <li>✅ رقم الطلب واسم العميل</li>
                  <li>✅ روابط تحميل الملفات</li>
                  <li>✅ تاريخ انتهاء صلاحية الروابط</li>
                  <li>✅ تصميم متجاوب مع الأجهزة المحمولة</li>
                </ul>
              </div>

              <div className="template-item">
                <h4>📧 بريد إلغاء الطلب</h4>
                <ul>
                  <li>✅ شعار الشركة مع الألوان المخصصة</li>
                  <li>✅ رقم الطلب واسم العميل</li>
                  <li>✅ سبب الإلغاء (إن وجد)</li>
                  <li>✅ رسالة اعتذار مهذبة</li>
                  <li>✅ تصميم متجاوب مع الأجهزة المحمولة</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-header {
          text-align: center;
          margin-bottom: 2rem;
          padding: 2rem;
          background: linear-gradient(135deg, #8261c6 0%, #e260ef 100%);
          border-radius: 15px;
          color: white;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
        }

        .page-header p {
          margin: 0;
          opacity: 0.9;
        }

        .test-email-section {
          max-width: 800px;
          margin: 0 auto;
        }

        .connection-test,
        .email-test,
        .templates-preview {
          background: #252530;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          border: 1px solid #3f3f46;
        }

        .connection-test h3,
        .email-test h3,
        .templates-preview h3 {
          margin: 0 0 1rem 0;
          color: #fcebff;
          font-size: 1.25rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #fcebff;
          font-weight: 500;
        }

        .form-input,
        .form-select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          background: #202028;
          color: #fcebff;
          font-size: 1rem;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: #8261c6;
          box-shadow: 0 0 0 3px rgba(130, 97, 198, 0.1);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #8261c6 0%, #e260ef 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(130, 97, 198, 0.3);
        }

        .btn-secondary {
          background: #3f3f46;
          color: #fcebff;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #4f4f56;
        }

        .status,
        .result {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status.success,
        .result.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #86efac;
        }

        .status.error,
        .result.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .template-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .template-item {
          background: rgba(130, 97, 198, 0.1);
          border: 1px solid rgba(130, 97, 198, 0.3);
          border-radius: 8px;
          padding: 1.5rem;
        }

        .template-item h4 {
          margin: 0 0 1rem 0;
          color: #8261c6;
          font-size: 1.1rem;
        }

        .template-item ul {
          margin: 0;
          padding-right: 1.5rem;
          color: #a1a1aa;
        }

        .template-item li {
          margin-bottom: 0.5rem;
        }

        @media (max-width: 768px) {
          .template-info {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  )
}
