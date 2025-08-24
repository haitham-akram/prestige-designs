import type { Metadata } from 'next'
import Image from 'next/image'
import { use } from 'react'
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

// export async function generateMetadata(): Promise<Metadata> {
//   try {
//     const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/settings`, { cache: 'no-store' })
//     const json = await res.json()
//     const branding = json?.data?.branding || {}
//     return {
//       title: 'Prestige Designs - Digital Design Store',
//       description: 'Premium digital designs for your creative projects',
//       icons: {
//         icon: branding.faviconUrl || '/favicon.ico',
//         shortcut: branding.faviconUrl || '/favicon.ico',
//         apple: branding.faviconUrl || '/favicon.ico',
//       },
//     }
//   } catch {
//     return {
//       title: 'Prestige Designs - Digital Design Store',
//       description: 'Premium digital designs for your creative projects',
//       icons: {
//         icon: '/favicon.ico',
//         shortcut: '/favicon.ico',
//         apple: '/favicon.ico',
//       },
//     }
//   }
// }
export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  const paypalId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
  const spaceremitToken = 'WDPKRV5KEYK5BC381K406XSIIQ9NU1Y6G9GO4HMTPCEX3ZC38H'

  try {
    const res = await fetch(`${baseUrl}/api/settings`, { cache: 'no-store' })
    const json = await res.json()
    const branding = json?.data?.branding || {}

    return {
      title: 'Prestige Designs - Digital Design Store',
      description: 'Premium digital designs for your creative projects',
      icons: {
        icon: branding.faviconUrl || '/favicon.ico',
        shortcut: branding.faviconUrl || '/favicon.ico',
        apple: branding.faviconUrl || '/favicon.ico',
      },
      other: {
        'spaceremit-verification': spaceremitToken,
        'paypal-client-id': paypalId,
      },
    }
  } catch {
    return {
      title: 'Prestige Designs - Digital Design Store',
      description: 'Premium digital designs for your creative projects',
      icons: {
        icon: '/favicon.ico',
        shortcut: '/favicon.ico',
        apple: '/favicon.ico',
      },
      other: {
        'spaceremit-verification': 'WDPKRV5KEYK5BC381K406XSIIQ9NU1Y6G9GO4HMTPCEX3ZC38H',
        'paypal-client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
      },
    }
  }
}
// Wrapper component to suppress hydration warnings from browser extensions
function HydrationWrapper({ children }: { children: React.ReactNode }) {
  return <div suppressHydrationWarning={true}>{children}</div>
}

function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = 'ar' // Default to Arabic for now
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* <meta name="spaceremit-verification" content="WDPKRV5KEYK5BC381K406XSIIQ9NU1Y6G9GO4HMTPCEX3ZC38H"/> */}
        <meta name="paypal-client-id" content={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''} />
      </head>
      <body suppressHydrationWarning={true}>
        <SessionProvider>
          <HydrationWrapper>{children}</HydrationWrapper>
        </SessionProvider>
      </body>
    </html>
  )
}

export default RootLayout
