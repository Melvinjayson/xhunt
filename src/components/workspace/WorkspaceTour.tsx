'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, PenTool, Activity, Bot, BarChart2 } from 'lucide-react';
import { t } from '@/theme/colors';

interface Props {
  onDone: () => void;
}

const STEPS = [
  {
    icon: LayoutDashboard,
    color: t.ai,
    title: 'Your Dashboard',
    body: 'Overview of mission performance, active participants, and revenue at a glance.',
  },
  {
    icon: PenTool,
    color: t.accent,
    title: 'Mission Studio',
    body: 'Create, configure, and publish missions. Set rewards, steps, and verification requirements.',
  },
  {
    icon: Activity,
    color: t.warning,
    title: 'Mission Control',
    body: 'Monitor live missions: participant progress, submissions, and real-time activity.',
  },
  {
    icon: Bot,
    color: t.info,
    title: 'AI Agents',
    body: 'Automate validation, participant matching, and outcome analysis with your AI workforce.',
  },
  {
    icon: BarChart2,
    color: t.aiLight,
    title: 'Analytics & Outcomes',
    body: 'Track completion rates, payout totals, and verified impact across all missions.',
  },
] as const;

export default function WorkspaceTour({ onDone }: Props) {
  const [step, setStep] = useState(0);

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const isLast = step === STEPS.length - 1;

  const handleDone = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('xhunt_workspace_tour_done', 'true');
    }
    onDone();
  };

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Dialog */}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 24,
          padding: 32,
          maxWidth: 480,
          width: '90vw',
        }}
      >
        {/* Step icon */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `${currentStep.color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Icon size={24} color={currentStep.color} />
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: t.txt,
            margin: '0 0 10px',
          }}
        >
          {currentStep.title}
        </h2>

        {/* Body */}
        <p
          style={{
            fontSize: 14,
            color: t.txtDim,
            lineHeight: 1.65,
            margin: '0 0 28px',
          }}
        >
          {currentStep.body}
        </p>

        {/* Progress dots */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 28,
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === step ? currentStep.color : t.border,
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Navigation row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          {/* Back button */}
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{
              background: 'none',
              border: 'none',
              cursor: step === 0 ? 'default' : 'pointer',
              color: step === 0 ? t.txtFaint : t.txtDim,
              fontSize: 14,
              fontWeight: 500,
              padding: '8px 0',
            }}
          >
            ← Back
          </button>

          {/* Next / Finish */}
          {!isLast ? (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              style={{
                background: t.accent,
                color: t.bg,
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Next →
            </button>
          ) : (
            <Link
              href="/workspace"
              onClick={handleDone}
              style={{
                background: t.accent,
                color: t.bg,
                borderRadius: 10,
                padding: '10px 20px',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Go to Dashboard →
            </Link>
          )}
        </div>

        {/* Skip tour */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleDone}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: t.txtFaint,
              fontSize: 13,
              textDecoration: 'underline',
            }}
          >
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
}
