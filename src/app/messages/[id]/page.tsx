'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Send, Users, Target, Building2,
  MessageSquare, MoreVertical, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { useMessages } from '@/hooks/useMessages';
import type { ConversationWithDetails } from '@/lib/supabase/types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import { t } from '@/theme/colors';

/* ─── helpers ─── */
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function convDisplayName(conv: ConversationWithDetails, userId: string): string {
  if (conv.name) return conv.name;
  if (conv.type === 'direct') {
    const other = conv.members.find((m) => m.user_id !== userId);
    return other?.profile?.display_name ?? 'Direct Message';
  }
  return 'Mission Chat';
}

const TYPE_ICON: Record<string, React.ElementType> = {
  direct:       MessageSquare,
  mission:      Target,
  team:         Users,
  organization: Building2,
  community:    Users,
};

const TYPE_COLOR: Record<string, string> = {
  direct:       t.accent,
  mission:      t.warning,
  team:         t.ai,
  organization: t.info,
  community:    '#FF9DB2',
};

/* ─── MessageBubble ─── */
function MessageBubble({
  content, senderName, senderAvatar, isOwn, timestamp, showSender,
}: {
  content: string | null;
  senderName: string | null;
  senderAvatar: string | null;
  senderId: string;
  isOwn: boolean;
  timestamp: string;
  showSender: boolean;
}) {
  if (!content) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 1,
        mb: showSender ? 1.5 : 0.375,
      }}
    >
      {/* Avatar (only for others, only when sender changes) */}
      {!isOwn && (
        <Avatar
          src={senderAvatar ?? undefined}
          sx={{
            width: 28, height: 28,
            bgcolor: senderAvatar ? 'transparent' : `${t.ai}33`,
            border: `1px solid ${t.ai}4D`,
            fontSize: 10, fontWeight: 700, color: t.ai,
            flexShrink: 0,
            visibility: showSender ? 'visible' : 'hidden',
          }}
        >
          {(senderName ?? '?').charAt(0).toUpperCase()}
        </Avatar>
      )}

      <Box sx={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {/* Sender name */}
        {!isOwn && showSender && senderName && (
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.375, pl: 1.5, fontWeight: 600, fontSize: 11 }}>
            {senderName}
          </Typography>
        )}

        {/* Bubble */}
        <Box sx={{
          px: 1.625, py: 1.125,
          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isOwn
            ? 'linear-gradient(135deg, rgba(34,255,170,0.25) 0%, rgba(34,255,170,0.15) 100%)'
            : 'rgba(255,255,255,0.06)',
          border: isOwn
            ? '1px solid rgba(34,255,170,0.25)'
            : `1px solid ${t.border}`,
          boxShadow: isOwn
            ? '0 2px 12px rgba(34,255,170,0.08)'
            : '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word',
              color: isOwn ? '#D0FFE8' : t.txt,
            }}
          >
            {content}
          </Typography>
        </Box>

        {/* Timestamp */}
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled', fontSize: 10, mt: 0.375,
            pl: isOwn ? 0 : 1.5,
            textAlign: isOwn ? 'right' : 'left',
          }}
        >
          {formatTime(timestamp)}
        </Typography>
      </Box>
    </Box>
  );
}

/* ─── DateDivider ─── */
function DateDivider({ date }: { date: string }) {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const label = isToday ? 'Today' : d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <Stack direction="row" spacing={1.5} sx={{ my: 2, alignItems: 'center' }}>
      <Divider sx={{ flex: 1, opacity: 0.4 }} />
      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500, whiteSpace: 'nowrap', fontSize: 11 }}>
        {label}
      </Typography>
      <Divider sx={{ flex: 1, opacity: 0.4 }} />
    </Stack>
  );
}

/* ─── ChatPage ─── */
export default function ChatPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const router = useRouter();

  const { user: authUser, isLoaded } = useAuth();
  const [conv,     setConv]     = useState<ConversationWithDetails | null>(null);
  const [convErr,  setConvErr]  = useState('');
  const [content,  setContent]  = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const userId = authUser?.id ?? null;
  const { messages, loading, sending, sendMessage } = useMessages(conversationId, userId);

  // Auth guard
  useEffect(() => {
    if (!isLoaded) return;
    if (!authUser) { router.replace(`/sign-in?next=/messages/${conversationId}`); }
  }, [isLoaded, authUser, conversationId, router]);

  // Load conversation details
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from('conversations')
      .select(`
        *,
        members:conversation_members!conversation_id(
          user_id, role, last_read_at,
          profile:user_profiles!user_id(display_name, avatar_url)
        )
      `)
      .eq('id', conversationId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setConvErr('Conversation not found.'); return; }
        setConv({ ...(data as ConversationWithDetails), last_message: null, unread_count: 0 });
      });
  }, [conversationId, userId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!content.trim() || sending) return;
    const text = content;
    setContent('');
    await sendMessage(text);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const convName   = conv ? convDisplayName(conv, userId ?? '') : '...';
  const TypeIcon   = conv ? (TYPE_ICON[conv.type] ?? MessageSquare) : MessageSquare;
  const typeColor  = conv ? (TYPE_COLOR[conv.type] ?? t.accent) : t.accent;
  const memberCount = conv?.members.length ?? 0;

  // Group messages by date for dividers
  const grouped: { date: string; messages: typeof messages }[] = [];
  messages.forEach((msg) => {
    const day = new Date(msg.created_at).toDateString();
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== day) {
      grouped.push({ date: day, messages: [msg] });
    } else {
      last.messages.push(msg);
    }
  });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: t.bg, position: 'relative' }}>
      {/* ─── Header ─── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1.5,
        bgcolor: `${t.bg}f5`,
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid', borderColor: 'divider',
        flexShrink: 0, zIndex: 10,
      }}>
        {/* Back (mobile) */}
        <IconButton
          onClick={() => router.push('/messages')}
          className="md:hidden"
          size="small"
          sx={{ color: 'text.primary' }}
        >
          <ChevronLeft size={22} />
        </IconButton>

        {/* Avatar / icon */}
        <Avatar
          src={
            conv?.type === 'direct'
              ? (conv.members.find((m) => m.user_id !== userId)?.profile?.avatar_url ?? undefined)
              : undefined
          }
          sx={{
            width: 38, height: 38, flexShrink: 0,
            bgcolor: `${typeColor}15`,
            border: `1px solid ${typeColor}30`,
            color: typeColor,
          }}
        >
          {!(conv?.type === 'direct' && conv.members.find((m) => m.user_id !== userId)?.profile?.avatar_url) && (
            <TypeIcon size={17} />
          )}
        </Avatar>

        {/* Name + meta */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: 700, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {convName}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            {conv?.type !== 'direct' && (
              <>
                <Users size={10} color={t.txtFaint} />
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 11.5 }}>
                  {memberCount} member{memberCount !== 1 ? 's' : ''}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>·</Typography>
              </>
            )}
            <Typography variant="caption" sx={{ textTransform: 'capitalize', color: `${typeColor}99`, fontSize: 11.5 }}>
              {conv?.type}
            </Typography>
            {conv?.mission_id && (
              <>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>·</Typography>
                <Link href={`/missions/${conv.mission_id}`} style={{ color: t.warning, textDecoration: 'none', fontSize: 11 }}>
                  View Mission
                </Link>
              </>
            )}
          </Stack>
        </Box>

        {/* Actions */}
        <IconButton size="small" sx={{ color: 'text.disabled' }}>
          <MoreVertical size={18} />
        </IconButton>
      </Box>

      {/* ─── Messages ─── */}
      <Box sx={{
        flex: 1, overflowY: 'auto', px: 2, py: 1.5,
        display: 'flex', flexDirection: 'column',
        scrollbarWidth: 'none',
      }}>
        {/* Error state */}
        {convErr && (
          <Box sx={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 2, py: 8, px: 3, textAlign: 'center',
          }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: `${t.txtFaint}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={24} color={t.txtFaint} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                Conversation unavailable
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.disabled', maxWidth: 240 }}>
                This conversation couldn&apos;t be loaded. It may have been removed or you may not have access.
              </Typography>
            </Box>
            <Box
              component="button"
              onClick={() => router.push('/messages')}
              sx={{
                mt: 1, px: 3, py: 1, borderRadius: '20px',
                border: `1px solid ${t.border}`, bgcolor: t.card,
                color: 'text.primary', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to messages
            </Box>
          </Box>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Loader2 size={20} color={t.txtFaint} style={{ animation: 'spin 0.8s linear infinite' }} />
          </Box>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && !convErr && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: `${typeColor}10`, border: `1px solid ${typeColor}20`, color: typeColor }}>
              <TypeIcon size={24} />
            </Avatar>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>{convName}</Typography>
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                {conv?.type === 'direct'
                  ? 'Send a message to start the conversation.'
                  : 'Be the first to say something in this mission chat.'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Messages grouped by date */}
        {grouped.map(({ date, messages: dayMsgs }) => (
          <Box key={date}>
            <DateDivider date={dayMsgs[0].created_at} />
            {dayMsgs.map((msg, i) => {
              const prev = i > 0 ? dayMsgs[i - 1] : null;
              const showSender = !prev || prev.sender_id !== msg.sender_id;
              return (
                <MessageBubble
                  key={msg.id}
                  content={msg.content}
                  senderName={msg.sender?.display_name ?? null}
                  senderAvatar={msg.sender?.avatar_url ?? null}
                  senderId={msg.sender_id}
                  isOwn={msg.sender_id === userId}
                  timestamp={msg.created_at}
                  showSender={showSender}
                />
              );
            })}
          </Box>
        ))}

        <div ref={bottomRef} />
      </Box>

      {/* ─── Composer ─── */}
      <Box
        component="form"
        onSubmit={handleSend}
        sx={{
          px: 1.5, py: 1.25,
          bgcolor: `${t.bg}f5`,
          borderTop: '1px solid', borderColor: 'divider',
          flexShrink: 0,
          pb: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type a message..."
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.04)',
                borderRadius: '18px',
                fontSize: 14,
                py: 1,
                border: `1px solid ${t.border}`,
              },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
            }}
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={!content.trim() || sending}
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: content.trim() ? t.accent : 'rgba(255,255,255,0.06)',
              border: 'none', cursor: content.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s', marginBottom: 4,
            }}
          >
            {sending
              ? <Loader2 size={16} style={{ color: t.bg, animation: 'spin 0.8s linear infinite' }} />
              : <Send size={15} style={{ color: content.trim() ? t.bg : t.txtFaint }} />
            }
          </motion.button>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, ml: 1.75, display: 'block', fontSize: 11 }}>
          Enter to send · Shift+Enter for new line
        </Typography>
      </Box>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Box>
  );
}
