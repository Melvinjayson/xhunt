'use client';

import Box from '@mui/material/Box';
import { t } from '@/theme/colors';

const VARIANTS = {
  card: {
    bgcolor: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  panel: {
    bgcolor: t.panel,
    border: `1px solid rgba(255,255,255,0.06)`,
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
  },
  inset: {
    bgcolor: t.surface,
    border: `1px solid rgba(255,255,255,0.05)`,
    borderRadius: '14px',
    boxShadow: 'none',
  },
} as const;

interface SurfaceProps {
  variant?: keyof typeof VARIANTS;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hover?: boolean;
  padding?: number | string;
}

export default function Surface({
  variant = 'card',
  children,
  className,
  style,
  onClick,
  hover = !!onClick,
  padding = 20,
}: SurfaceProps) {
  const base = VARIANTS[variant];
  const baseShadow = base.boxShadow;

  return (
    <Box
      className={className}
      onClick={onClick}
      style={style}
      sx={{
        ...base,
        p: typeof padding === 'number' ? `${padding}px` : padding,
        cursor: onClick ? 'pointer' : undefined,
        transition: hover ? 'transform 0.18s ease, box-shadow 0.18s ease' : undefined,
        ...(hover ? {
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          },
        } : {}),
      }}
    >
      {children}
    </Box>
  );
}
