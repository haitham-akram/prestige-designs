'use client'

import { useEffect, useState } from 'react'
import { ReactNode } from 'react'
/**
 * NoSSR Component
 *
 * Prevents Server-Side Rendering for components that need to be client-only
 * This helps avoid hydration mismatches for dynamic content
 */
export default function NoSSR({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
