'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

type Slide = { _id?: string; imageUrl: string; title?: string; subtitle?: string; ctaText?: string; ctaHref?: string }

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<Slide[]>([])
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    fetch('/api/hero')
      .then((r) => r.json())
      .then((res) => setSlides(res?.data || []))
      .catch(() => setSlides([]))
  }, [])

  // Auto-play functionality - Faster timing for better performance
  useEffect(() => {
    if (slides.length === 0) return
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000) // Reduced from 8000ms to 5000ms for faster auto-play
    return () => clearInterval(interval)
  }, [slides.length])

  const nextSlide = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide((prev) => (prev + 1) % slides.length)
    setTimeout(() => setIsTransitioning(false), 500) // Match CSS transition duration
  }

  const prevSlide = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
    setTimeout(() => setIsTransitioning(false), 500) // Match CSS transition duration
  }

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentSlide) return
    setIsTransitioning(true)
    setCurrentSlide(index)
    setTimeout(() => setIsTransitioning(false), 500) // Match CSS transition duration
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
                quality={85} // Reduced from 100 to 85 for better performance
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyugDYfvE2AU=" // Low quality placeholder
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
