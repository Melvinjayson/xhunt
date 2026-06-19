import Link from 'next/link';
import { t } from '@/theme/colors';

export interface QuickAction {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  color?: string;
  badge?: string | number;
  description?: string;
}

interface QuickActionGridProps {
  actions: QuickAction[];
  columns?: 2 | 3 | 4;
}

function ActionItem({ icon: Icon, label, href, onClick, color = t.accent, badge, description }: QuickAction) {
  const inner = (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '16px 8px',
        borderRadius: 16,
        background: t.card,
        border: `1px solid ${t.border}`,
        cursor: 'pointer',
        transition: 'transform 0.18s ease',
        position: 'relative',
        textAlign: 'center',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
    >
      {badge != null && (
        <div style={{ position: 'absolute', top: 8, right: 8, minWidth: 18, height: 18, borderRadius: 9, background: t.error, color: t.txt, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
          {badge}
        </div>
      )}
      <div style={{ width: 44, height: 44, borderRadius: 14, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} strokeWidth={1.8} style={{ color }} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: t.txt }}>{label}</p>
        {description && <p style={{ margin: '2px 0 0', fontSize: 10, color: t.txtFaint }}>{description}</p>}
      </div>
    </div>
  );

  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>;
  return inner;
}

export default function QuickActionGrid({ actions, columns = 4 }: QuickActionGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 10 }}>
      {actions.map((a, i) => <ActionItem key={i} {...a} />)}
    </div>
  );
}
