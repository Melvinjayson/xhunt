'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Radio, Eye, Flame, Share2, Trophy, Lock,
  X, Play, Users, Sparkles,
  Clock, Plus, CheckCircle2,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const T = {
  bg:       '#050816',
  panel:    '#07101F',
  elev:     '#0D1530',
  line:     'rgba(255,255,255,.07)',
  line2:    'rgba(255,255,255,.12)',
  txt:      '#F0F4FF',
  muted:    '#8B9CC0',
  dim:      '#4A5578',
  green:    '#22FFAA',
  red:      '#FF5C7A',
  amber:    '#FFB84D',
  live:     '#ff3b30',
  liveGlow: 'rgba(255,59,48,.18)',
  ai:       '#6D5DFD',
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  status: 'scheduled' | 'live' | 'ended';
  current_step_index: number;
  total_steps: number;
  viewer_count: number;
  is_pro_only: boolean;
  started_at: string | null;
  scheduled_for: string | null;
  host_display_name: string;
  host_avatar_url: string | null;
  mission_title: string | null;
}

interface ExperiencePost {
  id: string;
  post_type: 'completion' | 'moment' | 'highlight';
  caption: string | null;
  reaction_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  user_display_name: string;
  user_avatar_url: string | null;
  mission_title: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const POST_TYPE_META = {
  completion: { icon: <CheckCircle2 size={13} />, label: 'Completed', color: T.green },
  moment:     { icon: <Sparkles size={13} />,     label: 'Shared',    color: T.ai   },
  highlight:  { icon: <Trophy size={13} />,        label: 'Highlight', color: T.amber },
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function AvatarCircle({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  return url ? (
    <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,rgba(34,255,170,.14),rgba(109,93,253,.14))',
      border: '1px solid rgba(34,255,170,.22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: T.green,
    }}>
      {initials(name)}
    </div>
  );
}

function LiveCard({ session, tier, onJoin }: { session: LiveSession; tier: string; onJoin: (s: LiveSession) => void }) {
  const isLive   = session.status === 'live';
  const locked   = session.is_pro_only && tier !== 'pro';
  const progress = session.total_steps > 0 ? ((session.current_step_index + 1) / session.total_steps) * 100 : 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.panel,
        border: isLive ? `1px solid rgba(255,59,48,.25)` : `1px solid ${T.line}`,
        borderRadius: 20, overflow: 'hidden',
        boxShadow: isLive ? `0 0 24px ${T.liveGlow}` : 'none',
      }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLive ? (
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: T.live }} />
          ) : (
            <Clock size={12} color={T.amber} />
          )}
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: isLive ? T.live : T.amber, textTransform: 'uppercase' }}>
            {isLive ? 'Live' : 'Scheduled'}
          </span>
          {session.is_pro_only && (
            <span style={{ fontSize: 10, fontWeight: 700, color: T.amber, background: 'rgba(255,184,77,.12)', border: '1px solid rgba(255,184,77,.2)', borderRadius: 6, padding: '2px 6px', letterSpacing: '0.04em' }}>PRO</span>
          )}
        </div>
        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.muted, fontSize: 12 }}>
            <Eye size={13} />
            <span>{session.viewer_count.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.txt, marginBottom: 4, lineHeight: 1.3 }}>{session.title}</div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
          Hosted by <span style={{ color: T.txt }}>{session.host_display_name}</span>
          {session.mission_title && <> · <span style={{ color: T.dim }}>{session.mission_title}</span></>}
        </div>

        {isLive && session.total_steps > 1 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: T.muted }}>Step {session.current_step_index + 1} of {session.total_steps}</span>
              <span style={{ fontSize: 11, color: T.dim }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 3, background: T.elev }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                style={{ height: '100%', borderRadius: 3, background: T.live }} />
            </div>
          </div>
        )}

        {!isLive && session.scheduled_for && (
          <div style={{ fontSize: 12, color: T.amber, marginBottom: 10 }}>
            Starting {new Date(session.scheduled_for).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        )}

        <button onClick={() => onJoin(session)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: isLive ? (locked ? T.elev : T.live) : 'rgba(255,184,77,.12)',
            color:      isLive ? (locked ? T.muted : '#fff') : T.amber,
            fontWeight: 700, fontSize: 14,
          }}>
          {locked ? <><Lock size={14} /> Join Live — Pro Only</> : isLive ? <><Play size={14} fill="currentColor" /> Join Live</> : <><Users size={14} /> Watch When Live</>}
        </button>
      </div>
    </motion.div>
  );
}

function PostCard({ post, onReact }: { post: ExperiencePost; onReact: (id: string) => void }) {
  const meta = POST_TYPE_META[post.post_type] ?? POST_TYPE_META.moment;
  const xp   = typeof post.metadata?.xp === 'number' ? post.metadata.xp : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 20, padding: '14px 16px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <AvatarCircle name={post.user_display_name} url={post.user_avatar_url} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.txt, lineHeight: 1.2 }}>{post.user_display_name}</div>
          <div style={{ fontSize: 11, color: T.dim }}>{timeAgo(post.created_at)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}18`, border: `1px solid ${meta.color}30`, borderRadius: 8, padding: '3px 8px' }}>
          {meta.icon} {meta.label}
        </div>
      </div>

      {post.caption && <p style={{ fontSize: 14, color: T.txt, lineHeight: 1.5, marginBottom: 10 }}>{post.caption}</p>}

      {(post.mission_title || xp) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: T.elev, border: `1px solid ${T.line}` }}>
          {post.mission_title && <span style={{ fontSize: 12, color: T.muted, flex: 1, minWidth: 0 }}>🎯 {post.mission_title}</span>}
          {xp && <span style={{ fontSize: 12, fontWeight: 700, color: T.amber, whiteSpace: 'nowrap' }}>+{xp} XP</span>}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onReact(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 13, fontWeight: 600, padding: 0 }}>
          <Flame size={16} /><span>{post.reaction_count}</span>
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 13, fontWeight: 600, padding: 0 }}>
          <Share2 size={15} /><span>Share</span>
        </button>
      </div>
    </motion.div>
  );
}

function GoLiveModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const router = useRouter();
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [isProOnly, setIsProOnly]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  async function handleStart() {
    if (!title.trim()) { setError('Session title is required.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/live/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, is_pro_only: isProOnly }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? data.error ?? 'Failed to start session.'); return; }
      onCreated(data.id);
      router.push(`/live/${data.id}?host=true`);
    } finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 12, background: T.elev, border: `1px solid ${T.line2}`, color: T.txt, fontSize: 15, outline: 'none', marginBottom: 14, boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: T.panel, borderRadius: '24px 24px 0 0', border: `1px solid ${T.line2}`, padding: '24px 20px 32px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 10, height: 10, borderRadius: '50%', background: T.live }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.txt, margin: 0 }}>Go Live</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.dim, padding: 4 }}><X size={20} /></button>
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6, letterSpacing: '0.04em' }}>SESSION TITLE *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you doing live?" maxLength={80} style={inputStyle} />

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6, letterSpacing: '0.04em' }}>DESCRIPTION (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of what viewers will experience..." rows={3} maxLength={200}
          style={{ ...inputStyle, resize: 'none', fontSize: 14 }} />

        <div onClick={() => setIsProOnly(!isProOnly)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: T.elev, border: `1px solid ${T.line2}`, cursor: 'pointer', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.txt }}>Pro-only session</div>
            <div style={{ fontSize: 12, color: T.muted }}>Only Pro subscribers can join</div>
          </div>
          <div style={{ width: 44, height: 26, borderRadius: 13, background: isProOnly ? T.amber : T.elev, border: `1px solid ${isProOnly ? T.amber : T.line2}`, display: 'flex', alignItems: 'center', padding: 3, transition: 'background .2s' }}>
            <motion.div animate={{ x: isProOnly ? 18 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
          </div>
        </div>

        {error && <p style={{ fontSize: 13, color: T.red, marginBottom: 14 }}>{error}</p>}

        <button onClick={handleStart} disabled={loading || !title.trim()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: (!loading && title.trim()) ? T.live : T.elev, color: (!loading && title.trim()) ? '#fff' : T.dim, fontWeight: 700, fontSize: 15, cursor: loading || !title.trim() ? 'not-allowed' : 'pointer', transition: 'background .2s', fontFamily: 'inherit' }}>
          <Radio size={16} />
          {loading ? 'Starting…' : 'Start Live Session'}
        </button>
      </motion.div>
    </motion.div>
  );
}

function ShareMomentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      await fetch('/api/timeline/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_type: 'moment', caption: caption.trim() || undefined }) });
      onCreated(); onClose();
    } finally { setLoading(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: T.panel, borderRadius: '24px 24px 0 0', border: `1px solid ${T.line2}`, padding: '24px 20px 32px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.txt, margin: 0 }}>Share a Moment</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.dim }}><X size={20} /></button>
        </div>
        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="What's happening on your mission? Share it with the community…" rows={4} maxLength={280}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: T.elev, border: `1px solid ${T.line2}`, color: T.txt, fontSize: 14, outline: 'none', marginBottom: 16, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        <button onClick={handleShare} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: T.green, color: '#050816', fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
          <Sparkles size={16} />
          {loading ? 'Sharing…' : 'Share Moment'}
        </button>
      </motion.div>
    </motion.div>
  );
}

function UpgradeSheet({ reason, onClose }: { reason: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally { setLoading(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 110, display: 'flex', alignItems: 'flex-end' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: T.panel, borderRadius: '24px 24px 0 0', border: `1px solid ${T.line2}`, padding: '28px 20px 36px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚡</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.txt, marginBottom: 8 }}>Pro Feature</h2>
        <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, marginBottom: 24 }}>{reason}</p>
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          <button onClick={handleUpgrade} disabled={loading}
            style={{ padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${T.green},${T.ai})`, color: '#050816', fontWeight: 700, fontSize: 15, fontFamily: 'inherit' }}>
            {loading ? 'Loading…' : 'Upgrade to Pro'}
          </button>
          <Link href="/upgrade"
            style={{ padding: '13px', borderRadius: 14, border: `1px solid ${T.line2}`, color: T.muted, fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center', display: 'block' }}>
            See all plans
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Live', 'Shared', 'Hosted'] as const;
type Filter = typeof FILTERS[number];

export default function TimelinePage() {
  const [filter, setFilter]           = useState<Filter>('All');
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [posts, setPosts]             = useState<ExperiencePost[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tier, setTier]               = useState<string>('free');
  const [showGoLive, setShowGoLive]   = useState(false);
  const [showShareMoment, setShowShareMoment] = useState(false);
  const [upgradeReason, setUpgradeReason]     = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      const [feedRes, subRes] = await Promise.all([fetch('/api/timeline'), fetch('/api/subscription/status')]);
      if (feedRes.ok) { const d = await feedRes.json(); setLiveSessions(d.liveSessions ?? []); setPosts(d.posts ?? []); }
      if (subRes.ok)  { const s = await subRes.json();  setTier(s.tier ?? 'free'); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  function handleGoLive() {
    if (tier !== 'pro') { setUpgradeReason('Go Live lets you host real-time mission experiences for your community. Upgrade to Pro to unlock hosting.'); }
    else { setShowGoLive(true); }
  }

  function handleJoinLive(session: LiveSession) {
    if (session.is_pro_only && tier !== 'pro') { setUpgradeReason('This is a Pro-only live session. Upgrade to Pro to watch and participate in exclusive live experiences.'); }
    else { window.location.href = `/live/${session.id}`; }
  }

  async function handleReact(postId: string) {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: p.reaction_count + 1 } : p));
    await fetch('/api/timeline/react', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postId }) });
  }

  const showSessions = filter === 'All' || filter === 'Live' || filter === 'Hosted';
  const showPosts    = filter === 'All' || filter === 'Shared';
  const filteredSessions = liveSessions.filter(s => { if (filter === 'Live') return s.status === 'live'; return true; });
  const isEmpty = !loading && filteredSessions.length === 0 && (showPosts ? posts.length === 0 : true);

  return (
    <main style={{ background: T.bg, minHeight: '100dvh', paddingBottom: '5.5rem' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(5,8,22,.92)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${T.line}`,
        padding: '14px 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.txt, margin: 0 }}>Timeline</h1>
        <button onClick={handleGoLive}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: T.live, color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
          Go Live
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', background: filter === f ? T.green : T.elev, color: filter === f ? '#050816' : T.muted, fontWeight: filter === f ? 700 : 500, fontSize: 13, whiteSpace: 'nowrap', fontFamily: 'inherit',
              boxShadow: filter === f ? `0 0 18px rgba(34,255,170,.3)` : 'none', transition: 'all .15s' }}>
            {f === 'Live' && '🔴 '}{f}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} style={{ background: T.panel, borderRadius: 20, height: 160, border: `1px solid ${T.line}`, opacity: 0.6 }} />
          ))
        ) : (
          <>
            {showSessions && filteredSessions.map(s => (
              <LiveCard key={s.id} session={s} tier={tier} onJoin={handleJoinLive} />
            ))}
            {showPosts && posts.map(p => (
              <PostCard key={p.id} post={p} onReact={handleReact} />
            ))}
            {isEmpty && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{filter === 'Live' ? '📡' : '🌱'}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.txt, marginBottom: 8 }}>
                  {filter === 'Live' ? 'No live sessions right now' : 'Nothing here yet'}
                </div>
                <p style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
                  {filter === 'Live' ? 'Pro users can go live and host mission experiences in real time.' : 'Complete missions and share your experiences here.'}
                </p>
                <button onClick={() => setShowShareMoment(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: T.green, color: '#050816', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', boxShadow: `0 0 20px rgba(34,255,170,.3)` }}>
                  <Plus size={15} /> Share a Moment
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Share moment FAB */}
      {!isEmpty && (
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowShareMoment(true)}
          style={{ position: 'fixed', bottom: '5.5rem', right: '1.25rem', zIndex: 50, width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${T.green},${T.ai})`, boxShadow: `0 4px 20px rgba(34,255,170,.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={22} color="#050816" strokeWidth={2.5} />
        </motion.button>
      )}

      <AnimatePresence>
        {showGoLive     && <GoLiveModal key="go-live" onClose={() => setShowGoLive(false)} onCreated={() => loadFeed()} />}
        {showShareMoment && <ShareMomentModal key="share-moment" onClose={() => setShowShareMoment(false)} onCreated={loadFeed} />}
        {upgradeReason  && <UpgradeSheet key="upgrade" reason={upgradeReason} onClose={() => setUpgradeReason(null)} />}
      </AnimatePresence>

      <BottomNav />
    </main>
  );
}
