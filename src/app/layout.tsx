import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CardGrade Studio — Professional Card Grading',
  description:
    'Frontend-only professional card grading platform. Analyze centering, surface, edges, and corners locally — no backend, no AI cloud, fully offline.',
  manifest: '/manifest.json',
  keywords: ['card grading', 'PSA', 'BGS', 'CGC', 'SGC', 'trading cards', 'centering tool'],
  authors: [{ name: 'CardGrade Studio' }],
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#080810',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
