import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import SessionProvider from '@/components/providers/SessionProvider'
import './globals.css'
import '../styles/auth.css'

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning={true}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
