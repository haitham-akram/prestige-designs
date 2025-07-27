/**
 * Session Provider Component
 *
 * This component wraps the app with NextAuth SessionProvider
 * to provide authentication context throughout the application.
 *
 * Features:
 * - Provides session context to all components
 * - Handles session state management
 * - Enables useSession hook usage
 * - Client-side session management
 */

'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

interface SessionProviderProps {
  children: ReactNode
}

export default function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
    >
      {children}
    </NextAuthSessionProvider>
  )
}
