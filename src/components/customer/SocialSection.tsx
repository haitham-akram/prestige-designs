'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTelegram, faWhatsapp, faYoutube, faTiktok } from '@fortawesome/free-brands-svg-icons'
import './SocialSection.css'

interface SocialData {
  text?: string
  telegram?: string
  whatsapp?: string
  youtube?: string
  tiktok?: string
}

export default function SocialSection() {
  const [social, setSocial] = useState<SocialData>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSocial = async () => {
      try {
        const response = await fetch('/api/settings')
        const data = await response.json()
        setSocial(data?.data?.social || {})
      } catch (error) {
        console.error('Error fetching social data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSocial()
  }, [])

  if (loading) {
    return null
  }

  // Check if we have any social links (excluding Discord)
  const hasSocialLinks = social.telegram || social.whatsapp || social.youtube || social.tiktok

  if (!social.text && !hasSocialLinks) {
    return null
  }

  return (
    <div className="social-section">
      <div className="social-banner">
        <div className="social-content">
          {social.text && (
            <div className="social-text-container">
              <p className="social-description">{social.text}</p>
            </div>
          )}

          {hasSocialLinks && (
            <div className="social-icons-grid">
              {social.telegram && (
                <a
                  href={social.telegram}
                  className="social-icon-card"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Telegram"
                >
                  <FontAwesomeIcon icon={faTelegram} className="social-icon" />
                  <span className="social-label">تيليجرام</span>
                </a>
              )}

              {social.whatsapp && (
                <a
                  href={social.whatsapp}
                  className="social-icon-card"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                >
                  <FontAwesomeIcon icon={faWhatsapp} className="social-icon" />
                  <span className="social-label">واتساب</span>
                </a>
              )}

              {social.youtube && (
                <a
                  href={social.youtube}
                  className="social-icon-card"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  <FontAwesomeIcon icon={faYoutube} className="social-icon" />
                  <span className="social-label">يوتيوب</span>
                </a>
              )}

              {social.tiktok && (
                <a
                  href={social.tiktok}
                  className="social-icon-card"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                >
                  <FontAwesomeIcon icon={faTiktok} className="social-icon" />
                  <span className="social-label">تيك توك</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
