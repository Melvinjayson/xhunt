import Link from 'next/link';
import { t } from '@/theme/colors';

interface EmptyStateProps {
  icon?: React.ElementType;
  emoji?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  compact?: boolean;
}

export default function EmptyState({ icon: Icon, emoji, title, description, action, compact }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: compact ? '24px 16px' : '48px 24px',
    }}>
      {emoji && (
        <div style={{ fontSize: compact ? 32 : 48, marginBottom: 12, lineHeight: 1 }}>{emoji}</div>
      )}
      {Icon && !emoji && (
        <div style={{
          width: compact ? 52 : 64,
          height: compact ? 52 : 64,
          borderRadius: '50%',
          background: `${t.accent}14`,
          border: `1px solid ${t.accent}26`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <Icon size={compact ? 22 : 28} strokeWidth={1.5} style={{ color: t.accent }} />
        </div>
      )}
      <p style={{ margin: '0 0 6px', fontSize: compact ? 14 : 16, fontWeight: 700, color: t.txt }}>{title}</p>
      {description && (
        <p style={{ margin: '0 0 20px', fontSize: 13, color: t.txtFaint, lineHeight: 1.5, maxWidth: 280 }}>{description}</p>
      )}
      {action && (
        action.href
          ? <Link href={action.href} style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 20px', borderRadius: 12, background: t.accent, color: t.bg, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              {action.label}
            </Link>
          : <button onClick={action.onClick} style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 20px', borderRadius: 12, background: t.accent, color: t.bg, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              {action.label}
            </button>
      )}
    </div>
  );
}
