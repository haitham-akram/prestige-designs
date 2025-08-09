'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    // {
    //   id: 1,
    //   image: '/site/new-1.png',
    // },
    // {
    //   id: 2,
    //   image: '/site/new-2.png',
    // },
    {
      id: 3,
      image: '/site/1.jpg',
    },
    {
      id: 4,
      image: '/site/2.jpg',
    },
  ]

  // Auto-play functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 8000) // Change slide every 8 seconds

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
    <section className="hero-carousel">
      <div className="carousel-container">
        <div className="carousel-wrapper">
          {slides.map((slide, index) => (
            <div key={slide.id} className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}>
              <Image
                src={slide.image}
                alt={`Prestige Designs Slide ${slide.id}`}
                width={1920}
                height={1080}
                className="carousel-image"
                priority={index === 0}
                loading={index === 0 ? 'eager' : 'lazy'}
                quality={100}
                unoptimized={true}
              />
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
    </section>
  )
}
