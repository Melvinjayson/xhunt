'use client';

import { usePathname } from 'next/navigation';
import ConversationList from '@/components/chat/ConversationList';
import BottomNav from '@/components/BottomNav';
import { t } from '@/theme/colors';

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRoot = pathname === '/messages';

  return (
    <div className="consumer-app" style={{
      height: '100dvh',
      display: 'flex',
      overflow: 'hidden',
      background: t.bg,
    }}>
      <BottomNav />

      {/* Conversation sidebar — mobile: only at /messages root; desktop: always */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
          height: '100%',
          overflow: 'hidden',
          flexDirection: 'column',
        }}
        className={`${isRoot ? 'flex' : 'hidden'} md:flex`}
      >
        <ConversationList />
      </div>

      {/* Main content area — mobile: only at /messages/[id]; desktop: always */}
      <div
        style={{
          flex: 1,
          height: '100%',
          overflow: 'hidden',
          flexDirection: 'column',
        }}
        className={`${!isRoot ? 'flex' : 'hidden'} md:flex`}
      >
        {children}
      </div>
    </div>
  );
}
