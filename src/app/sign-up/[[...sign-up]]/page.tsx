import { SignUp } from '@clerk/nextjs';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign Up · X-hunt' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clerkAppearance: any = {
  variables: {
    colorPrimary:         '#22FFAA',
    colorBackground:      'transparent',
    colorInputBackground: 'rgba(10,18,38,0.8)',
    colorInputText:       '#F0F4FF',
    colorNeutral:         '#8B9CC0',
    borderRadius:         '14px',
    fontFamily:           'var(--font-onest), system-ui, sans-serif',
    fontSize:             '14px',
  },
  elements: {
    rootBox:                  'w-full',
    card:                     'shadow-none bg-transparent border-0 !p-0 w-full',
    headerTitle:              'text-white font-extrabold tracking-tight text-2xl',
    headerSubtitle:           'text-[#8B9CC0]',
    formFieldLabel:           'text-[#8B9CC0] text-xs font-semibold uppercase tracking-wider',
    formFieldInput:           'bg-[rgba(10,18,38,0.8)] border border-white/[0.1] text-white rounded-xl backdrop-blur-sm',
    formButtonPrimary:        'bg-[#22FFAA] text-[#050816] font-bold hover:bg-[#1AE090] shadow-[0_4px_20px_rgba(34,255,170,0.3)] rounded-xl',
    socialButtonsBlockButton: 'bg-[rgba(10,18,38,0.8)] border border-white/[0.1] text-white rounded-xl backdrop-blur-sm hover:bg-[rgba(15,25,50,0.9)]',
    dividerLine:              'bg-white/[0.08]',
    dividerText:              'text-[#4A5578]',
    footerActionLink:         'text-[#22FFAA] font-bold',
    footer:                   'text-[#8B9CC0]',
  },
};

export default function SignUpPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--t-bg)', display: 'flex' }}>

      {/* ── Left panel — emerald glass visual (desktop only) ── */}
      <div style={{
        display: 'none',
        position: 'relative',
        flex: '0 0 52%',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #020A14 0%, #041220 40%, #051A18 100%)',
      }}
        className="md:flex md:flex-col md:justify-between md:p-12"
      >
        {/* Emerald glow backdrop */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 80% 70% at 50% 60%, rgba(0,200,130,0.13) 0%, rgba(0,120,100,0.06) 45%, transparent 75%)',
        }} />

        {/* Glass sculpture image */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '80px 40px',
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '4/3' }}>
            <Image
              src="/auth-glass.png"
              alt=""
              fill
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 80px rgba(0,200,130,0.35))' }}
              priority
              onError={() => {}}
            />
            <div style={{
              position: 'absolute', inset: '10%',
              background: 'radial-gradient(ellipse at 45% 40%, rgba(0,210,140,0.22) 0%, rgba(0,160,110,0.14) 35%, rgba(0,80,70,0.08) 65%, transparent 85%)',
              borderRadius: '50%',
              filter: 'blur(24px)',
            }} />
          </div>
        </div>

        {/* Brand copy */}
        <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto', paddingTop: 60 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#22FFAA', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
            Join X-hunt
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 900, color: '#F0F4FF', lineHeight: 1.15, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
            Your impact<br />starts here.
          </h1>
          <p style={{ fontSize: 15, color: '#8B9CC0', lineHeight: 1.65, maxWidth: 340 }}>
            Create your free account and let our AI match you with missions that align with your skills, passions, and values.
          </p>

          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32 }}>
            <div style={{ display: 'flex' }}>
              {['#22FFAA', '#6D5DFD', '#FFB84D', '#FF5C7A'].map((c, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid var(--t-bg)', marginLeft: i ? -8 : 0, opacity: 0.85 }} />
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#8B9CC0' }}>
              Join <strong style={{ color: '#F0F4FF' }}>2,400+</strong> explorers
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 5vw, 64px) clamp(20px, 6vw, 72px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Mobile-only subtle bg glow */}
        <div className="md:hidden" style={{
          position: 'absolute', top: '-20%', right: '-20%', width: '70vw', height: '70vw',
          background: 'radial-gradient(circle, rgba(0,200,130,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ marginBottom: 40 }}>
            <Image
              src="/xhunt-logo.png"
              alt="X-hunt"
              width={132}
              height={132}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>

          <SignUp appearance={clerkAppearance} />
        </div>
      </div>

    </div>
  );
}
