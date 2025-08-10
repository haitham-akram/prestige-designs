'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowRight, faUser, faStar, faHeart } from '@fortawesome/free-solid-svg-icons'
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons'
import './ReviewsSection.css'

type Review = {
  _id: string
  name: string
  rating: number
  text: string
  avatar: string
  isActive?: boolean
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'reverse'>('forward')
  const [itemsPerView, setItemsPerView] = useState(3)

  useEffect(() => {
    fetch('/api/reviews')
      .then((r) => r.json())
      .then((res) => setReviews((res?.data || []).filter((r: Review) => r.isActive !== false)))
      .catch(() => setReviews([]))
  }, [])

  useEffect(() => {
    const compute = () => {
      let base = 3
      if (window.innerWidth <= 480) base = 1
      else if (window.innerWidth <= 768) base = 2
      else if (window.innerWidth <= 1024) base = 3
      setItemsPerView(Math.min(base, Math.max(1, reviews.length)))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [reviews.length])

  if (!reviews.length) {
    return (
      <section className="section reviews-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">آراء العملاء</h2>
          </div>
          <div className="reviews-empty">
            <p>لا توجد آراء عملاء متاحة حالياً</p>
          </div>
        </div>
      </section>
    )
  }

  const nextSlide = () => {
    if (isAnimating) return
    setDirection('forward')
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev + 1) % reviews.length)
    setTimeout(() => setIsAnimating(false), 500)
  }

  const prevSlide = () => {
    if (isAnimating) return
    setDirection('reverse')
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length)
    setTimeout(() => setIsAnimating(false), 500)
  }

  const getVisible = () => {
    const visible: Array<Review & { isNew?: boolean; displayIndex: number }> = []
    const n = Math.min(itemsPerView, reviews.length)
    for (let i = 0; i < n; i++) {
      const index = (currentIndex + i) % reviews.length
      visible.push({
        ...reviews[index],
        displayIndex: index,
        isNew: i === (direction === 'forward' ? itemsPerView - 1 : 0),
      })
    }
    return visible
  }
  const visible = getVisible()

  const shouldShowControls = () => reviews.length > itemsPerView

  return (
    <div className="reviews-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">آراء العملاء</h2>
        </div>

        <div className="reviews-carousel">
          <div className="carousel-track">
            {visible.map((review, i) => (
              <div
                key={`${review._id}-${currentIndex}-${i}`}
                className={`carousel-item ${
                  isAnimating && review.isNew ? `animating ${direction === 'reverse' ? 'reverse' : ''}` : ''
                }`}
              >
                <div className="review-card">
                  <div className="review-header">
                    <div className="review-avatar">
                      <Image
                        src={review.avatar.trim()}
                        alt={review.name}
                        height={50}
                        width={50}
                        className="review-avatar-img"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling?.classList.remove('fallback-hidden')
                        }}
                      />
                      <span className="avatar-fallback fallback-hidden">
                        <FontAwesomeIcon icon={faUser} />
                      </span>
                    </div>
                    <div className="review-info">
                      <h3 className="review-name">{review.name}</h3>
                      <div className="review-stars">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={i < review.rating ? 'star filled' : 'star'}>
                            <FontAwesomeIcon icon={i < review.rating ? faStar : faStarRegular} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="review-text">{review.text}</p>
                  <div className="review-heart">
                    <FontAwesomeIcon icon={faHeart} />
                  </div>
                </div>
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
                {Array.from({ length: reviews.length }, (_, i) => (
                  <button
                    key={i}
                    className={`carousel-dot ${i === currentIndex ? 'active' : ''}`}
                    onClick={() => {
                      if (isAnimating) return
                      setDirection(i > currentIndex ? 'forward' : 'reverse')
                      setIsAnimating(true)
                      setCurrentIndex(i)
                      setTimeout(() => setIsAnimating(false), 500)
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
