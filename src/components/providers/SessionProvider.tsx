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

export default function SessionProvider({ children }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
