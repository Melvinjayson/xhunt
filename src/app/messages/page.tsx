'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, MessageSquare } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Fab from '@mui/material/Fab';
import { t } from '@/theme/colors';

interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'mission' | 'team' | 'community';
  lastMessage: string;
  unreadCount: number;
  timestamp: string;
  avatarUrl?: string;
  avatarInitials: string;
  avatarColor?: string;
  isOnline?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  mission: 'Mission', team: 'Team', community: 'Community', direct: '',
};

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/messages/conversations')
      .then(r => r.ok ? r.json() : null)
      .then((data: {
        conversations?: Array<{
          id: string; type: string; name: string; avatar_url?: string;
          last_message?: string; unread_count?: number; last_message_at?: string;
        }>;
      } | null) => {
        if (data?.conversations?.length) {
          const TYPE_COLORS: Record<string, string> = {
            mission: '#6D5DFD', team: '#22FFAA', community: '#FFB84D',
          };
          setConversations(data.conversations.map((c) => ({
            id:             c.id,
            name:           c.name,
            type:           c.type as Conversation['type'],
            lastMessage:    c.last_message ?? '',
            unreadCount:    c.unread_count ?? 0,
            timestamp:      c.last_message_at
              ? new Date(c.last_message_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '',
            avatarUrl:      c.avatar_url,
            avatarInitials: c.name.slice(0, 2).toUpperCase(),
            avatarColor:    TYPE_COLORS[c.type] ?? undefined,
          })));
        }
        // If no conversations, show empty state (no mock data in production)
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: t.bg, overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{
          position: 'sticky', top: 0, zIndex: 30,
          bgcolor: `${t.bg}ee`, backdropFilter: 'blur(12px)',
          borderBottom: '1px solid', borderColor: 'divider',
          px: 2.5, pt: 2, pb: 1.5,
        }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: '-0.02em' }}>
                XChat
              </Typography>
              {totalUnread > 0 && (
                <Chip
                  label={totalUnread}
                  size="small"
                  color="primary"
                  sx={{ height: 20, fontSize: 10, fontWeight: 800 }}
                />
              )}
            </Stack>
            <Fab
              size="small"
              color="primary"
              sx={{ boxShadow: 'none', width: 36, height: 36, minHeight: 0 }}
              title="New conversation"
            >
              <Plus size={18} />
            </Fab>
          </Stack>
          <TextField
            fullWidth
            size="small"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={15} color={t.txtFaint} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: t.card, borderRadius: '12px', height: 40 } }}
          />
        </Box>

        {/* Conversation List */}
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[...Array(5)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  py: 1.75, borderBottom: '1px solid', borderColor: 'divider',
                }}
              >
                <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ height: 12, width: '60%', bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 1, mb: 1 }} />
                  <Box sx={{ height: 10, width: '80%', bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            py: 8, px: 3, textAlign: 'center',
          }}>
            <MessageSquare size={44} color={t.txtFaint} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mt: 2, mb: 0.75 }}>
              {search ? 'No matching conversations' : 'No conversations yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260, lineHeight: 1.6 }}>
              {search
                ? 'Try a different search term'
                : 'Join a mission to start collaborating with other participants'}
            </Typography>
            {!search && (
              <Button
                variant="contained"
                size="small"
                sx={{ mt: 2.5, borderRadius: '20px', px: 3 }}
                onClick={() => router.push('/explore')}
              >
                Explore Missions
              </Button>
            )}
          </Box>
        ) : (
          <List disablePadding>
            {filtered.map((conv, idx) => (
              <Box key={conv.id}>
                <ListItemButton
                  onClick={() => router.push(`/messages/${conv.id}`)}
                  sx={{ px: 2.5, py: 1.75, '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                >
                  <ListItemAvatar sx={{ minWidth: 54 }}>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant={conv.isOnline ? 'dot' : 'standard'}
                      invisible={!conv.isOnline}
                      sx={{
                        '& .MuiBadge-badge': {
                          bgcolor: t.accent,
                          border: `2px solid ${t.bg}`,
                          width: 10, height: 10,
                        },
                      }}
                    >
                      <Avatar
                        src={conv.avatarUrl}
                        sx={{
                          width: 44, height: 44,
                          bgcolor: conv.avatarColor ? `${conv.avatarColor}20` : t.card,
                          color: conv.avatarColor ?? 'text.secondary',
                          fontWeight: 800, fontSize: 14,
                          border: `1.5px solid ${conv.avatarColor ? `${conv.avatarColor}40` : t.border}`,
                        }}
                      >
                        {conv.avatarInitials}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: conv.unreadCount > 0 ? 700 : 500, color: 'text.primary' }}
                            noWrap
                          >
                            {conv.name}
                          </Typography>
                          {TYPE_LABELS[conv.type] && (
                            <Chip
                              label={TYPE_LABELS[conv.type]}
                              size="small"
                              sx={{
                                height: 16, fontSize: 9, fontWeight: 700,
                                bgcolor: 'rgba(255,255,255,0.06)', color: 'text.disabled',
                              }}
                            />
                          )}
                        </Stack>
                        <Typography
                          variant="caption"
                          sx={{
                            color: conv.unreadCount > 0 ? 'primary.main' : 'text.disabled',
                            flexShrink: 0, ml: 1, fontSize: 10,
                          }}
                        >
                          {conv.timestamp}
                        </Typography>
                      </Stack>
                    }
                    secondary={
                      <Stack
                        direction="row"
                        sx={{ mt: 0.25, alignItems: 'center', justifyContent: 'space-between' }}
                        component="span"
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          component="span"
                          sx={{ flex: 1, fontWeight: conv.unreadCount > 0 ? 600 : 400 }}
                        >
                          {conv.lastMessage}
                        </Typography>
                        {conv.unreadCount > 0 && (
                          <Badge
                            badgeContent={conv.unreadCount}
                            color="primary"
                            sx={{
                              ml: 1,
                              '& .MuiBadge-badge': { fontSize: 9, fontWeight: 800, minWidth: 18, height: 18 },
                            }}
                          />
                        )}
                      </Stack>
                    }
                  />
                </ListItemButton>
                {idx < filtered.length - 1 && <Divider sx={{ ml: '70px', opacity: 0.5 }} />}
              </Box>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}
