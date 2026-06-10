'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Radio, Eye, Flame, Share2, MessageCircle, Repeat2,
  X, Play, Sparkles, Clock, Plus, CheckCircle2,
  Trophy, MoreHorizontal, Bookmark, Zap,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const T = {
  bg: '#050816', panel: '#07101F', card: '#0A1226', elev: '#0D1530',
  line: 'rgba(255,255,255,.07)', line2: 'rgba(255,255,255,.12)',
  txt: '#F0F4FF', muted: '#8B9CC0', dim: '#4A5578',
  green: '#22FFAA', red: '#FF5C7A', amber: '#FFB84D', live: '#ff3b30', ai: '#6D5DFD',
} as const;

/* ─── Types ─── */
interface LiveSession {
  id: string; title: string; status: 'scheduled' | 'live' | 'ended';
  current_step_index: number; total_steps: number; viewer_count: number;
  is_pro_only: boolean; started_at: string | null; scheduled_for: string | null;
  host_display_name: string; host_avatar_url: string | null; mission_title: string | null;
}

interface ExperiencePost {
  id: string; post_type: 'completion' | 'moment' | 'highlight';
  caption: string | null; reaction_count: number; reacted?: boolean;
  metadata: Record<string, unknown>; created_at: string;
  user_display_name: string; user_avatar_url: string | null; mission_title: string | null;
}

/* ─── Helpers ─── */
function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.floor(d)}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}
function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function handle(name: string): string {
  return '@' + name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16);
}

const TYPE_BADGE: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  completion: { label: 'Completed', color: T.green,  icon: <CheckCircle2 size={11} /> },
  highlight:  { label: 'Highlight', color: T.amber,  icon: <Trophy size={11} />       },
  moment:     { label: 'Moment',    color: T.ai,     icon: <Sparkles size={11} />     },
};

/* ─── Avatar ─── */
function Avatar({ name, url, size = 40, ring }: { name: string; url: string | null; size?: number; ring?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: url ? undefined : 'linear-gradient(135deg,rgba(34,255,170,.18),rgba(109,93,253,.18))',
      border: ring ? `2px solid ${ring}` : '1px solid rgba(255,255,255,.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700, color: T.green, overflow: 'hidden',
      boxShadow: ring ? `0 0 12px ${ring}55` : 'none',
    }}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials(name)
      }
    </div>
  );
}

/* ─── Live Story Bubble ─── */
function StoryBubble({ session, onClick }: { session: LiveSession; onClick: () => void }) {
  const live = session.status === 'live';
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', padding: 2,
          background: live ? `conic-gradient(${T.live}, #ff6b5b, ${T.live})` : `conic-gradient(${T.amber}, #ffd180, ${T.amber})`,
          boxShadow: live ? `0 0 18px rgba(255,59,48,.45)` : 'none',
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: `2px solid ${T.bg}`, overflow: 'hidden', background: T.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: T.green }}>
            {session.host_avatar_url
              ? <img src={session.host_avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials(session.host_display_name)
            }
          </div>
        </div>
        {live && (
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', background: T.live, color: '#fff', fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 6, letterSpacing: '.04em', whiteSpace: 'nowrap' }}>LIVE</div>
        )}
      </div>
      <span style={{ fontSize: 10, color: T.muted, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {session.host_display_name.split(' ')[0]}
      </span>
    </button>
  );
}

/* ─── Post Card (Twitter-style) ─── */
function PostCard({ post, onReact, onRepost }: {
  post: ExperiencePost;
  onReact: (id: string) => void;
  onRepost: (post: ExperiencePost) => void;
}) {
  const meta = TYPE_BADGE[post.post_type] ?? TYPE_BADGE.moment;
  const xp = typeof post.metadata?.xp === 'number' ? post.metadata.xp : null;
  const [reposted, setReposted] = useState(false);

  return (
    <div style={{ borderBottom: `1px solid ${T.line}`, padding: '14px 16px 10px', display: 'flex', gap: 12 }}>
      {/* Avatar */}
      <div style={{ flexShrink: 0 }}>
        <Avatar name={post.user_display_name} url={post.user_avatar_url} size={40} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.txt }}>{post.user_display_name}</span>
          <span style={{ fontSize: 13, color: T.dim }}>{handle(post.user_display_name)}</span>
          <span style={{ fontSize: 12, color: T.dim }}>·</span>
          <span style={{ fontSize: 12, color: T.dim }}>{timeAgo(post.created_at)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: meta.color, background: `${meta.color}12`, border: `1px solid ${meta.color}20`, borderRadius: 6, padding: '2px 7px' }}>
            {meta.icon}<span style={{ marginLeft: 3 }}>{meta.label}</span>
          </div>
        </div>

        {/* Post text */}
        {post.caption && (
          <p style={{ fontSize: 14, color: T.txt, lineHeight: 1.55, marginBottom: 10, wordBreak: 'break-word' }}>{post.caption}</p>
        )}

        {/* Mission chip */}
        {post.mission_title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', borderRadius: 12, background: T.card, border: `1px solid ${T.line}` }}>
            <span style={{ fontSize: 13 }}>🎯</span>
            <span style={{ fontSize: 12, color: T.muted, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.mission_title}</span>
            {xp && <span style={{ fontSize: 11, fontWeight: 700, color: T.amber, whiteSpace: 'nowrap', flexShrink: 0 }}>+{xp} XP</span>}
          </div>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 6 }}>
          {/* Flame */}
          <button onClick={() => onReact(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: post.reacted ? T.amber : T.dim, fontSize: 13, padding: '6px 10px 6px 0', borderRadius: 8, transition: 'color .15s' }}>
            <Flame size={16} style={{ fill: post.reacted ? T.amber : 'none', transition: 'fill .15s' }} />
            <span>{post.reaction_count}</span>
          </button>

          {/* Reply */}
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: T.dim, fontSize: 13, padding: '6px 10px', borderRadius: 8 }}>
            <MessageCircle size={15} />
          </button>

          {/* Repost */}
          <button onClick={() => { setReposted(r => !r); onRepost(post); }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: reposted ? T.green : T.dim, fontSize: 13, padding: '6px 10px', borderRadius: 8, transition: 'color .15s' }}>
            <Repeat2 size={15} />
          </button>

          {/* Share */}
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: T.dim, fontSize: 13, padding: '6px 10px', borderRadius: 8 }}>
            <Share2 size={15} />
          </button>

          {/* Bookmark */}
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: T.dim, fontSize: 13, padding: '6px 8px', borderRadius: 8, marginLeft: 'auto' }}>
            <Bookmark size={15} />
          </button>

          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.dim, padding: '6px 4px' }}>
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Live Post Card (large) ─── */
function LiveCard({ session, onJoin }: { session: LiveSession; onJoin: () => void }) {
  const live = session.status === 'live';
  const progress = session.total_steps > 0 ? ((session.current_step_index + 1) / session.total_steps) * 100 : 0;

  return (
    <div style={{ borderBottom: `1px solid ${T.line}`, padding: '14px 16px', display: 'flex', gap: 12 }}>
      <div style={{ flexShrink: 0 }}>
        <Avatar name={session.host_display_name} url={session.host_avatar_url} size={40} ring={live ? T.live : T.amber} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.txt }}>{session.host_display_name}</span>
          <span style={{ fontSize: 12, color: T.dim }}>·</span>
          {live ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                style={{ width: 7, height: 7, borderRadius: '50%', background: T.live }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: T.live, textTransform: 'uppercase', letterSpacing: '.06em' }}>Live</span>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: T.amber, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> Scheduled</span>
          )}
          {session.is_pro_only && (
            <span style={{ fontSize: 10, fontWeight: 700, color: T.amber, background: 'rgba(255,184,77,.12)', border: '1px solid rgba(255,184,77,.2)', borderRadius: 6, padding: '1px 6px' }}>PRO</span>
          )}
          {live && <span style={{ fontSize: 12, color: T.dim, display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}><Eye size={12} />{session.viewer_count}</span>}
        </div>

        <p style={{ fontSize: 14, color: T.txt, lineHeight: 1.5, marginBottom: 10, fontWeight: 600 }}>{session.title}</p>
        {session.mission_title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '6px 10px', borderRadius: 10, background: T.card, border: `1px solid ${T.line}` }}>
            <span style={{ fontSize: 11 }}>🎯</span>
            <span style={{ fontSize: 12, color: T.muted }}>{session.mission_title}</span>
          </div>
        )}

        {live && session.total_steps > 1 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: T.muted }}>Step {session.current_step_index + 1} of {session.total_steps}</span>
              <span style={{ fontSize: 11, color: T.dim }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 3, background: T.elev }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                style={{ height: '100%', borderRadius: 3, background: T.live }} />
            </div>
          </div>
        )}

        <button onClick={onJoin} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px 16px', borderRadius: 20, border: `1px solid ${live ? T.live + '50' : 'rgba(255,184,77,.3)'}`,
          background: live ? 'rgba(255,59,48,.1)' : 'rgba(255,184,77,.08)',
          color: live ? T.live : T.amber,
          fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {live ? <><Play size={13} fill="currentColor" /> Watch Live</> : <><Clock size={13} /> Notify Me</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Go Live Modal ─── */
function GoLiveModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const router = useRouter();
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [proOnly, setProOnly]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleStart() {
    if (!title.trim()) { setError('Give your session a title.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/live/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), description: desc.trim() || undefined, is_pro_only: proOnly }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? data.error ?? 'Could not start session.'); return; }
      onCreated(data.id);
      router.push(`/live/${data.id}?host=true`);
    } finally { setLoading(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 500, background: T.panel, borderRadius: '24px 24px 0 0', border: `1px solid ${T.line2}`, padding: '24px 20px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 10, height: 10, borderRadius: '50%', background: T.live }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: T.txt, margin: 0 }}>Go Live</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.dim, padding: 4 }}><X size={20} /></button>
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>What are you doing live? *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. FitLife Day 21 — final workout" maxLength={80}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: T.elev, border: `1px solid ${T.line2}`, color: T.txt, fontSize: 15, outline: 'none', marginBottom: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Description (optional)</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description for viewers…" rows={3} maxLength={200}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: T.elev, border: `1px solid ${T.line2}`, color: T.txt, fontSize: 14, outline: 'none', marginBottom: 14, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />

        <div onClick={() => setProOnly(!proOnly)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: T.elev, border: `1px solid ${T.line2}`, cursor: 'pointer', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.txt }}>Pro-only audience</div>
            <div style={{ fontSize: 12, color: T.muted }}>Only Pro subscribers can watch</div>
          </div>
          <div style={{ width: 44, height: 26, borderRadius: 13, background: proOnly ? T.amber : T.elev, border: `1px solid ${proOnly ? T.amber : T.line2}`, display: 'flex', alignItems: 'center', padding: 3, transition: 'background .2s' }}>
            <motion.div animate={{ x: proOnly ? 18 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
          </div>
        </div>

        {error && <p style={{ fontSize: 13, color: T.red, marginBottom: 12 }}>{error}</p>}

        <button onClick={handleStart} disabled={loading || !title.trim()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: (title.trim() && !loading) ? T.live : T.elev, color: (title.trim() && !loading) ? '#fff' : T.dim, fontWeight: 700, fontSize: 15, cursor: (title.trim() && !loading) ? 'pointer' : 'not-allowed', transition: 'background .2s', fontFamily: 'inherit' }}>
          <Radio size={16} />{loading ? 'Starting…' : 'Start Live Session'}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Compose Sheet ─── */
function ComposeSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [caption, setCaption]   = useState('');
  const [postType, setPostType] = useState<'moment' | 'highlight' | 'completion'>('moment');
  const [loading, setLoading]   = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setTimeout(() => textRef.current?.focus(), 100); }, []);

  async function handleShare() {
    if (!caption.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/timeline/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_type: postType, caption: caption.trim() }) });
      onCreated(); onClose();
    } finally { setLoading(false); }
  }

  const TYPES: { key: typeof postType; label: string; emoji: string }[] = [
    { key: 'moment',     label: 'Moment',    emoji: '✨' },
    { key: 'highlight',  label: 'Highlight', emoji: '🏆' },
    { key: 'completion', label: 'Completed', emoji: '✅' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 500, background: T.panel, borderRadius: '24px 24px 0 0', border: `1px solid ${T.line2}`, padding: '20px 16px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.dim }}><X size={20} /></button>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: T.txt, margin: 0, flex: 1 }}>Share to Timeline</h2>
          <button onClick={handleShare} disabled={loading || !caption.trim()}
            style={{ padding: '8px 18px', borderRadius: 20, border: 'none', background: (caption.trim() && !loading) ? T.green : T.elev, color: (caption.trim() && !loading) ? '#050816' : T.dim, fontWeight: 700, fontSize: 13, cursor: (caption.trim() && !loading) ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'background .2s' }}>
            {loading ? '…' : 'Post'}
          </button>
        </div>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {TYPES.map(t => (
            <button key={t.key} onClick={() => setPostType(t.key)}
              style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${postType === t.key ? T.green + '50' : T.line}`, background: postType === t.key ? 'rgba(34,255,170,.08)' : 'transparent', color: postType === t.key ? T.green : T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>

        <textarea ref={textRef} value={caption} onChange={e => setCaption(e.target.value)}
          placeholder="What's happening on your mission? Share it with the community…"
          rows={5} maxLength={280}
          style={{ width: '100%', padding: '12px 0', background: 'none', border: 'none', color: T.txt, fontSize: 16, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.55 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 12, color: caption.length > 240 ? T.red : T.dim }}>{caption.length}/280</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Tab bar ─── */
const TABS = ['For You', 'Live', 'Missions'] as const;
type Tab = typeof TABS[number];

/* ─── Page ─── */
export default function TimelinePage() {
  const [tab, setTab]               = useState<Tab>('For You');
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [posts, setPosts]           = useState<ExperiencePost[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showGoLive, setGoLive]     = useState(false);
  const [showCompose, setCompose]   = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/timeline');
      if (res.ok) {
        const d = await res.json();
        setLiveSessions(d.liveSessions ?? []);
        setPosts(d.posts ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  async function handleReact(postId: string) {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: p.reaction_count + 1, reacted: true } : p));
    await fetch('/api/timeline/react', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postId }) });
  }

  function handleRepost(post: ExperiencePost) {
    setPosts(prev => [
      { ...post, id: `repost-${post.id}`, caption: `↻ Reposted · ${post.caption ?? ''}`, created_at: new Date().toISOString() },
      ...prev,
    ]);
  }

  const liveFeed  = liveSessions.filter(s => s.status === 'live');
  const filteredPosts = tab === 'Missions'
    ? posts.filter(p => p.post_type === 'completion' || p.post_type === 'highlight')
    : posts;
  const showLiveRow = (tab === 'For You' || tab === 'Live') && liveSessions.length > 0;

  return (
    <main className="consumer-app" style={{ background: T.bg, minHeight: '100dvh', paddingBottom: '5.5rem' }}>

      {/* ─── Sticky header ─── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(5,8,22,.94)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '12px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: T.txt, margin: 0 }}>Timeline</h1>
          <button onClick={() => setGoLive(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, border: `1px solid rgba(255,59,48,.3)`, background: 'rgba(255,59,48,.1)', color: T.live, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 7, height: 7, borderRadius: '50%', background: T.live }} />
            Go Live
          </button>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tab === t ? 700 : 500, color: tab === t ? T.txt : T.dim, borderBottom: `2px solid ${tab === t ? T.green : 'transparent'}`, transition: 'all .15s', fontFamily: 'inherit',
            }}>
              {t}{t === 'Live' && liveFeed.length > 0 && <span style={{ marginLeft: 5, fontSize: 10, background: T.live, color: '#fff', borderRadius: 8, padding: '1px 5px', fontWeight: 700 }}>{liveFeed.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* ─── Live stories row ─── */}
        {showLiveRow && (
          <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${T.line}`, overflowX: 'auto', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
            {liveSessions.map(s => (
              <StoryBubble key={s.id} session={s} onClick={() => { window.location.href = `/live/${s.id}`; }} />
            ))}
          </div>
        )}

        {/* ─── Feed ─── */}
        {loading ? (
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ padding: '14px 16px', borderBottom: `1px solid ${T.line}`, display: 'flex', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.panel, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, width: '40%', background: T.panel, borderRadius: 6, marginBottom: 8 }} />
                <div style={{ height: 14, width: '85%', background: T.panel, borderRadius: 6, marginBottom: 6 }} />
                <div style={{ height: 14, width: '60%', background: T.panel, borderRadius: 6 }} />
              </div>
            </div>
          ))
        ) : (
          <AnimatePresence mode="popLayout">
            {/* Live session cards in feed */}
            {(tab === 'For You' || tab === 'Live') && liveSessions.map(s => (
              <motion.div key={`live-${s.id}`} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <LiveCard session={s} onJoin={() => { window.location.href = `/live/${s.id}`; }} />
              </motion.div>
            ))}

            {/* Posts */}
            {filteredPosts.map(p => (
              <motion.div key={p.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <PostCard post={p} onReact={handleReact} onRepost={handleRepost} />
              </motion.div>
            ))}

            {/* Empty state */}
            {!loading && filteredPosts.length === 0 && liveSessions.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
                  {tab === 'Live' ? '📡' : tab === 'Missions' ? '🎯' : '🌱'}
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: T.txt, marginBottom: 8 }}>
                  {tab === 'Live' ? 'No one live right now' : tab === 'Missions' ? 'No mission posts yet' : 'Nothing posted yet'}
                </p>
                <p style={{ fontSize: 13, color: T.muted, marginBottom: 20, maxWidth: 280, margin: '0 auto 20px' }}>
                  Complete a mission and share it. Be the first post on the feed.
                </p>
                <button onClick={() => setCompose(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', background: T.green, color: '#050816', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
                  <Sparkles size={15} /> Share a moment
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ─── Compose FAB ─── */}
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCompose(true)}
        className="md:hidden"
        style={{ position: 'fixed', bottom: '5.5rem', right: '1.25rem', zIndex: 50, width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${T.green},${T.ai})`, boxShadow: `0 4px 20px rgba(34,255,170,.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Plus size={22} color="#050816" strokeWidth={2.5} />
      </motion.button>

      {/* Desktop compose */}
      <motion.button whileTap={{ scale: 0.93 }} onClick={() => setCompose(true)}
        className="hidden md:flex"
        style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50, padding: '12px 22px', borderRadius: 28, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${T.green},${T.ai})`, boxShadow: `0 4px 24px rgba(34,255,170,.3)`, alignItems: 'center', gap: 8, color: '#050816', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
        <Zap size={16} /> Post to Timeline
      </motion.button>

      <AnimatePresence>
        {showGoLive  && <GoLiveModal   key="go-live"  onClose={() => setGoLive(false)}  onCreated={() => loadFeed()} />}
        {showCompose && <ComposeSheet  key="compose"  onClose={() => setCompose(false)} onCreated={loadFeed} />}
      </AnimatePresence>

      <BottomNav />
    </main>
  );
}
