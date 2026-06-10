import type { Metadata } from 'next';
import Nav from '@/components/marketing/Nav';
import Footer from '@/components/marketing/Footer';

export const metadata: Metadata = {
  title: {
    default: 'X-hunt — AI Mission Operating System',
    template: '%s · X-hunt',
  },
  description:
    'Transform goals into measurable outcomes with AI-powered missions. X-hunt is the Mission Operating System for individuals, enterprises, educators, and brands.',
  keywords: [
    'AI missions', 'mission operating system', 'goal achievement', 'outcome intelligence',
    'enterprise workforce', 'behavioral change', 'gamification', 'xhunt',
  ],
  openGraph: {
    type: 'website',
    siteName: 'X-hunt',
    title: 'X-hunt — AI Mission Operating System',
    description: 'Transform goals into measurable outcomes with AI-powered missions.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'X-hunt' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'X-hunt — AI Mission Operating System',
    description: 'Transform goals into measurable outcomes with AI-powered missions.',
    images: ['/og-image.png'],
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
