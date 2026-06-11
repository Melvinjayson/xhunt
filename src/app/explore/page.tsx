'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Brain, Search, X, Clock, Trophy, DollarSign, Star,
  Users, Calendar, ShieldCheck, Building2, Zap, Award,
  SlidersHorizontal, Target,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { LIQUID_GLASS_STYLE } from '@/components/LiquidGlass';
import { loadState, saveState, loadProfile } from '@/lib/store';
import { fetchSupabaseMissions } from '@/lib/supabase/events';
import {
  IMPACT_CATEGORIES, MISSION_TYPE_META, DIFF_META, SDG_META,
  estimateCashReward, estimateXP, deadlineLabel, spotsLabel, resolveCategory,
} from '@/lib/missionCategories';
import type { Hunt, ImpactProfile } from '@/lib/types';

/* ─── tokens ─── */
const BG     = '#050816';
const CARD   = '#0A1226';
const ACCENT = '#22FFAA';
const AI_CLR = '#6D5DFD';
const WARN   = '#FFB84D';
const ERR    = '#FF5C7A';
const TXT    = '#F0F4FF';
const DIM    = '#8B9CC0';
const FAINT  = '#4A5578';
const XGLASS: React.CSSProperties = LIQUID_GLASS_STYLE;

const SORT_OPTS = [
  { id: 'recommended', label: 'Best Match'   },
  { id: 'reward',      label: 'Highest Pay'  },
  { id: 'easy',        label: 'Entry Level'  },
  { id: 'hard',        label: 'Expert'       },
  { id: 'quick',       label: 'Quickest'     },
  { id: 'deadline',    label: 'Ending Soon'  },
];

const LOCATION_OPTS = [
  { id: 'all',    label: 'All'    },
  { id: 'remote', label: 'Remote' },
  { id: 'local',  label: 'Local'  },
  { id: 'hybrid', label: 'Hybrid' },
];

type SortId = typeof SORT_OPTS[number]['id'];

interface Recommendation {
  id: string; title: string; tags: string[]; estimated_time: string;
  difficulty: string; confidence_pct: number; reason: string; reward?: string;
}

/* ─── match score ─── */
function computeMatch(hunt: Hunt, profile: ImpactProfile | null): number | null {
  if (!profile) return null;
  const tl = hunt.tags.map((t) => t.toLowerCase());
  const cl = profile.causes.map((c) => c.toLowerCase());
  const sl = profile.strengths.map((s) => s.name.toLowerCase());
  let s = 55;
  for (const t of tl) {
    if (cl.some((c) => c.includes(t) || t.includes(c))) s += 12;
    if (sl.some((k) => k.includes(t) || t.includes(k))) s += 8;
  }
  return Math.min(98, s + Math.round((profile.impactScore / 100) * 8));
}

/* ─── AI recommendation card ─── */
function AIRecCard({ rec, profile }: { rec: Recommendation; profile: ImpactProfile | null }) {
  const confColor = rec.confidence_pct >= 80 ? ACCENT : rec.confidence_pct >= 65 ? WARN : DIM;
  return (
    <Link href={`/hunt/${rec.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <motion.div whileTap={{ scale: 0.985 }}
        className="liquid-glass"
        style={{ ...XGLASS, borderRadius: 20, padding: '14px 16px', borderColor: 'rgba(109,93,253,0.2)', boxShadow: '0 0 32px rgba(109,93,253,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px 3px 6px', borderRadius: 999, background: 'rgba(109,93,253,.1)', border: '1px solid rgba(109,93,253,.22)' }}>
            <Brain size={11} strokeWidth={2} style={{ color: AI_CLR }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: AI_CLR }}>{rec.confidence_pct}% match</span>
          </div>
          <span style={{ fontSize: 10, color: FAINT }}>· {rec.reason}</span>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 14.5, fontWeight: 700, color: TXT, lineHeight: 1.3 }}>{rec.title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} strokeWidth={2} style={{ color: FAINT }} />
            <span style={{ fontSize: 11, color: DIM }}>{rec.estimated_time}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: DIFF_META[rec.difficulty as keyof typeof DIFF_META]?.color ?? DIM }}>{rec.difficulty}</span>
          {rec.reward && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <DollarSign size={11} strokeWidth={2} style={{ color: ACCENT }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>{rec.reward.split('+')[0].trim()}</span>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

/* ─── compact explore card ─── */
function ExploreCard({ hunt, index, completedIds, profile }: {
  hunt: Hunt; index: number; completedIds: string[]; profile: ImpactProfile | null;
}) {
  const done    = completedIds.includes(hunt.id);
  const cash    = estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType);
  const xp      = estimateXP(hunt.xpReward, hunt.difficulty, hunt.steps.length);
  const diff    = DIFF_META[hunt.difficulty] ?? DIFF_META.easy;
  const cat     = resolveCategory(hunt.tags, hunt.category);
  const mtype   = hunt.missionType ? MISSION_TYPE_META[hunt.missionType] : null;
  const dlLabel = deadlineLabel(hunt.deadline);
  const ms      = computeMatch(hunt, profile);
  const msColor = ms == null ? DIM : ms >= 80 ? ACCENT : ms >= 65 ? WARN : DIM;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}>
      <Link href={`/hunt/${hunt.id}`} style={{ display: 'block', textDecoration: 'none' }}>
        <motion.div whileTap={{ scale: 0.985 }}
          className="liquid-glass"
          style={{ ...XGLASS, borderRadius: 20, overflow: 'hidden', opacity: done ? 0.65 : 1, borderColor: `${cat.color}18` }}>

          {/* micro stripe */}
          <div style={{ height: 2, background: `linear-gradient(90deg, ${cat.color}88, transparent)` }} />

          <div style={{ padding: '13px 15px' }}>
            {/* type + category */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 9, flexWrap: 'wrap' }}>
              {mtype && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: mtype.color, background: `${mtype.color}10`, border: `1px solid ${mtype.color}18`, borderRadius: 999, padding: '2px 8px' }}>
                  {mtype.emoji} {mtype.label}
                </span>
              )}
              <span style={{ fontSize: 9.5, fontWeight: 700, color: cat.color, background: `${cat.color}10`, border: `1px solid ${cat.color}18`, borderRadius: 999, padding: '2px 8px' }}>
                {cat.emoji} {cat.label}
              </span>
            </div>

            {/* icon + title + match */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 7 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: `${cat.color}14`, border: `1px solid ${cat.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {cat.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 13.5, fontWeight: 700, color: TXT, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {hunt.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {hunt.tenantLogo
                    ? <img src={hunt.tenantLogo} alt="" style={{ width: 14, height: 14, borderRadius: 4 }} />
                    : <Building2 size={10} strokeWidth={2} style={{ color: FAINT }} />}
                  <span style={{ fontSize: 10.5, color: FAINT }}>{hunt.tenantName ?? 'X-Hunt'}</span>
                  {hunt.isVerified && <ShieldCheck size={9} strokeWidth={2.5} style={{ color: ACCENT }} />}
                </div>
              </div>
              {ms != null && !done && (
                <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: '50%', background: `${msColor}10`, border: `2px solid ${msColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 900, color: msColor }}>{ms}%</span>
                </div>
              )}
            </div>

            {/* tags */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 9, flexWrap: 'wrap' }}>
              {hunt.tags.slice(0, 3).map((t) => (
                <span key={t} style={{ fontSize: 9.5, color: FAINT, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', padding: '1px 8px', borderRadius: 999 }}>{t}</span>
              ))}
              {(hunt.sdgGoals?.length ?? 0) > 0 && hunt.sdgGoals!.slice(0, 2).map((g) => {
                const m = SDG_META[g as keyof typeof SDG_META];
                return m ? (
                  <span key={g} style={{ fontSize: 9.5, fontWeight: 700, color: m.color, background: `${m.color}12`, border: `1px solid ${m.color}20`, padding: '1px 8px', borderRadius: 999 }}>
                    {m.emoji} SDG {g}
                  </span>
                ) : null;
              })}
            </div>

            {/* econometrics footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={11} strokeWidth={2} style={{ color: ACCENT }} />
              <span style={{ fontSize: 13, fontWeight: 900, color: done ? FAINT : ACCENT, letterSpacing: '-.02em' }}>${cash}</span>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: FAINT }} />
              <Star size={10} strokeWidth={2} style={{ color: AI_CLR }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: done ? FAINT : AI_CLR }}>+{xp} XP</span>
              {hunt.certificationReward && (
                <>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: FAINT }} />
                  <Award size={10} strokeWidth={2} style={{ color: WARN }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: WARN }}>Cert</span>
                </>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                {dlLabel && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: dlLabel.color, background: `${dlLabel.color}10`, borderRadius: 999, padding: '2px 7px' }}>{dlLabel.label}</span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: `${diff.color}10` }}>
                  <Zap size={9} strokeWidth={2.5} style={{ color: diff.color }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: diff.color }}>{diff.label}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ─── page ─── */
export default function ExplorePage() {
  const [category, setCategory]     = useState('all');
  const [sort, setSort]             = useState<SortId>('recommended');
  const [locationFilter, setLoc]    = useState('all');
  const [query, setQuery]           = useState('');
  const [hunts, setHunts]           = useState<Hunt[]>([]);
  const [completedIds, setIds]      = useState<string[]>([]);
  const [recs, setRecs]             = useState<Recommendation[]>([]);
  const [recsLoading, setRL]        = useState(true);
  const [profile, setProfile]       = useState<ImpactProfile | null>(null);
  const [showFilters, setFilters]   = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const state = loadState();
    setIds(state.completedHunts.map((h) => h.huntId));
    setHunts(state.hunts);
    setProfile(loadProfile());
    void fetchSupabaseMissions().then((r) => { if (r?.length) { setHunts(r); const s = loadState(); saveState({ ...s, hunts: r }); } });
    void fetch('/api/recommendations?limit=5')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.recommendations?.length) setRecs(d.recommendations); })
      .catch(() => {})
      .finally(() => setRL(false));
  }, []);

  const filtered = hunts
    .filter((h) => {
      if (query) {
        const q = query.toLowerCase();
        return h.title.toLowerCase().includes(q)
          || h.tags.some((t) => t.toLowerCase().includes(q))
          || (h.story_context ?? '').toLowerCase().includes(q)
          || (h.missionType ?? '').includes(q);
      }
      const catMatch = category === 'all' || h.tags.some((t) => t.toLowerCase().includes(category)) || h.category === category || resolveCategory(h.tags, h.category).id === category;
      const locMatch = locationFilter === 'all' || h.locationType === locationFilter;
      return catMatch && locMatch;
    })
    .sort((a, b) => {
      const dr = { easy: 0, medium: 1, hard: 2 } as const;
      if (sort === 'easy')     return (dr[a.difficulty as keyof typeof dr] ?? 1) - (dr[b.difficulty as keyof typeof dr] ?? 1);
      if (sort === 'hard')     return (dr[b.difficulty as keyof typeof dr] ?? 1) - (dr[a.difficulty as keyof typeof dr] ?? 1);
      if (sort === 'quick')    return (parseInt(a.estimated_time) || 60) - (parseInt(b.estimated_time) || 60);
      if (sort === 'reward')   return estimateCashReward(b.cashReward, b.difficulty, b.missionType) - estimateCashReward(a.cashReward, a.difficulty, a.missionType);
      if (sort === 'deadline') {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      }
      // recommended — sort by match score descending
      if (profile) {
        const sm = (computeMatch(b, profile) ?? 55) - (computeMatch(a, profile) ?? 55);
        if (sm !== 0) return sm;
      }
      return 0;
    });

  const showRecs = !query && category === 'all' && sort === 'recommended' && locationFilter === 'all';

  /* market summary */
  const totalCash = filtered.reduce((acc, h) => acc + estimateCashReward(h.cashReward, h.difficulty, h.missionType), 0);

  return (
    <div className="consumer-app" style={{ minHeight: '100vh', paddingBottom: 100, background: BG }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>

        {/* ── STICKY HEADER ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(5,8,22,.94)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '52px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: TXT, letterSpacing: '-.03em' }}>Explore</h1>
            <button onClick={() => setFilters(!showFilters)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, border: `1px solid ${showFilters ? ACCENT + '35' : 'rgba(255,255,255,.1)'}`, background: showFilters ? `${ACCENT}0A` : 'rgba(255,255,255,.04)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: showFilters ? ACCENT : DIM }}>
              <SlidersHorizontal size={13} strokeWidth={2} />
              Filters {showFilters ? '▲' : '▼'}
            </button>
          </div>

          {/* search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...XGLASS, borderRadius: 14, padding: '0 14px', marginBottom: 12 }}>
            <Search size={15} strokeWidth={2} style={{ color: FAINT, flexShrink: 0 }} />
            <input
              ref={searchRef} value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search missions, skills, causes, orgs…"
              style={{ flex: 1, height: 44, background: 'none', border: 'none', outline: 'none', fontSize: 13.5, color: TXT, fontFamily: 'inherit' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: FAINT }}>
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* category chips */}
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
            {IMPACT_CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button key={cat.id} onClick={() => setCategory(cat.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: active ? 700 : 500,
                    background: active ? cat.color : 'rgba(255,255,255,.06)',
                    color: active ? '#050816' : DIM,
                    boxShadow: active ? `0 0 18px ${cat.color}40` : 'none',
                    transition: 'all .15s' }}>
                  {cat.emoji} {cat.label}
                </button>
              );
            })}
          </div>

          {/* expanded filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden', paddingBottom: 12 }}>
                <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '.08em' }}>Sort by</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {SORT_OPTS.map((opt) => {
                    const active = sort === opt.id;
                    return (
                      <button key={opt.id} onClick={() => setSort(opt.id as SortId)}
                        style={{ padding: '5px 12px', borderRadius: 999, border: `1px solid ${active ? ACCENT : 'rgba(255,255,255,.07)'}`, background: active ? `${ACCENT}10` : 'transparent', color: active ? ACCENT : DIM, fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '.08em' }}>Location</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {LOCATION_OPTS.map((opt) => {
                    const active = locationFilter === opt.id;
                    return (
                      <button key={opt.id} onClick={() => setLoc(opt.id)}
                        style={{ padding: '5px 14px', borderRadius: 999, border: `1px solid ${active ? AI_CLR : 'rgba(255,255,255,.07)'}`, background: active ? `${AI_CLR}10` : 'transparent', color: active ? AI_CLR : DIM, fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ padding: '16px 20px 0' }}>

          {/* market summary bar */}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '9px 14px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <Target size={12} strokeWidth={2} style={{ color: FAINT }} />
              <span style={{ fontSize: 11, color: FAINT }}>{filtered.length} mission{filtered.length !== 1 ? 's' : ''}</span>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: FAINT }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>${totalCash.toLocaleString()} available</span>
              {profile && (
                <>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: FAINT }} />
                  <Brain size={11} strokeWidth={2} style={{ color: AI_CLR }} />
                  <span style={{ fontSize: 11, color: AI_CLR }}>AI ranked</span>
                </>
              )}
            </div>
          )}

          {/* AI Recommendations */}
          <AnimatePresence>
            {showRecs && !recsLoading && recs.length > 0 && (
              <motion.section key="recs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: 26 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: `${AI_CLR}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Brain size={13} strokeWidth={2} style={{ color: AI_CLR }} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: TXT }}>AI Picks for You</span>
                  </div>
                  <span style={{ fontSize: 10.5, color: FAINT }}>Impact DNA · ranked</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recs.map((rec, i) => (
                    <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                      <AIRecCard rec={rec} profile={profile} />
                    </motion.div>
                  ))}
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,.05)', margin: '20px 0 0' }} />
              </motion.section>
            )}

            {showRecs && recsLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Brain size={14} strokeWidth={2} style={{ color: AI_CLR }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: FAINT }}>AI matching your Impact DNA…</span>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 88, borderRadius: 20, background: '#07101F', marginBottom: 10, border: `1px solid ${AI_CLR}08`, opacity: 0.5 }} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mission list */}
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${ACCENT}0A`, border: `1px solid ${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Target size={22} strokeWidth={1.6} style={{ color: ACCENT }} />
              </div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TXT }}>No missions found</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: DIM }}>
                {query ? `No results for "${query}"` : `No ${category} missions yet.`}
              </p>
              {query && (
                <button onClick={() => { setQuery(''); setCategory('all'); }}
                  style={{ marginTop: 16, padding: '8px 20px', borderRadius: 999, background: ACCENT, color: BG, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((hunt, i) => (
                <ExploreCard key={hunt.id} hunt={hunt} index={i} completedIds={completedIds} profile={profile} />
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
