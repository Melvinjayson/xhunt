'use client';

import { usePathname } from 'next/navigation';
import ConversationList from '@/components/chat/ConversationList';
import BottomNav from '@/components/BottomNav';
import { t } from '@/theme/colors';

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRoot = pathname === '/messages';

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      overflow: 'hidden',
      background: t.bg,
    }}>
      <BottomNav />

      {/* Conversation sidebar */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
          height: '100%',
          overflow: 'hidden',
          flexDirection: 'column',
          borderRight: `1px solid ${t.border}`,
        }}
        className={`${isRoot ? 'flex' : 'hidden'} md:flex`}
      >
        <ConversationList />
      </div>

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        className={`${!isRoot ? 'flex' : 'hidden'} md:flex`}
      >
        {children}
      </div>
    </div>
  );
}
