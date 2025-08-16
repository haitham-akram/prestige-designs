'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import './FeaturedClientsSection.css'

type Client = { _id?: string; name: string; imageUrl: string; link?: string; isActive?: boolean }

export default function FeaturedClientsSection() {
  const [clients, setClients] = useState<Client[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'reverse'>('forward')
  const [itemsPerView, setItemsPerView] = useState(4)

  useEffect(() => {
    fetch('/api/featured-clients')
      .then((r) => r.json())
      .then((res) => setClients((res?.data || []).filter((c: Client) => c.isActive !== false)))
      .catch(() => setClients([]))
  }, [])

  useEffect(() => {
    const compute = () => {
      let base = 4
      if (window.innerWidth <= 480) base = 1
      else if (window.innerWidth <= 768) base = 2
      else if (window.innerWidth <= 1024) base = 3
      setItemsPerView(Math.min(base, Math.max(1, clients.length)))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [clients.length])

  if (!clients.length) return null

  const nextSlide = () => {
    if (isAnimating) return
    setDirection('forward')
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev + 1) % clients.length)
    setTimeout(() => setIsAnimating(false), 400)
  }

  const prevSlide = () => {
    if (isAnimating) return
    setDirection('reverse')
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev - 1 + clients.length) % clients.length)
    setTimeout(() => setIsAnimating(false), 400)
  }

  const getVisible = () => {
    const visible: Array<Client & { isNew?: boolean; displayIndex: number }> = []
    const n = Math.min(itemsPerView, clients.length)
    for (let i = 0; i < n; i++) {
      const index = (currentIndex + i) % clients.length
      visible.push({
        ...clients[index],
        displayIndex: index,
        isNew: i === (direction === 'forward' ? itemsPerView - 1 : 0),
      })
    }
    return visible
  }
  const visible = getVisible()

  const shouldShowControls = () => clients.length > itemsPerView

  return (
    <div className="featured-clients-section">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center' }}>
          <h2 className="section-title">عملائنا المميزون</h2>
        </div>
        <div className="customer-carousel">
          <div className="carousel-track">
            {visible.map((c, i) => (
              <div
                key={`${c._id}-${currentIndex}-${i}`}
                className={`carousel-item ${
                  isAnimating && c.isNew ? `animating ${direction === 'reverse' ? 'reverse' : ''}` : ''
                }`}
              >
                <a
                  href={c.link || '#'}
                  target={c.link ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="client-card"
                >
                  <div className="client-image-wrapper">
                    <Image src={c.imageUrl} alt={c.name} width={260} height={260} unoptimized />
                    <span className="client-name-overlay">{c.name}</span>
                  </div>
                </a>
              </div>
            ))}
          </div>

          {shouldShowControls() && (
            <div className="carousel-controls">
              <button
                className="carousel-nav carousel-prev"
                onClick={prevSlide}
                disabled={isAnimating}
                aria-label="Previous"
              >
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
              <div className="carousel-dots">
                {Array.from({ length: clients.length }, (_, i) => (
                  <button
                    key={i}
                    className={`carousel-dot ${i === currentIndex ? 'active' : ''}`}
                    onClick={() => {
                      if (isAnimating) return
                      setDirection(i > currentIndex ? 'forward' : 'reverse')
                      setIsAnimating(true)
                      setCurrentIndex(i)
                      setTimeout(() => setIsAnimating(false), 400)
                    }}
                    disabled={isAnimating}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
              <button
                className="carousel-nav carousel-next"
                onClick={nextSlide}
                disabled={isAnimating}
                aria-label="Next"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
