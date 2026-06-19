import { t } from '@/theme/colors';
import type { VerificationStatus } from '@/lib/types';

export type MissionStatus = 'active' | 'pending' | 'approved' | 'completed' | 'saved';

type AnyStatus = VerificationStatus | MissionStatus;

interface Config {
  label: string;
  color: string;
  bg: string;
  dot?: boolean;
  pulse?: boolean;
}

const STATUS_CONFIG: Record<AnyStatus, Config> = {
  // verification
  submitted:     { label: 'Submitted',      color: t.info,    bg: `${t.info}18`,    dot: true },
  ai_reviewing:  { label: 'AI Reviewing',   color: t.ai,      bg: `${t.ai}18`,      dot: true, pulse: true },
  manual_review: { label: 'In Review',      color: t.warning, bg: `${t.warning}18`, dot: true },
  approved:      { label: 'Approved',       color: t.accent,  bg: `${t.accent}18`,  dot: true },
  rejected:      { label: 'Rejected',       color: t.error,   bg: `${t.error}18` },
  needs_info:    { label: 'Needs Info',     color: t.warning, bg: `${t.warning}18` },
  // mission
  active:        { label: 'Active',         color: t.accent,  bg: `${t.accent}18`,  dot: true, pulse: true },
  pending:       { label: 'Pending',        color: t.warning, bg: `${t.warning}18`, dot: true },
  completed:     { label: 'Completed',      color: t.accent,  bg: `${t.accent}14` },
  saved:         { label: 'Saved',          color: t.txtDim,  bg: 'rgba(255,255,255,0.06)' },
};

interface StatusPillProps {
  status: AnyStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export default function StatusPill({ status, size = 'sm', className }: StatusPillProps) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: t.txtFaint, bg: 'rgba(255,255,255,0.06)' };
  const px = size === 'md' ? 10 : 7;
  const py = size === 'md' ? 5 : 3;
  const fs = size === 'md' ? 12 : 10;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: `${py}px ${px}px`,
        borderRadius: 100,
        background: cfg.bg,
        color: cfg.color,
        fontSize: fs,
        fontWeight: 600,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.dot && (
        <span
          className={cfg.pulse ? 'breathe' : undefined}
          style={{
            width: size === 'md' ? 6 : 5,
            height: size === 'md' ? 6 : 5,
            borderRadius: '50%',
            background: cfg.color,
            flexShrink: 0,
          }}
        />
      )}
      {cfg.label}
    </span>
  );
}
