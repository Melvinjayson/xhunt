'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, UserCheck, Users, Zap, Trophy, X, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import BottomNav from '@/components/BottomNav';
import { t } from '@/theme/colors';

interface Person {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  xp_balance: number;
  followers_count: number;
  following_count: number;
  missions_completed: number;
  is_following: boolean;
}

const TABS = ['Discover', 'Following', 'Followers'] as const;
type Tab = typeof TABS[number];

function PersonCard({ person, onFollowChange }: {
  person: Person;
  onFollowChange: (id: string, following: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function toggleFollow() {
    setLoading(true);
    try {
      const method = person.is_following ? 'DELETE' : 'POST';
      const res = await fetch('/api/social/follow', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: person.id }),
      });
      if (res.ok) onFollowChange(person.id, !person.is_following);
    } finally {
      setLoading(false);
    }
  }

  const handle = '@' + person.display_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card sx={{ bgcolor: t.card, border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2, mb: 1 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          <Avatar
            src={person.avatar_url ?? undefined}
            sx={{
              width: 44,
              height: 44,
              bgcolor: `${t.ai}20`,
              color: 'secondary.main',
              fontWeight: 800,
              border: '1.5px solid rgba(255,255,255,.1)',
              flexShrink: 0,
            }}
          >
            {!person.avatar_url && person.display_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.25, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{person.display_name}</Typography>
              <Typography variant="caption" color="text.secondary">{handle}</Typography>
            </Stack>

            {person.bio && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
              >
                {person.bio}
              </Typography>
            )}

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Stack direction="row" alignItems="center" spacing={0.375}>
                <Users size={11} style={{ color: t.txtFaint }} />
                <Typography variant="caption" color="text.secondary">
                  <Box component="b" sx={{ color: t.txtDim }}>{person.followers_count}</Box> followers
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.375}>
                <Zap size={11} style={{ color: t.ai }} />
                <Typography variant="caption" color="text.secondary">
                  <Box component="b" sx={{ color: t.txtDim }}>{person.xp_balance.toLocaleString()}</Box> XP
                </Typography>
              </Stack>
              {person.missions_completed > 0 && (
                <Stack direction="row" alignItems="center" spacing={0.375}>
                  <Trophy size={11} style={{ color: t.warning }} />
                  <Typography variant="caption" color="text.secondary">
                    <Box component="b" sx={{ color: t.txtDim }}>{person.missions_completed}</Box>
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>

          <motion.div whileTap={{ scale: 0.93 }}>
            <Button
              size="small"
              variant={person.is_following ? 'outlined' : 'contained'}
              onClick={toggleFollow}
              disabled={loading}
              startIcon={person.is_following ? <UserCheck size={13} /> : <UserPlus size={13} />}
              sx={{
                borderRadius: '20px',
                fontSize: 12,
                px: 1.75,
                py: 0.625,
                flexShrink: 0,
                textTransform: 'none',
                fontWeight: 700,
                opacity: loading ? 0.6 : 1,
                ...(person.is_following
                  ? { border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)', color: t.txtDim }
                  : { border: `1px solid ${t.accent}40`, background: `${t.accent}14`, color: t.accent }
                ),
              }}
            >
              {person.is_following ? 'Following' : 'Follow'}
            </Button>
          </motion.div>
        </Stack>
      </Card>
    </motion.div>
  );
}

export default function PeoplePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Discover');
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchPeople = useCallback(async (tab: Tab, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab: tab.toLowerCase(),
        ...(q ? { q } : {}),
      });
      const res = await fetch(`/api/social/people?${params}`);
      if (res.ok) {
        const d = await res.json() as { people: Person[] };
        setPeople(d.people ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPeople(tab, query); }, [fetchPeople, tab, query]);

  function handleFollowChange(id: string, following: boolean) {
    setPeople(prev => prev.map(p =>
      p.id === id
        ? {
            ...p,
            is_following: following,
            followers_count: p.followers_count + (following ? 1 : -1),
          }
        : p
    ));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(searchInput.trim());
  }

  return (
    <Box component="main" className="consumer-app" sx={{ background: t.bg, minHeight: '100dvh', paddingBottom: '5.5rem' }}>

      {/* Header */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(5,8,22,.94)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid rgba(255,255,255,.07)`,
      }}>
        <Box sx={{ maxWidth: 600, margin: '0 auto', padding: '12px 16px 0' }}>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
            <IconButton
              onClick={() => router.back()}
              sx={{ color: t.txtDim, p: 0.5 }}
            >
              <ArrowLeft size={20} />
            </IconButton>
            <Typography variant="h5" sx={{ fontSize: 20, fontWeight: 800, color: t.txt, flex: 1 }}>People</Typography>
          </Stack>

          {/* Search */}
          <Box component="form" onSubmit={handleSearch} sx={{ mb: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by name…"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={15} style={{ color: t.txtFaint }} />
                  </InputAdornment>
                ),
                endAdornment: searchInput ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => { setSearchInput(''); setQuery(''); }}
                      sx={{ color: t.txtFaint, p: 0 }}
                    >
                      <X size={14} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  background: t.panel,
                  '& fieldset': { borderColor: 'rgba(255,255,255,.12)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,.2)' },
                  '&.Mui-focused fieldset': { borderColor: t.accent },
                },
                '& .MuiInputBase-input': { color: t.txt, fontSize: 14 },
                '& .MuiInputBase-input::placeholder': { color: t.txtFaint, opacity: 1 },
              }}
            />
          </Box>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v: Tab) => setTab(v)}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13.5, color: t.txtDim, minWidth: 0, flex: 1 },
              '& .MuiTab-root.Mui-selected': { color: t.txt, fontWeight: 700 },
              '& .MuiTabs-indicator': { backgroundColor: t.accent },
            }}
          >
            {TABS.map(tabItem => (
              <Tab key={tabItem} label={tabItem} value={tabItem} />
            ))}
          </Tabs>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 600, margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Stack spacing={1.75} sx={{ padding: '40px 16px' }}>
                {[0,1,2,3,4].map(i => (
                  <Stack key={i} direction="row" spacing={1.5} sx={{ padding: '14px 16px' }}>
                    <Box sx={{ width: 46, height: 46, borderRadius: '50%', background: t.panel, flexShrink: 0 }} />
                    <Stack flex={1} spacing={1}>
                      <Box sx={{ height: 14, width: '45%', borderRadius: '6px', background: t.panel }} />
                      <Box sx={{ height: 11, width: '70%', borderRadius: '6px', background: t.surface }} />
                      <Box sx={{ height: 10, width: '55%', borderRadius: '6px', background: t.surface }} />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </motion.div>
          ) : people.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Stack alignItems="center" sx={{ padding: '60px 24px', textAlign: 'center' }}>
                <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: `${t.accent}0D`, border: `1px solid ${t.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <Users size={24} strokeWidth={1.5} style={{ color: t.accent }} />
                </Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: t.txt, mb: 0.75 }}>
                  {query ? 'No results found' : tab === 'Following' ? 'Not following anyone yet' : tab === 'Followers' ? 'No followers yet' : 'No people yet'}
                </Typography>
                <Typography sx={{ fontSize: 13, color: t.txtFaint, mb: 2.5, lineHeight: 1.5 }}>
                  {query ? `Try a different search term.` : tab === 'Discover' ? 'Be the first to join the community.' : 'Start connecting with other hunters.'}
                </Typography>
                {tab !== 'Discover' && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setTab('Discover')}
                    sx={{ borderRadius: '12px', fontWeight: 700, fontSize: 13.5, textTransform: 'none' }}
                  >
                    Discover People
                  </Button>
                )}
              </Stack>
            </motion.div>
          ) : (
            <motion.div key={tab + query} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Box sx={{ padding: '8px 16px' }}>
                {people.map((person, i) => (
                  <motion.div key={person.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <PersonCard person={person} onFollowChange={handleFollowChange} />
                  </motion.div>
                ))}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      <BottomNav />
    </Box>
  );
}
