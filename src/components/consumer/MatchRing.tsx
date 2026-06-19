import { t } from '@/theme/colors';

interface MatchRingProps {
  score: number; // 0–100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export default function MatchRing({ score, size = 48, strokeWidth = 4, showLabel = true }: MatchRingProps) {
  const pct = Math.max(0, Math.min(100, score));
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const color =
    pct >= 80 ? t.accent :
    pct >= 60 ? t.warning :
    t.txtFaint;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          style={{ transition: 'stroke-dasharray 0.6s ease', filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      </svg>
      {showLabel && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <span style={{ fontSize: size < 44 ? 10 : 12, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(pct)}</span>
          {size >= 44 && <span style={{ fontSize: 8, color: t.txtFaint, fontWeight: 600, letterSpacing: '0.03em' }}>%</span>}
        </div>
      )}
    </div>
  );
}
