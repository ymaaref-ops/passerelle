import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { SiteHeader } from '@/components/site-header'
import { ProgressSteps } from '@/components/progress-steps'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Passerelle — Toutes tes aides étudiantes, une seule démarche',
  description:
    'Passerelle aide les étudiants et alternants à découvrir leurs aides (APL, prêt étudiant, bourse…), déposer leurs documents une seule fois et faire les démarches avec des agents IA. Tu valides toujours avant l’envoi.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1b3a8a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={jakarta.variable}>
      <body className="min-h-dvh antialiased">
        <SiteHeader />
        <ProgressSteps />
        <main>{children}</main>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
