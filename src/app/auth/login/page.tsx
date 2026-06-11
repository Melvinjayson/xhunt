import { SignIn } from '@clerk/nextjs';
import Image from 'next/image';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const appearance: any = {
  variables: {
    colorPrimary:         '#22FFAA',
    colorBackground:      '#07101F',
    colorInputBackground: '#0A1226',
    colorInputText:       '#F0F4FF',
    colorNeutral:         '#8B9CC0',
    borderRadius:         '14px',
    fontFamily:           'var(--font-onest), system-ui, sans-serif',
    fontSize:             '14px',
  },
  elements: {
    card:                     'shadow-none border border-white/[0.08]',
    headerTitle:              'text-white font-extrabold tracking-tight',
    headerSubtitle:           'text-[#8B9CC0]',
    formFieldLabel:           'text-[#8B9CC0] text-xs font-semibold uppercase tracking-wider',
    formFieldInput:           'bg-[#0A1226] border-white/[0.08] text-white',
    formButtonPrimary:        'bg-[#22FFAA] text-[#050816] font-bold hover:bg-[#1AE090]',
    socialButtonsBlockButton: 'bg-[#0A1226] border-white/[0.08] text-white',
    dividerLine:              'bg-white/[0.08]',
    dividerText:              'text-[#4A5578]',
    footerActionLink:         'text-[#22FFAA] font-bold',
  },
};

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050816',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <Image src="/xhunt-logo.png" alt="X-hunt" width={44} height={44} style={{ objectFit: 'contain' }} />
      </div>

      <SignIn
        routing="hash"
        signUpUrl="/auth/signup"
        appearance={appearance}
      />
    </div>
  );
}
