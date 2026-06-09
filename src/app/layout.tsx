import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'X-hunt — AI-Powered Experiences',
  description: 'Discover personalized AI-generated hunts that guide you through real-world adventures, challenges, and meaningful experiences.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00e676',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
        className="min-h-screen bg-muted"
      >
        {children}
      </body>
    </html>
  );
}
