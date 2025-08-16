'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import './CategoriesBanner.css'

interface CategoriesBannerData {
  image: string
  alt: string
}

export default function CategoriesBanner() {
  const [bannerData, setBannerData] = useState<CategoriesBannerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBannerData = async () => {
      try {
        const response = await fetch('/api/settings')
        const data = await response.json()

        if (data.data?.categoriesBanner?.imageUrl) {
          setBannerData({
            image: data.data.categoriesBanner.imageUrl,
            alt: data.data.categoriesBanner.alt || 'Categories Banner',
          })
        }
      } catch (error) {
        console.error('Failed to fetch categories banner:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBannerData()
  }, [])

  if (loading) {
    return (
      <section className="csn-banner-section">
        <div className="container">
          <div className="csn-banner-loading">
            <div className="csn-loading-spinner"></div>
          </div>
        </div>
      </section>
    )
  }

  if (!bannerData?.image) {
    return null
  }

  return (
    <section className="csn-banner-section">
      <div className="container">
        <div className="csn-banner-wrapper">
          <div className="csn-banner-image">
            <Image
              src={bannerData.image}
              alt={bannerData.alt}
              width={1200}
              height={400}
              className="csn-banner-img"
              priority
              quality={100}
              unoptimized={true}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
