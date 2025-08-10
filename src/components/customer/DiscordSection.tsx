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
        <div className="discord-banner card-neon">
          <div className="discord-content">
            {/* <div className="discord-icon">
              <Image src="/site/discord-icon.png" alt="Discord" width={40} height={40} className="discord-icon" />
            </div> */}
            <a
              href={links.discord || '#'}
              className="btn btn-primary btn-large"
              target="_blank"
              rel="noopener noreferrer"
            >
              انضم للدسكورد
            </a>
          </div>
          {banner.imageUrl ? (
            <div className="discord-art">
              <Image src={banner.imageUrl} alt={banner.title as string} width={640} height={360} unoptimized />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
