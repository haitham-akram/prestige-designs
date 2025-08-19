'use client'

import { useState } from 'react'

export default function DiscordTestButton() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const testDiscordWebhook = async () => {
    setTesting(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/test-discord-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setResult({
        success: data.success,
        message: data.message || (data.success ? 'Test successful!' : 'Test failed'),
      })
    } catch {
      setResult({
        success: false,
        message: 'Network error occurred',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="discord-test-section">
      <h3>🔔 Discord Webhook Test</h3>
      <p>Test the Discord notification system</p>

      <button
        onClick={testDiscordWebhook}
        disabled={testing}
        className={`btn ${testing ? 'btn-loading' : 'btn-primary'}`}
      >
        {testing ? <>🔄 Testing...</> : <>🧪 Test Discord Webhook</>}
      </button>

      {result && (
        <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
          {result.success ? '✅' : '❌'} {result.message}
        </div>
      )}

      <style jsx>{`
        .discord-test-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border: 1px solid #e9ecef;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-loading {
          background: #6c757d;
          color: white;
          cursor: not-allowed;
        }

        .alert {
          margin-top: 10px;
          padding: 10px 15px;
          border-radius: 6px;
        }

        .alert-success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }

        .alert-error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }
      `}</style>
    </div>
  )
}
