import { t } from '@/theme/colors';

interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  height?: number;
  label?: string;
  showPercent?: boolean;
  style?: React.CSSProperties;
}

export default function ProgressBar({ value, color = t.accent, height = 5, label, showPercent, style }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={style}>
      {(label || showPercent) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          {label && <span style={{ fontSize: 11, color: t.txtFaint, fontWeight: 500 }}>{label}</span>}
          {showPercent && <span style={{ fontSize: 11, color: color, fontWeight: 700 }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{ width: '100%', height, borderRadius: height, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: height,
          background: pct >= 100
            ? `linear-gradient(90deg, ${color}, ${t.accent})`
            : color,
          transition: 'width 0.6s ease',
          boxShadow: pct > 0 ? `0 0 8px ${color}66` : 'none',
        }} />
      </div>
    </div>
  );
}
