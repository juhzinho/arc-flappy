import type { Metadata, Viewport } from 'next'
import { Press_Start_2P } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SkyBackground } from '@/components/sky-background'
import { Providers } from '@/app/providers'
import './globals.css'

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
})

export const metadata: Metadata = {
  title: 'ARCADE FLAPPY',
  description: 'Arcade Flappy - Jogo Web3 on-chain com tema neon',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a1a',
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${pressStart2P.variable} font-sans antialiased`}>
        <Providers>
          <SkyBackground />
          <div className="relative z-10">{children}</div>
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
