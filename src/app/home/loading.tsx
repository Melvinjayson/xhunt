export default function HomeLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--t-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
        <div style={{ height: 28, width: 96, borderRadius: 8, background: 'var(--t-card)' }} className="animate-pulse" />
        <div style={{ flex: 1 }} />
        <div style={{ height: 32, width: 32, borderRadius: '50%', background: 'var(--t-card)' }} className="animate-pulse" />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 128, borderRadius: 16, background: 'var(--t-card)' }} className="animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 112, borderRadius: 16, background: 'var(--t-card)' }} className="animate-pulse" />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 56, borderRadius: 10, background: 'var(--t-card)', opacity: 1 - i * 0.2 }} className="animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
