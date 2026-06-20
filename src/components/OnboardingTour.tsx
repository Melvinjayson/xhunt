'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Wallet, Compass, Target, TrendingUp, Star } from 'lucide-react';
import { t } from '@/theme/colors';

interface Props { onDone: () => void }

const STEPS = [
  { icon: Wallet,     color: t.ai,      title: 'Your Participation Wallet', body: 'Every mission you complete earns real rewards. Your balance lives here, always visible.' },
  { icon: Compass,    color: t.accent,  title: 'Find Opportunities',        body: 'Explore hundreds of missions matched to your skills, causes, and schedule.' },
  { icon: Target,     color: t.warning, title: 'Track Your Progress',       body: 'My Missions shows everything in flight — steps completed, proofs submitted, rewards pending.' },
  { icon: TrendingUp, color: t.info,    title: 'Build Your Reputation',     body: 'Your trust score and streak show how reliable you are. Earn better missions over time.' },
  { icon: Star,       color: t.accent,  title: "You're Ready!",             body: 'Your X-Hunt journey begins now. Start with a mission that fits your schedule.' },
];

export default function OnboardingTour({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 24,
          padding: 32,
          maxWidth: 460,
          width: 'calc(100vw - 40px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: `${current.color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Icon size={26} color={current.color} />
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: t.txt,
            marginBottom: 8,
          }}
        >
          {current.title}
        </div>

        {/* Body */}
        <div
          style={{
            fontSize: 14,
            color: t.txtDim,
            lineHeight: 1.65,
            marginBottom: 24,
          }}
        >
          {current.body}
        </div>

        {/* Progress dots */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginBottom: 24,
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === step ? current.color : t.border,
              }}
            />
          ))}
        </div>

        {/* Nav row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Back button */}
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            style={{
              fontSize: 13,
              color: t.txtDim,
              background: 'none',
              border: 'none',
              cursor: step === 0 ? 'default' : 'pointer',
              opacity: step === 0 ? 0 : 1,
              padding: 0,
            }}
          >
            ← Back
          </button>

          {/* Next / Done button */}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              style={{
                background: t.accent,
                color: t.bg,
                padding: '10px 24px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Next →
            </button>
          ) : (
            <Link
              href="/explore"
              onClick={onDone}
              style={{
                background: t.accent,
                color: t.bg,
                padding: '10px 24px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Let&apos;s Go →
            </Link>
          )}
        </div>

        {/* Skip tour */}
        <div
          style={{
            marginTop: 16,
            fontSize: 12,
            color: t.txtFaint,
            cursor: 'pointer',
            textAlign: 'center',
          }}
          onClick={onDone}
        >
          Skip tour
        </div>
      </div>
    </div>
  );
}
