'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'

type DiscordBanner = { imageUrl?: string; title?: string; description?: string; discord?: string }

export default function DiscordSection() {
  const [banner, setBanner] = useState<DiscordBanner>({})
  const [links, setLinks] = useState<{ discord?: string }>({})

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        const data = res?.data || {}
        setBanner(data.discordBanner || {})
        setLinks({ discord: data?.social?.discord })
      })
      .catch(() => {})
  }, [])

  return (
    <div className="discord-section">
      <div className="container">
        <a href={links.discord || '#'} className="discord-banner card-neon" target="_blank" rel="noopener noreferrer">
          {banner.imageUrl && (
            <div className="discord-image-container">
              <Image
                src={banner.imageUrl}
                alt={banner.title || 'Discord Community'}
                fill
                className="discord-image"
                unoptimized
              />
            </div>
          )}
        </a>
      </div>
    </div>
  )
}
