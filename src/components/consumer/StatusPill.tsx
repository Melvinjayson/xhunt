import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
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
  const showDot = !!cfg.dot;

  return (
    <Chip
      size="small"
      icon={showDot ? (
        <Box
          className={cfg.pulse ? 'breathe' : undefined}
          sx={{
            width: size === 'md' ? 6 : 5,
            height: size === 'md' ? 6 : 5,
            borderRadius: '50%',
            bgcolor: cfg.color,
            ml: 0.5,
            flexShrink: 0,
          }}
        />
      ) : undefined}
      label={cfg.label}
      className={className}
      sx={{
        height: size === 'sm' ? 20 : 24,
        fontSize: size === 'sm' ? 10 : 12,
        fontWeight: 600,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        color: cfg.color,
        bgcolor: cfg.bg,
        border: 'none',
        borderRadius: '100px',
        '& .MuiChip-label': {
          px: size === 'sm' ? '7px' : '10px',
        },
        '& .MuiChip-icon': {
          color: cfg.color,
          ml: 0.75,
          mr: -0.25,
        },
      }}
    />
  );
}
