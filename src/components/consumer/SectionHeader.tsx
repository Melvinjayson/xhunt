import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { t } from '@/theme/colors';

interface SectionHeaderProps {
  title: string;
  count?: number;
  seeAllHref?: string;
  onSeeAll?: () => void;
  subtitle?: string;
  style?: React.CSSProperties;
}

export default function SectionHeader({ title, count, seeAllHref, onSeeAll, subtitle, style }: SectionHeaderProps) {
  const hasSeeAll = seeAllHref || onSeeAll;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, ...style }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.txt, letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          {count != null && (
            <span style={{ fontSize: 11, fontWeight: 600, color: t.txtFaint, background: 'rgba(255,255,255,0.06)', borderRadius: 100, padding: '2px 8px' }}>
              {count}
            </span>
          )}
        </div>
        {subtitle && <p style={{ margin: '3px 0 0', fontSize: 12, color: t.txtFaint }}>{subtitle}</p>}
      </div>
      {hasSeeAll && (
        seeAllHref
          ? <Link href={seeAllHref} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600, color: t.accent, textDecoration: 'none' }}>
              See all <ChevronRight size={13} strokeWidth={2.5} />
            </Link>
          : <button onClick={onSeeAll} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600, color: t.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              See all <ChevronRight size={13} strokeWidth={2.5} />
            </button>
      )}
    </div>
  );
}
