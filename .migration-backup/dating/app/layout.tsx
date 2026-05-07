import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rich Dating Network | Exclusive Dating for Affluent Singles',
  description: 'Join Rich Dating Network and connect with successful, affluent singles looking for genuine relationships.',
  keywords: 'rich dating, affluent singles, wealthy singles, exclusive dating, successful singles, luxury dating, elite dating',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Rich Dating Network',
    description: 'Exclusive Dating for Affluent Singles',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rich Dating Network',
    description: 'Exclusive Dating for Affluent Singles',
  },
}

export const viewport: Viewport = {
  themeColor: '#FF192C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Rich Dating" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif' },
              success: { iconTheme: { primary: '#FF192C', secondary: '#fff' } },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
