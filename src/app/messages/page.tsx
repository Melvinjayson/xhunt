import { MessageSquare, Zap } from 'lucide-react';
import { t } from '@/theme/colors';

export default function MessagesIndexPage() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      background: t.bg,
      padding: 32,
    }}>
      {/* Only visible on desktop when no conversation is selected */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(34,255,170,0.08)',
        border: '1px solid rgba(34,255,170,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MessageSquare size={30} style={{ color: t.accent }} />
      </div>
      <div style={{ textAlign: 'center', maxWidth: 280 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: t.txt, margin: '0 0 8px' }}>
          XChat
        </h2>
        <p style={{ fontSize: 14, color: t.txtDim, margin: '0 0 4px', lineHeight: 1.6 }}>
          Select a conversation from the left, or join a mission to start collaborating.
        </p>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px',
        background: 'rgba(34,255,170,0.06)',
        border: '1px solid rgba(34,255,170,0.12)',
        borderRadius: 20,
      }}>
        <Zap size={13} style={{ color: t.accent }} />
        <span style={{ fontSize: 12, color: t.accent, fontWeight: 600 }}>
          Mission chats are created automatically when you join
        </span>
      </div>
    </div>
  );
}
