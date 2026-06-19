import Link from 'next/link';
import { t } from '@/theme/colors';

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  delta?: string;
  deltaPositive?: boolean;
  accent?: string;
  href?: string;
  onClick?: () => void;
}

export default function StatTile({
  label,
  value,
  icon: Icon,
  delta,
  deltaPositive,
  accent = t.accent,
  href,
  onClick,
}: StatTileProps) {
  const content = (
    <div
      onClick={onClick}
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: '16px 18px',
        cursor: href || onClick ? 'pointer' : 'default',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: t.txtFaint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </span>
        {Icon && (
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={14} strokeWidth={2} style={{ color: accent }} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: t.txt, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      {delta && (
        <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: deltaPositive ? t.accent : t.error }}>
          {deltaPositive ? '↑' : '↓'} {delta}
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href} style={{ textDecoration: 'none', display: 'flex', flex: 1, minWidth: 0 }}>{content}</Link>;
  return content;
}
