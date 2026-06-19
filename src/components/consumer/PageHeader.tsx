import { t } from '@/theme/colors';

interface PageHeaderProps {
  greeting?: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  initials?: string;
  action?: React.ReactNode;
  sticky?: boolean;
  borderBottom?: boolean;
}

export default function PageHeader({
  greeting,
  title,
  subtitle,
  avatarUrl,
  initials,
  action,
  sticky = false,
  borderBottom = false,
}: PageHeaderProps) {
  const showAvatar = !!(avatarUrl || initials);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '16px 20px',
      ...(sticky ? { position: 'sticky', top: 0, zIndex: 30, background: `${t.bg}E6`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } : {}),
      ...(borderBottom ? { borderBottom: `1px solid ${t.border}` } : {}),
    }}>
      {showAvatar && (
        <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: `${t.accent}26`, border: `1px solid ${t.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 14, fontWeight: 700, color: t.accent }}>{(initials ?? 'U').slice(0, 2).toUpperCase()}</span>}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {greeting && (
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: t.txtFaint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {greeting}
          </p>
        )}
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.txt, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '2px 0 0', fontSize: 12, color: t.txtFaint }}>{subtitle}</p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
