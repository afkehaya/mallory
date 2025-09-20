import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/providers/AuthProvider'
import HealthBanner from '@/components/HealthBanner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'Mallory.fun - Your AI Agent That Gets Things Done',
  description: 'Fund Mallory with USDC, tell her what to buy, and she handles everything. Starting with Amazon shopping, expanding to handle any online task.',
  keywords: ['AI agent', 'shopping assistant', 'Amazon', 'USDC', 'crypto payments'],
  authors: [{ name: 'Mallory.fun' }],
  creator: 'Mallory.fun',
  publisher: 'Mallory.fun',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://mallory.fun'),
  openGraph: {
    title: 'Mallory.fun - Your AI Agent That Gets Things Done',
    description: 'Fund Mallory with USDC, tell her what to buy, and she handles everything.',
    url: 'https://mallory.fun',
    siteName: 'Mallory.fun',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mallory.fun - Your AI Agent That Gets Things Done',
    description: 'Fund Mallory with USDC, tell her what to buy, and she handles everything.',
    creator: '@malloryfun',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={inter.className}>
        <AuthProvider>
          <HealthBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}