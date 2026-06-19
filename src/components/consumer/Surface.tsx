'use client';

import { t } from '@/theme/colors';

const VARIANTS = {
  card: {
    background: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  panel: {
    background: t.panel,
    border: `1px solid rgba(255,255,255,0.06)`,
    borderRadius: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
  },
  inset: {
    background: t.surface,
    border: `1px solid rgba(255,255,255,0.05)`,
    borderRadius: 14,
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
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        ...base,
        padding,
        cursor: onClick ? 'pointer' : undefined,
        transition: hover ? 'transform 0.18s ease, box-shadow 0.18s ease' : undefined,
        ...style,
      }}
      onMouseEnter={hover ? (e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
      } : undefined}
      onMouseLeave={hover ? (e) => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = base.boxShadow;
      } : undefined}
    >
      {children}
    </div>
  );
}
