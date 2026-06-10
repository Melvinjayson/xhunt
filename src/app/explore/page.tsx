'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Brain, Search, X, Clock, Trophy, Target } from 'lucide-react';
import HuntCard from '@/components/HuntCard';
import BottomNav from '@/components/BottomNav';
import { MOCK_HUNTS } from '@/lib/mockHunts';
import { loadState, saveState } from '@/lib/store';
import { fetchSupabaseMissions } from '@/lib/supabase/events';
import type { Hunt } from '@/lib/types';

const BG = '#050816', SURFACE = '#07101F';
const ACCENT = '#22FFAA', AI = '#6D5DFD', WARN = '#FFB84D', ERR = '#FF5C7A';
const TXT = '#F0F4FF', DIM = '#8B9CC0', FAINT = '#4A5578';
const XGLASS: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)' };

const CATEGORIES = [
  { id: 'all',       label: 'All',       emoji: '✦' },
  { id: 'adventure', label: 'Adventure', emoji: '🌍' },
  { id: 'fitness',   label: 'Fitness',   emoji: '💪' },
  { id: 'food',      label: 'Food',      emoji: '🍴' },
  { id: 'learning',  label: 'Learning',  emoji: '📚' },
  { id: 'social',    label: 'Social',    emoji: '🤝' },
  { id: 'art',       label: 'Art',       emoji: '🎨' },
  { id: 'tech',      label: 'Tech',      emoji: '💻' },
  { id: 'mindful',   label: 'Mindful',   emoji: '🧘' },
];
const SORT_OPTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'easy',        label: 'Easy first'  },
  { id: 'hard',        label: 'Hard first'  },
  { id: 'quick',       label: 'Quickest'    },
];
const DIFF_CLR: Record<string, string> = { easy: ACCENT, medium: WARN, hard: ERR };

interface Recommendation {
  id: string; title: string; tags: string[]; estimated_time: string;
  difficulty: string; confidence_pct: number; reason: string; reward?: string;
}

function RecCard({ rec }: { rec: Recommendation }) {
  return (
    <Link href={`/hunt/${rec.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <motion.div whileTap={{ scale: 0.985 }} style={{ ...XGLASS, borderRadius: 20, padding: '14px 16px', boxShadow: `0 0 32px rgba(109,93,253,0.1)`, borderColor: 'rgba(109,93,253,0.2)' }}>
        {/* AI badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px 3px 6px', borderRadius: 999, background: 'rgba(109,93,253,.1)', border: '1px solid rgba(109,93,253,.22)', marginBottom: 10 }}>
          <Brain size={11} strokeWidth={2} style={{ color: AI }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: AI }}>{rec.confidence_pct}% match</span>
          <span style={{ fontSize: 10, color: FAINT, marginLeft: 2 }}>· {rec.reason}</span>
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: 14.5, fontWeight: 700, color: TXT, lineHeight: 1.3 }}>{rec.title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} strokeWidth={2} style={{ color: FAINT }} />
            <span style={{ fontSize: 11, color: DIM }}>{rec.estimated_time}</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: DIFF_CLR[rec.difficulty] ?? DIM }}>{rec.difficulty}</span>
          {rec.reward && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <Trophy size={11} strokeWidth={2} style={{ color: ACCENT }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: ACCENT }}>{rec.reward.split('+')[0].trim()}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {rec.tags.slice(0, 3).map((t) => (
            <span key={t} style={{ fontSize: 10, color: FAINT, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', padding: '2px 8px', borderRadius: 999 }}>{t}</span>
          ))}
        </div>
      </motion.div>
    </Link>
  );
}

export default function ExplorePage() {
  const [category, setCategory] = useState('all');
  const [sort, setSort]         = useState('recommended');
  const [query, setQuery]       = useState('');
  const [hunts, setHunts]       = useState<Hunt[]>([]);
  const [completedIds, setIds]  = useState<string[]>([]);
  const [recs, setRecs]         = useState<Recommendation[]>([]);
  const [recsLoading, setRL]    = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const state = loadState();
    setIds(state.completedHunts.map((h) => h.huntId));
    setHunts(state.hunts.length > 0 ? state.hunts : MOCK_HUNTS);
    void fetchSupabaseMissions().then((r) => { if (r?.length) { setHunts(r); const s = loadState(); saveState({ ...s, hunts: r }); } });
    void fetch('/api/recommendations?limit=5').then((r) => r.ok ? r.json() : null).then((d) => { if (d?.recommendations?.length) setRecs(d.recommendations); }).catch(() => {}).finally(() => setRL(false));
  }, []);

  const filtered = hunts
    .filter((h) => {
      if (query) { const q = query.toLowerCase(); return h.title.toLowerCase().includes(q) || h.tags.some((t) => t.toLowerCase().includes(q)) || (h.story_context ?? '').toLowerCase().includes(q); }
      if (category === 'all') return true;
      return h.tags.some((t) => t.toLowerCase().includes(category));
    })
    .sort((a, b) => {
      const dr = { easy: 0, medium: 1, hard: 2 };
      if (sort === 'easy')  return (dr[a.difficulty as keyof typeof dr] ?? 1) - (dr[b.difficulty as keyof typeof dr] ?? 1);
      if (sort === 'hard')  return (dr[b.difficulty as keyof typeof dr] ?? 1) - (dr[a.difficulty as keyof typeof dr] ?? 1);
      if (sort === 'quick') return (parseInt(a.estimated_time) || 60) - (parseInt(b.estimated_time) || 60);
      return 0;
    });

  const showRecs = !query && category === 'all' && sort === 'recommended';

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100, background: BG }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>

        {/* ── Sticky header ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(5,8,22,.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '52px 20px 0' }}>
          <h1 style={{ margin: '0 0 14px', fontSize: 26, fontWeight: 800, color: TXT, letterSpacing: '-.03em' }}>Explore</h1>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...XGLASS, borderRadius: 14, padding: '0 14px', marginBottom: 14 }}>
            <Search size={15} strokeWidth={2} style={{ color: FAINT, flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search missions, tags, skills…"
              style={{ flex: 1, height: 44, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: TXT, fontFamily: 'inherit' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: FAINT }}>
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button key={cat.id} onClick={() => setCategory(cat.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: active ? 700 : 500, background: active ? ACCENT : 'rgba(255,255,255,.06)', color: active ? '#050816' : DIM, boxShadow: active ? `0 0 18px rgba(34,255,170,.3)` : 'none', transition: 'all .15s' }}>
                  {cat.emoji} {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '18px 20px 0' }}>

          {/* Sort bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: FAINT, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.08em' }}>Sort</span>
            {SORT_OPTS.map((opt) => {
              const active = sort === opt.id;
              return (
                <button key={opt.id} onClick={() => setSort(opt.id)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 999, border: `1px solid ${active ? ACCENT : 'rgba(255,255,255,.07)'}`, background: active ? `rgba(34,255,170,.1)` : 'transparent', color: active ? ACCENT : DIM, fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* AI Recommendations */}
          <AnimatePresence>
            {showRecs && !recsLoading && recs.length > 0 && (
              <motion.section key="recs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(109,93,253,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Brain size={13} strokeWidth={2} style={{ color: AI }} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: TXT }}>AI Picks for You</span>
                  </div>
                  <span style={{ fontSize: 11, color: FAINT }}>KG · MEI ranked</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recs.map((rec, i) => (
                    <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                      <RecCard rec={rec} />
                    </motion.div>
                  ))}
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,.05)', margin: '22px 0 0' }} />
                <p style={{ margin: '10px 0 0', fontSize: 11, color: FAINT, textAlign: 'center' }}>All missions · {filtered.length} available</p>
              </motion.section>
            )}

            {showRecs && recsLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Brain size={14} strokeWidth={2} style={{ color: AI }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: FAINT }}>Loading AI picks…</span>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 96, borderRadius: 20, background: SURFACE, marginBottom: 10, border: `1px solid rgba(109,93,253,.08)`, opacity: 0.5 }} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mission list */}
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: `rgba(34,255,170,.08)`, border: `1px solid rgba(34,255,170,.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Target size={22} strokeWidth={1.6} style={{ color: ACCENT }} />
              </div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TXT }}>No missions found</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: DIM }}>{query ? `No results for "${query}"` : `No ${category} missions yet.`}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!showRecs && <p style={{ margin: '0 0 4px', fontSize: 11, color: FAINT }}>{filtered.length} mission{filtered.length !== 1 ? 's' : ''}{query ? ` matching "${query}"` : ''}</p>}
              {filtered.map((hunt, i) => (
                <motion.div key={hunt.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.28 }}>
                  <Link href={`/hunt/${hunt.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                    <HuntCard hunt={hunt} isCompleted={completedIds.includes(hunt.id)} />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
