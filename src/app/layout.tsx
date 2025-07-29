import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import SessionProvider from '@/components/providers/SessionProvider'
import './globals.css'
import '../styles/auth.css'
import '../styles/rtl.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Prestige Designs - Digital Design Store',
  description: 'Premium digital designs for your creative projects',
}

// Wrapper component to suppress hydration warnings from browser extensions
function HydrationWrapper({ children }: { children: React.ReactNode }) {
  return <div suppressHydrationWarning={true}>{children}</div>
}

function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = 'ar' // Default to Arabic for now
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body suppressHydrationWarning={true}>
        <SessionProvider>
          <HydrationWrapper>{children}</HydrationWrapper>
        </SessionProvider>
      </body>
    </html>
  )
}

export default RootLayout
