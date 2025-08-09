'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import ProductCard from './ProductCard'

interface Product {
  id: string
  name: string
  price: number
  originalPrice: number
  rating: number
  image: string
  category: string
}

interface ProductCarouselProps {
  products: Product[]
  itemsPerView?: number
}

export default function ProductCarousel({ products, itemsPerView = 3 }: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const totalSlides = Math.ceil(products.length / itemsPerView)

  const nextSlide = () => {
    console.log('Next clicked, currentIndex:', currentIndex, 'totalSlides:', totalSlides)
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const prevSlide = () => {
    console.log('Prev clicked, currentIndex:', currentIndex)
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToSlide = (index: number) => {
    console.log('Going to slide:', index)
    setCurrentIndex(index)
  }

  // Calculate the actual translateX - move by 100% for each slide (3 items)
  const translateX = -(currentIndex * 100)

  console.log(
    'Products:',
    products.length,
    'currentIndex:',
    currentIndex,
    'totalSlides:',
    totalSlides,
    'translateX:',
    translateX
  )

  if (products.length === 0) {
    return (
      <div className="product-carousel-empty">
        <div className="empty-state">
          <h3>لا توجد منتجات متاحة</h3>
          <p>سيتم إضافة منتجات قريباً</p>
        </div>
      </div>
    )
  }

  return (
    <div className="product-carousel">
      <div className="carousel-container">
        <div className="carousel-track" style={{ transform: `translateX(${translateX}%)` }}>
          {products.map((product) => (
            <div key={product.id} className="carousel-item">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls - Positioned under products */}
      <div className="carousel-controls">
        <button className="carousel-nav carousel-prev" onClick={prevSlide} disabled={currentIndex === 0}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        <div className="carousel-dots">
          {Array.from({ length: totalSlides }, (_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              title={`Slide ${index + 1} of ${totalSlides}`}
            />
          ))}
        </div>

        <button className="carousel-nav carousel-next" onClick={nextSlide} disabled={currentIndex === totalSlides - 1}>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>
  )
}
