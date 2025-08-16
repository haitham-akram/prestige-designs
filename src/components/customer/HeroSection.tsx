'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

type Slide = { _id?: string; imageUrl: string; title?: string; subtitle?: string; ctaText?: string; ctaHref?: string }

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<Slide[]>([])

  useEffect(() => {
    fetch('/api/hero')
      .then((r) => r.json())
      .then((res) => setSlides(res?.data || []))
      .catch(() => setSlides([]))
  }, [])

  // Auto-play functionality
  useEffect(() => {
    if (slides.length === 0) return
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [slides.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  return (
    <div className="hero-carousel">
      <div className="carousel-container">
        <div className="carousel-wrapper">
          {slides.map((slide, index) => (
            <div key={slide._id || index} className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}>
              <Image
                src={slide.imageUrl}
                alt={slide.title || `Prestige Designs Slide ${index + 1}`}
                width={1920}
                height={1080}
                className="carousel-image"
                priority={index === 0}
                loading={index === 0 ? 'eager' : 'lazy'}
                quality={100}
                unoptimized={true}
              />
              {slide.title || slide.subtitle ? (
                <div className="slide-overlay">
                  {slide.title ? <h2>{slide.title}</h2> : null}
                  {slide.subtitle ? <p>{slide.subtitle}</p> : null}
                  {slide.ctaText && slide.ctaHref ? (
                    <a href={slide.ctaHref} className="btn btn-primary">
                      {slide.ctaText}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button className="carousel-nav carousel-prev" onClick={prevSlide} aria-label="Previous slide">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <button className="carousel-nav carousel-next" onClick={nextSlide} aria-label="Next slide">
          <FontAwesomeIcon icon={faChevronRight} />
        </button>

        {/* Dots Indicator */}
        <div className="carousel-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
      {/* </section> */}
    </div>
  )
}
