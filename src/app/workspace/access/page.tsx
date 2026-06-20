'use client';
import Image from 'next/image';
import Link from 'next/link';
import { LayoutDashboard, Bot, BarChart2, ArrowRight, Shield, Zap, Users } from 'lucide-react';
import { t } from '@/theme/colors';

export default function WorkspaceAccessPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: t.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 64,
          width: '100%',
          maxWidth: 1080,
        }}
        className="flex-col lg:flex-row"
      >
        {/* Left Column */}
        <div style={{ flex: '1 1 0', maxWidth: 540 }}>
          {/* Logo */}
          <div style={{ marginBottom: 20 }}>
            <Image src="/xhunt-logo.png" alt="X-Hunt" width={48} height={48} />
          </div>

          {/* Badge */}
          <div
            style={{
              display: 'inline-block',
              color: t.ai,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Workspace Portal
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: 'clamp(32px, 4vw, 40px)',
              fontWeight: 900,
              color: t.txt,
              lineHeight: 1.15,
              margin: '0 0 16px',
            }}
          >
            Your organization&apos;s mission command center.
          </h1>

          {/* Subtitle */}
          <p
            style={{
              color: t.txtDim,
              fontSize: 15,
              lineHeight: 1.65,
              margin: '0 0 36px',
            }}
          >
            Publish missions, deploy AI agents, measure real-world outcomes, and build a verified
            network of contributors.
          </p>

          {/* Feature rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 36 }}>
            <FeatureRow
              icon={<LayoutDashboard size={20} color={t.ai} />}
              title="Mission Studio"
              description="Create, configure, and publish missions with AI-powered templates"
            />
            <FeatureRow
              icon={<Bot size={20} color={t.accent} />}
              title="AI Agents"
              description="Automate validation, participant matching, and outcome analysis"
            />
            <FeatureRow
              icon={<BarChart2 size={20} color={t.warning} />}
              title="Analytics & Outcomes"
              description="Track completion rates, verified impact, and payout totals in real time"
            />
            <FeatureRow
              icon={<Users size={20} color={t.info} />}
              title="Participant Network"
              description="Build a verified community of contributors matched to your missions"
            />
          </div>

          {/* CTA Button */}
          <Link
            href="/sign-in?redirect_url=/workspace"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '14px 24px',
              background: t.accent,
              color: t.bg,
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 12,
              textDecoration: 'none',
              marginBottom: 16,
            }}
          >
            Sign in to Workspace <ArrowRight size={16} />
          </Link>

          {/* Secondary link */}
          <p style={{ margin: 0, fontSize: 13, color: t.txtDim }}>
            New organization?{' '}
            <Link
              href="/onboard"
              style={{ color: t.txtDim, textDecoration: 'underline', fontWeight: 500 }}
            >
              Set up your workspace
            </Link>
          </p>
        </div>

        {/* Right Column — desktop only */}
        <div
          className="hidden lg:block"
          style={{ flex: '1 1 0', maxWidth: 420 }}
        >
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 20,
              padding: 28,
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LayoutDashboard size={18} color={t.txt} />
                <span style={{ color: t.txt, fontWeight: 600, fontSize: 14 }}>
                  Workspace Dashboard
                </span>
              </div>
              <Zap size={14} color={t.accent} />
            </div>

            {/* Metric rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <MetricRow label="Active Missions" value="24" valueColor={t.accent} />
              <MetricRow label="Participants" value="1,284" valueColor={t.txt} />
              <MetricRow label="Verified Outcomes" value="98%" valueColor={t.ai} />
            </div>

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: t.border,
                marginBottom: 24,
              }}
            />

            {/* AI Agents Online */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
              }}
            >
              <span style={{ color: t.txtDim, fontSize: 13 }}>AI Agents Online</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Dot color={t.accent} />
                <Dot color={t.ai} />
                <Dot color={t.warning} />
                <span style={{ color: t.txtDim, fontSize: 12, marginLeft: 4 }}>3 active</span>
              </div>
            </div>

            {/* Security footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={14} color={t.txtFaint} />
              <span style={{ color: t.txtFaint, fontSize: 12 }}>
                Enterprise-grade security &amp; compliance
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: t.surface,
          border: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ color: t.txt, fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{title}</div>
        <div style={{ color: t.txtDim, fontSize: 13, lineHeight: 1.5 }}>{description}</div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ color: t.txtDim, fontSize: 13 }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: 700, fontSize: 18 }}>{value}</span>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
      }}
    />
  );
}
