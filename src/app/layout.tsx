import type { Metadata, Viewport } from 'next';
import { Inter, Onest } from 'next/font/google';
import './globals.css';

const inter = Onest({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

const onest = Onest({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-onest',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://xhunt.app';

export const metadata: Metadata = {
  metadataBase:    new URL(APP_URL),
  title: {
    default:   'X-hunt — AI Mission Experiences',
    template:  '%s · X-hunt',
  },
  description:     'Discover AI-powered missions that guide you through real-world adventures, challenges, and meaningful experiences. Join thousands of explorers.',
  keywords:        ['AI experiences', 'missions', 'gamification', 'adventures', 'xhunt'],
  manifest:        '/manifest.json',
  appleWebApp: {
    capable:        true,
    statusBarStyle: 'black-translucent',
    title:          'X-hunt',
  },
  openGraph: {
    type:        'website',
    locale:      'en_US',
    url:          APP_URL,
    siteName:    'X-hunt',
    title:       'X-hunt — AI Mission Experiences',
    description: 'Discover AI-powered missions that guide you through real-world adventures.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'X-hunt' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'X-hunt — AI Mission Experiences',
    description: 'Discover AI-powered missions that guide you through real-world adventures.',
    images:      ['/og-image.png'],
  },
  robots: {
    index:   true,
    follow:  true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export const viewport: Viewport = {
  width:           'device-width',
  initialScale:    1,
  maximumScale:    1,
  userScalable:    false,
  themeColor:      '#27e07d',
  colorScheme:     'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${onest.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
      </head>
      <body
        style={{ fontFamily: 'var(--font-onest), system-ui, sans-serif' }}
        className="min-h-screen bg-muted"
      >
        {children}
      </body>
    </html>
  );
}
