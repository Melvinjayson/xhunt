'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Brain, ChevronRight, Zap, Compass, Radio,
  ArrowUpRight, TrendingUp, Sparkles, ArrowRight,
  Target, X, Star, Flame, Settings, Check,
  CheckCircle2, PlayCircle, BarChart3,
  Clock, DollarSign, Trophy, Users, ShieldCheck,
  Activity, Layers, Cpu, Gauge, MessageSquare,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { LIQUID_GLASS_STYLE } from '@/components/LiquidGlass';
import { loadState, saveState, loadProfile } from '@/lib/store';
import type { Hunt, ImpactProfile } from '@/lib/types';
import { fetchSupabaseMissions } from '@/lib/supabase/events';
import { estimateCashReward, estimateXP, resolveCategory } from '@/lib/missionCategories';

/* ─── design tokens ─── */
const ACCENT = '#22FFAA';
const AI_CLR = '#6D5DFD';
const WARN   = '#FFB84D';
const ERR    = '#FF5C7A';
const BG     = '#050816';
const CARD   = '#0A1226';
const TXT    = '#F0F4FF';
const DIM    = '#8B9CC0';
const FAINT  = '#4A5578';
const XGLASS: React.CSSProperties = LIQUID_GLASS_STYLE;

/* ─── Unsplash placeholders keyed by mission tag ─── */
const MISSION_IMAGES: Record<string, string> = {
  fitness:   'photo-1571019613454-1cb2f99b2d8b',
  adventure: 'photo-1476514525535-07fb3b4ae5f1',
  food:      'photo-1504674900247-0877df9cc836',
  tech:      'photo-1518770660439-4636190af475',
  learning:  'photo-1456513080510-7bf3a84b82f8',
  social:    'photo-1529156069898-49953e39b3ac',
  art:       'photo-1513364776144-60967b0f800f',
  travel:    'photo-1488085061387-422e29b40080',
  mindful:   'photo-1506126613408-eca07ce68773',
  civic:     'photo-1554224155-6726b3ff858f',
  nature:    'photo-1441974231531-c6227db76b6e',
  finance:   'photo-1611974789855-9c2a0a7236a3',
  default:   'photo-1519389950473-47ba0277781c',
};
function getMissionImage(tags: string[], w = 800, h = 400): string {
  for (const t of tags) {
    const id = MISSION_IMAGES[t.toLowerCase()];
    if (id) return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=75&auto=format`;
  }
  return `https://images.unsplash.com/${MISSION_IMAGES.default}?w=${w}&h=${h}&fit=crop&q=75&auto=format`;
}

/* ─── AI agent config ─── */
interface AIConfig {
  reasoning: 'fast' | 'balanced' | 'deep';
  persona: 'mentor' | 'coach' | 'analyst' | 'strategist';
  focusAreas: string[];
  customInstructions: string;
}
const DEFAULT_AI_CONFIG: AIConfig = { reasoning: 'balanced', persona: 'mentor', focusAreas: [], customInstructions: '' };
function loadAIConfig(): AIConfig {
  try { const s = localStorage.getItem('xhunt-ai-config'); return s ? { ...DEFAULT_AI_CONFIG, ...JSON.parse(s) } : DEFAULT_AI_CONFIG; }
  catch { return DEFAULT_AI_CONFIG; }
}
function saveAIConfig(cfg: AIConfig) {
  try { localStorage.setItem('xhunt-ai-config', JSON.stringify(cfg)); } catch {}
}

/* ─── category colour maps ─── */
const TAG_ACCENT: Record<string, string> = {
  fitness: ACCENT, adventure: WARN, food: ERR,
  learning: '#60A5FA', social: AI_CLR, tech: '#60A5FA',
  art: WARN, travel: ACCENT, mindful: AI_CLR,
};
const TAG_BG: Record<string, [string, string]> = {
  fitness:   ['#030F09', '#061A10'], adventure: ['#100A02', '#1A1204'],
  food:      ['#100205', '#1A0508'], learning:  ['#020510', '#040A1E'],
  social:    ['#060218', '#0A0528'], tech:      ['#020510', '#040A20'],
  art:       ['#100802', '#1A1204'], travel:    ['#030F09', '#061A10'],
  mindful:   ['#060218', '#0C0830'],
};
function tagAccent(tags: string[]) { for (const t of tags) { const c = TAG_ACCENT[t.toLowerCase()]; if (c) return c; } return ACCENT; }
function tagBg(tags: string[]): [string, string] { for (const t of tags) { const c = TAG_BG[t.toLowerCase()]; if (c) return c; } return ['#030F09', '#061A10']; }

/* ─── helpers ─── */
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
const DIFF_CLR: Record<string, string> = { easy: ACCENT, medium: WARN, hard: ERR };

/* ─── animated counter ─── */
function Counter({ to, dur = 900, prefix = '', suffix = '' }: { to: number; dur?: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let n = 0; const inc = to / (dur / 16);
    const t = setInterval(() => { n += inc; if (n >= to) { setVal(to); clearInterval(t); } else setVal(n); }, 16);
    return () => clearInterval(t);
  }, [to, dur]);
  return <>{prefix}{Math.floor(val).toLocaleString()}{suffix}</>;
}

/* ─── sparkline ─── */
const SPARKS = [
  '0,24 16,18 32,21 48,11 64,15 80,6 96,3', '0,5 16,9 32,7 48,15 64,12 80,19 96,23',
  '0,20 16,14 32,17 48,7 64,12 80,4 96,2',   '0,4 16,8 32,5 48,14 56,10 72,18 88,15 96,22',
];
function Spark({ i = 0, color = ACCENT }: { i?: number; color?: string }) {
  return <svg width="72" height="28" viewBox="0 0 96 28" fill="none"><polyline points={SPARKS[i % SPARKS.length]} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/* ─── MMSCard ─── */
function MMSCard({ score, delta, tier, tierColor }: { score: number; delta: number; tier: string; tierColor: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
      className="liquid-glass" style={{ ...XGLASS, borderRadius: 20, padding: '18px 20px', position: 'relative', overflow: 'hidden', flex: '1 1 0' }}>
      <div style={{ position: 'absolute', bottom: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle,${ACCENT}18 0%,transparent 70%)`, pointerEvents: 'none' }} />
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: FAINT, textTransform: 'uppercase', letterSpacing: '.08em' }}>Mission Momentum</p>
      <p style={{ margin: '0 0 6px', fontSize: 36, fontWeight: 900, color: TXT, lineHeight: 1, letterSpacing: '-0.04em' }}><Counter to={score} dur={1000} /></p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: `${ACCENT}14`, border: `1px solid ${ACCENT}22`, borderRadius: 999, padding: '2px 8px' }}>
          <TrendingUp size={9} strokeWidth={2.5} style={{ color: ACCENT }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT }}>+{delta} this week</span>
        </div>
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: tierColor, boxShadow: `0 0 8px ${tierColor}` }} />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: tierColor }}>{tier}</span>
      </div>
      <div style={{ position: 'absolute', right: 12, bottom: 14, opacity: 0.7 }}><Spark i={0} color={ACCENT} /></div>
    </motion.div>
  );
}

/* ─── StatCard ─── */
function StatCard({ label, value, sub, icon: Icon, accent, index }: {
  label: string; value: string | number; sub: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  accent: string; index: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.12 + index * 0.07 }}
      className="liquid-glass" style={{ ...XGLASS, borderRadius: 18, padding: '14px 14px', flex: '1 1 0', minWidth: 0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle,${accent}18 0%,transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ width: 28, height: 28, borderRadius: 9, background: `${accent}16`, border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={13} strokeWidth={2} style={{ color: accent }} />
      </div>
      <p style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 900, color: TXT, lineHeight: 1, letterSpacing: '-0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {typeof value === 'number' ? <Counter to={value} /> : value}
      </p>
      <p style={{ margin: '0 0 6px', fontSize: 10, color: FAINT, fontWeight: 500 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <TrendingUp size={8} strokeWidth={2.5} style={{ color: accent }} />
        <span style={{ fontSize: 9.5, fontWeight: 700, color: accent }}>{sub}</span>
      </div>
    </motion.div>
  );
}

/* ─── AI Agent Config Panel ─── */
const REASONING_OPTS = [
  { id: 'fast'     as const, label: 'Fast',       desc: 'Quick answers',           icon: Cpu   },
  { id: 'balanced' as const, label: 'Balanced',   desc: 'Thoughtful analysis',     icon: Gauge },
  { id: 'deep'     as const, label: 'Deep Think', desc: 'Chain-of-thought reason', icon: Brain },
];
const PERSONA_OPTS = [
  { id: 'mentor'     as const, label: 'Mentor',     emoji: '📚' },
  { id: 'coach'      as const, label: 'Coach',      emoji: '💪' },
  { id: 'analyst'    as const, label: 'Analyst',    emoji: '📊' },
  { id: 'strategist' as const, label: 'Strategist', emoji: '🎯' },
];
const FOCUS_AREAS = ['Adventure', 'Fitness', 'Technology', 'Social', 'Creative', 'Learning', 'Finance', 'Nature'];

function AgentConfigPanel({ config, onSave, onClose }: { config: AIConfig; onSave: (c: AIConfig) => void; onClose: () => void }) {
  const [local, setLocal] = useState<AIConfig>(config);
  function patch(p: Partial<AIConfig>) { setLocal(prev => ({ ...prev, ...p })); }
  function toggleFocus(area: string) {
    const key = area.toLowerCase();
    patch({ focusAreas: local.focusAreas.includes(key) ? local.focusAreas.filter(f => f !== key) : [...local.focusAreas, key] });
  }
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
      <div style={{ background: 'rgba(109,93,253,0.06)', borderTop: '1px solid rgba(109,93,253,0.15)', padding: '16px 18px 18px' }}>

        {/* Reasoning */}
        <p style={{ margin: '0 0 9px', fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '.09em' }}>Reasoning Mode</p>
        <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
          {REASONING_OPTS.map(({ id, label, desc, icon: Icon }) => {
            const active = local.reasoning === id;
            return (
              <button key={id} onClick={() => patch({ reasoning: id })} style={{ flex: 1, padding: '9px 6px', borderRadius: 12, background: active ? `${AI_CLR}18` : 'rgba(255,255,255,.03)', border: `1px solid ${active ? AI_CLR : 'rgba(255,255,255,.08)'}`, cursor: 'pointer', textAlign: 'center' }}>
                <Icon size={14} strokeWidth={1.8} style={{ color: active ? AI_CLR : FAINT, display: 'block', margin: '0 auto 4px' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: active ? TXT : DIM, display: 'block' }}>{label}</span>
                <span style={{ fontSize: 8.5, color: FAINT, display: 'block', lineHeight: 1.3 }}>{desc}</span>
              </button>
            );
          })}
        </div>

        {/* Persona */}
        <p style={{ margin: '0 0 9px', fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '.09em' }}>Agent Persona</p>
        <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
          {PERSONA_OPTS.map(({ id, label, emoji }) => {
            const active = local.persona === id;
            return (
              <button key={id} onClick={() => patch({ persona: id })} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, background: active ? `${ACCENT}10` : 'rgba(255,255,255,.03)', border: `1px solid ${active ? ACCENT + '40' : 'rgba(255,255,255,.08)'}`, cursor: 'pointer', textAlign: 'center' }}>
                <span style={{ fontSize: 15, display: 'block', marginBottom: 2 }}>{emoji}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: active ? ACCENT : DIM }}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Focus areas */}
        <p style={{ margin: '0 0 9px', fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '.09em' }}>Focus Areas</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
          {FOCUS_AREAS.map(area => {
            const active = local.focusAreas.includes(area.toLowerCase());
            return (
              <button key={area} onClick={() => toggleFocus(area)} style={{ padding: '4px 11px', borderRadius: 999, fontSize: 10.5, fontWeight: 600, background: active ? `${ACCENT}14` : 'rgba(255,255,255,.04)', border: `1px solid ${active ? ACCENT + '40' : 'rgba(255,255,255,.08)'}`, color: active ? ACCENT : DIM, cursor: 'pointer' }}>
                {area}
              </button>
            );
          })}
        </div>

        {/* Custom instructions */}
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '.09em' }}>Custom Instructions</p>
        <textarea
          value={local.customInstructions}
          onChange={e => patch({ customInstructions: e.target.value })}
          placeholder="Always suggest missions related to… Focus on missions with…"
          rows={2}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', color: TXT, fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => { saveAIConfig(local); onSave(local); onClose(); }} style={{ flex: 1, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${ACCENT},${ACCENT}CC)`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={13} strokeWidth={2.5} style={{ color: '#050816' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#050816' }}>Save Config</span>
          </button>
          <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} strokeWidth={2} style={{ color: FAINT }} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── ActiveMissionCard ─── */
function ActiveMissionCard({ hunt, stepsCompleted = 0, matchScore }: { hunt: Hunt; stepsCompleted?: number; matchScore?: number | null }) {
  const accent     = tagAccent(hunt.tags);
  const [bg0]      = tagBg(hunt.tags);
  const totalSteps = hunt.steps?.length ?? 1;
  const progress   = Math.round((stepsCompleted / totalSteps) * 100);
  const stepsLeft  = totalSteps - stepsCompleted;
  const cat        = resolveCategory(hunt.tags, hunt.category);
  const cash       = estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType);
  const xp         = estimateXP(hunt.xpReward, hunt.difficulty, totalSteps);
  const diffColor  = (DIFF_CLR)[hunt.difficulty] ?? DIM;
  const R = 22, circ = 2 * Math.PI * R, dash = circ - (progress / 100) * circ;
  const heroImg    = getMissionImage(hunt.tags, 900, 380);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}
      style={{ borderRadius: 24, overflow: 'hidden', border: `1px solid ${accent}22`, boxShadow: `0 0 60px ${accent}0C` }}>

      {/* ── Hero image header ── */}
      <div style={{ position: 'relative', height: 150, overflow: 'hidden', background: bg0 }}>
        {!imgFailed && (
          <Image src={heroImg} alt="" fill style={{ objectFit: 'cover', objectPosition: 'center' }}
            onError={() => setImgFailed(true)} unoptimized />
        )}
        {/* gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg,rgba(5,8,22,.25) 0%,rgba(5,8,22,.65) 55%,${bg0} 100%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg,${accent}10 0%,transparent 55%)` }} />

        {/* content over image */}
        <div style={{ position: 'absolute', inset: 0, padding: '14px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />
              <span style={{ fontSize: 9.5, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '.1em' }}>Active Mission</span>
              {hunt.isVerified && <ShieldCheck size={11} strokeWidth={2.5} style={{ color: accent }} />}
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TXT, lineHeight: 1.3, letterSpacing: '-0.02em', paddingRight: 12, textShadow: '0 1px 10px rgba(0,0,0,.7)' }}>{hunt.title}</p>
            {hunt.tenantName && <p style={{ margin: '4px 0 0', fontSize: 10.5, color: DIM, display: 'flex', alignItems: 'center', gap: 4 }}><Users size={10} strokeWidth={2} />{hunt.tenantName}</p>}
          </div>
          <Link href={`/missions/${hunt.id}`} style={{ textDecoration: 'none', flexShrink: 0, zIndex: 1 }}>
            <motion.div whileTap={{ scale: 0.92 }} style={{ position: 'relative', width: 56, height: 56 }}>
              <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="28" cy="28" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3.5" />
                <circle cx="28" cy="28" r={R} fill="none" stroke={accent} strokeWidth="3.5" strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset .8s ease', filter: `drop-shadow(0 0 4px ${accent}80)` }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {progress > 0 ? <span style={{ fontSize: 11, fontWeight: 900, color: accent }}>{progress}%</span> : <PlayCircle size={18} strokeWidth={2} style={{ color: accent }} />}
              </div>
            </motion.div>
          </Link>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ background: CARD, padding: '14px 18px 18px' }}>
        {/* Econometrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { icon: DollarSign, label: 'Earnings', val: cash > 0 ? `$${cash}` : (hunt.reward.match(/\$\d+/)?.[0] ?? '—'), clr: ACCENT },
            { icon: Trophy,     label: 'XP',       val: `+${xp}`,                                                             clr: AI_CLR },
            { icon: Layers,     label: 'Steps',    val: null,                                                                  clr: WARN   },
          ].map(({ icon: Icon, label, val, clr }, i) => (
            <div key={label} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '9px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <Icon size={9} strokeWidth={2.5} style={{ color: clr }} />
                <span style={{ fontSize: 8.5, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
              </div>
              {i === 2
                ? <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: TXT }}>{stepsCompleted}<span style={{ fontSize: 9, color: FAINT }}>/{totalSteps}</span></p>
                : <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: clr, letterSpacing: '-0.03em' }}>{val}</p>
              }
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: FAINT }}>{stepsLeft > 0 ? `${stepsLeft} step${stepsLeft !== 1 ? 's' : ''} remaining` : 'Ready to complete!'}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: accent }}>{progress}% done</span>
          </div>
          <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: .9, delay: .4, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg,${accent},${accent}BB)`, boxShadow: `0 0 10px ${accent}70` }} />
          </div>
        </div>

        {/* Meta tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 999, padding: '3px 9px' }}>
            <Clock size={9} strokeWidth={2.5} style={{ color: DIM }} /><span style={{ fontSize: 10, fontWeight: 600, color: DIM }}>{hunt.estimated_time}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${diffColor}10`, border: `1px solid ${diffColor}28`, borderRadius: 999, padding: '3px 9px' }}>
            <Activity size={9} strokeWidth={2.5} style={{ color: diffColor }} /><span style={{ fontSize: 10, fontWeight: 700, color: diffColor, textTransform: 'capitalize' }}>{hunt.difficulty}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${cat.color}10`, border: `1px solid ${cat.color}28`, borderRadius: 999, padding: '3px 9px' }}>
            <span style={{ fontSize: 9 }}>{cat.emoji}</span><span style={{ fontSize: 10, fontWeight: 600, color: cat.color }}>{cat.label}</span>
          </div>
          {matchScore != null && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: matchScore >= 80 ? `${ACCENT}12` : `${WARN}12`, border: `1px solid ${matchScore >= 80 ? ACCENT : WARN}28`, borderRadius: 999, padding: '3px 9px' }}>
              <TrendingUp size={9} strokeWidth={2.5} style={{ color: matchScore >= 80 ? ACCENT : WARN }} /><span style={{ fontSize: 10, fontWeight: 800, color: matchScore >= 80 ? ACCENT : WARN }}>{matchScore}% match</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <Link href={`/missions/${hunt.id}`} style={{ textDecoration: 'none', display: 'block' }}>
          <motion.div whileTap={{ scale: .98 }} style={{ height: 50, borderRadius: 14, background: `linear-gradient(135deg,${accent},${accent}CC)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 4px 28px ${accent}40` }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#050816' }}>{stepsCompleted > 0 ? 'Continue Mission' : 'Start Mission'}</span>
            <ArrowRight size={16} strokeWidth={2.8} style={{ color: '#050816' }} />
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}

/* ─── AI Insight Card ─── */
interface Recommendation { id: string; title: string; tags: string[]; estimated_time: string; difficulty: string; confidence_pct: number; reason: string; reward?: string; }

function AIInsightCard({ recs, onDismiss, config, onConfigSave }: { recs: Recommendation[]; onDismiss: () => void; config: AIConfig; onConfigSave: (c: AIConfig) => void }) {
  const [showCfg, setShowCfg] = useState(false);
  const top = recs[0];
  const estimatedEarnings = recs.reduce((a, r) => { const m = r.reward?.match(/\$(\d+)/); return a + (m ? parseInt(m[1]) : 25); }, 0);
  const PERSONA_MAP = { mentor: '📚 Mentor', coach: '💪 Coach', analyst: '📊 Analyst', strategist: '🎯 Strategist' };
  const REASON_MAP  = { fast: '⚡ Fast', balanced: '⚖ Balanced', deep: '🔮 Deep Think' };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .3 }}
      style={{ background: 'linear-gradient(135deg,#0A0820 0%,#0E0C2A 100%)', border: '1px solid rgba(109,93,253,.22)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 0 48px rgba(109,93,253,.12)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,93,253,.18) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ padding: '18px 18px 0', position: 'relative', zIndex: 1 }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(109,93,253,.2)', border: '1px solid rgba(109,93,253,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={18} strokeWidth={1.8} style={{ color: AI_CLR }} />
            </div>
            <div style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%', background: ACCENT, border: `2px solid ${BG}`, animation: 'breathe 2.5s ease-in-out infinite' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: TXT }}>AI Mission Assistant</p>
            <p style={{ margin: 0, fontSize: 10.5, color: AI_CLR, fontWeight: 600 }}>6 agents active · {REASON_MAP[config.reasoning]}</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setShowCfg(v => !v)} title="Configure AI" style={{ width: 28, height: 28, borderRadius: 8, background: showCfg ? `${AI_CLR}20` : 'rgba(255,255,255,.05)', border: `1px solid ${showCfg ? AI_CLR + '40' : 'rgba(255,255,255,.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Settings size={12} strokeWidth={2} style={{ color: showCfg ? AI_CLR : FAINT }} />
            </button>
            <button onClick={onDismiss} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={11} strokeWidth={2} style={{ color: FAINT }} />
            </button>
          </div>
        </div>

        {/* active config chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: AI_CLR, background: `${AI_CLR}10`, border: `1px solid ${AI_CLR}20`, borderRadius: 999, padding: '2px 8px' }}>{PERSONA_MAP[config.persona]}</span>
          {config.focusAreas.length > 0 && (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: ACCENT, background: `${ACCENT}10`, border: `1px solid ${ACCENT}20`, borderRadius: 999, padding: '2px 8px' }}>{config.focusAreas.slice(0, 2).join(' · ')}</span>
          )}
          {config.reasoning === 'deep' && (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: WARN, background: `${WARN}10`, border: `1px solid ${WARN}20`, borderRadius: 999, padding: '2px 8px' }}>🔮 Extended reasoning</span>
          )}
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 13.5, color: DIM, lineHeight: 1.6 }}>
          I found <span style={{ color: TXT, fontWeight: 700 }}>{recs.length} mission{recs.length !== 1 ? 's' : ''}</span> matched to your interests.
          {top && ` Top pick: "${top.title.slice(0, 30)}…" with ${top.confidence_pct}% confidence.`}
          {estimatedEarnings > 0 && ` Estimated value: up to $${estimatedEarnings}.`}
        </p>

        <div style={{ paddingBottom: 18 }}>
          <Link href="/explore" style={{ textDecoration: 'none', display: 'block' }}>
            <motion.div whileTap={{ scale: .98 }} style={{ height: 44, borderRadius: 12, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: `0 0 24px ${ACCENT}40` }}>
              <Sparkles size={14} strokeWidth={2} style={{ color: '#050816' }} />
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#050816' }}>Show Me</span>
            </motion.div>
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {showCfg && <AgentConfigPanel config={config} onSave={onConfigSave} onClose={() => setShowCfg(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── computeMatchScore ─── */
function computeMatchScore(hunt: Hunt, profile: ImpactProfile | null): number | null {
  if (!profile) return null;
  const tl = hunt.tags.map(t => t.toLowerCase()), cl = profile.causes.map(c => c.toLowerCase()), sl = profile.strengths.map(s => s.name.toLowerCase());
  let score = 55;
  for (const t of tl) { if (cl.some(c => c.includes(t) || t.includes(c))) score += 12; if (sl.some(s => s.includes(t) || t.includes(s))) score += 8; }
  return Math.min(98, score + Math.round((profile.impactScore / 100) * 10));
}

/* ─── MissionCard (compact, with thumbnail) ─── */
function MissionCard({ hunt, index, isCompleted, matchScore }: { hunt: Hunt; index: number; isCompleted?: boolean; matchScore?: number | null }) {
  const accent = tagAccent(hunt.tags);
  const diffColor = DIFF_CLR[hunt.difficulty] ?? DIM;
  const rewardMatch = hunt.reward.match(/\$(\d+[\d,]*)/);
  const rewardLabel = rewardMatch ? rewardMatch[0] : hunt.reward.split('+')[0].trim();
  const thumbImg = getMissionImage(hunt.tags, 700, 300);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .07, duration: .35 }}>
      <Link href={`/missions/${hunt.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div className="liquid-glass" style={{ ...XGLASS, borderRadius: 20, overflow: 'hidden', borderColor: isCompleted ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.08)' }}>

          {/* Thumbnail banner */}
          <div style={{ position: 'relative', height: 115, overflow: 'hidden', background: tagBg(hunt.tags)[0] }}>
            {!imgFailed && (
              <Image src={thumbImg} alt="" fill style={{ objectFit: 'cover', objectPosition: 'center', opacity: isCompleted ? .35 : .82 }}
                onError={() => setImgFailed(true)} unoptimized />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 0%,rgba(10,18,38,.88) 100%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${accent},${accent}00)` }} />

            {/* badges over image */}
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              {isCompleted
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: ACCENT, background: 'rgba(5,8,22,.72)', border: `1px solid ${ACCENT}40`, borderRadius: 999, padding: '3px 9px', backdropFilter: 'blur(8px)' }}><CheckCircle2 size={9} strokeWidth={2.5} />Completed</span>
                : matchScore != null && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 800, color: matchScore >= 80 ? ACCENT : WARN, background: 'rgba(5,8,22,.72)', border: `1px solid ${matchScore >= 80 ? ACCENT : WARN}40`, borderRadius: 999, padding: '3px 9px', backdropFilter: 'blur(8px)' }}><TrendingUp size={9} strokeWidth={2.5} />{matchScore}% match</span>
              }
            </div>
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: diffColor, background: 'rgba(5,8,22,.72)', border: `1px solid ${diffColor}40`, borderRadius: 999, padding: '3px 9px', backdropFilter: 'blur(8px)', textTransform: 'capitalize' }}>{hunt.difficulty}</span>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '12px 16px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: isCompleted ? DIM : TXT, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hunt.title}</p>
                <p style={{ margin: '2px 0 8px', fontSize: 10.5, color: FAINT }}>({hunt.tags[0] ?? 'mission'})</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10.5, color: FAINT }}>{hunt.estimated_time}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: accent }}>{hunt.tags[0]}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: isCompleted ? FAINT : TXT, letterSpacing: '-0.04em', lineHeight: 1 }}>{rewardLabel}</p>
                <div style={{ opacity: isCompleted ? .25 : .85 }}><Spark i={index} color={index % 2 === 0 ? ACCENT : WARN} /></div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── ActivityItem ─── */
function ActivityItem({ text, sub, xp, positive, index }: { text: string; sub: string; xp: string; positive: boolean; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .05 + index * .07, duration: .3 }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 11, background: positive ? `${ACCENT}14` : `${ERR}14`, border: `1px solid ${positive ? ACCENT : ERR}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {positive ? <CheckCircle2 size={15} strokeWidth={2} style={{ color: ACCENT }} /> : <BarChart3 size={15} strokeWidth={2} style={{ color: ERR }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXT, lineHeight: 1.25 }}>{text}</p>
        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: FAINT }}>{sub}</p>
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: positive ? ACCENT : ERR, flexShrink: 0 }}>{xp}</span>
    </motion.div>
  );
}

/* ─── types ─── */
interface SubStatus { tier: string; isTrialActive: boolean; trialDaysLeft: number; hasUsedTrial: boolean; canUseAI: boolean; }

/* ═══════════════════════════════════════ PAGE ════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();
  const [hunts, setHunts]                = useState<Hunt[]>([]);
  const [completedIds, setIds]           = useState<string[]>([]);
  const [activeMissionSteps, setAMSteps] = useState(0);
  const [streak, setStreak]              = useState(0);
  const [mounted, setMounted]            = useState(false);
  const [subStatus, setSub]              = useState<SubStatus | null>(null);
  const [nudgeDismissed, setNudge]       = useState(false);
  const [aiDismissed, setAIDismiss]      = useState(false);
  const [recs, setRecs]                  = useState<Recommendation[]>([]);
  const [userName, setUserName]          = useState('Explorer');
  const [impactProfile, setProfile]      = useState<ImpactProfile | null>(null);
  const [aiConfig, setAIConfig]          = useState<AIConfig>(DEFAULT_AI_CONFIG);

  useEffect(() => {
    const state = loadState();
    if (!state.user?.onboardingComplete) { router.replace('/'); return; }
    const completed = state.completedHunts.map(h => h.huntId);
    setIds(completed); setStreak(state.streak);
    if ((state.user as { name?: string }).name) setUserName((state.user as { name?: string }).name!);
    setHunts(state.hunts); setProfile(loadProfile()); setAIConfig(loadAIConfig());
    const topId = state.hunts.find(h => !completed.includes(h.id))?.id;
    if (topId && state.progress[topId]) setAMSteps(state.progress[topId].completedSteps?.length ?? 0);
    setMounted(true);

    void fetchSupabaseMissions().then(r => { if (r?.length) { setHunts(r); const s = loadState(); saveState({ ...s, hunts: r }); } });
    void fetch('/api/subscription/status').then(r => r.json()).then((d: SubStatus) => setSub(d)).catch(() => {});
    void fetch('/api/recommendations?limit=5').then(r => r.ok ? r.json() : null).then(d => { if (d?.recommendations?.length) setRecs(d.recommendations); }).catch(() => {});
  }, [router]);

  if (!mounted) return null;

  const active  = hunts.filter(h => !completedIds.includes(h.id));
  const done    = hunts.filter(h =>  completedIds.includes(h.id));
  const topHunt = active[0] ?? null;
  const mms       = Math.min(1000, 50 + completedIds.length * 40 + streak * 15);
  const mmsDelta  = streak * 3 + completedIds.length * 2;
  const xpBalance = 100 + completedIds.length * 250 + streak * 15;
  const tierLabel = mms >= 700 ? 'Elite Hunter' : mms >= 400 ? 'Pro Hunter' : mms >= 150 ? 'Verified Hunter' : 'Explorer';
  const tierColor = mms >= 700 ? WARN : mms >= 400 ? AI_CLR : mms >= 150 ? ACCENT : FAINT;

  const ACTIONS = [
    { icon: Compass,       label: 'Explore',  href: '/explore'  },
    { icon: Users,         label: 'People',   href: '/people'   },
    { icon: BarChart3,     label: 'Missions', href: '/missions' },
    { icon: MessageSquare, label: 'Messages', href: '/messages' },
  ];

  /* ── Reusable blocks rendered in both rails ── */
  const quickActionsBlock = (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '.08em' }}>Quick Actions</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9 }}>
        {ACTIONS.map(({ icon: Icon, label, href }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none' }}>
            <motion.div whileTap={{ scale: .93 }} className="liquid-glass" style={{ ...XGLASS, borderRadius: 14, padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Icon size={18} strokeWidth={1.8} style={{ color: DIM }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: FAINT }}>{label}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );

  const streakBlock = streak > 0 && (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35 }}
      className="liquid-glass" style={{ ...XGLASS, borderRadius: 20, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: `${WARN}14`, border: `1px solid ${WARN}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={17} strokeWidth={2} style={{ color: WARN }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>Daily Streak</p>
            <p style={{ margin: 0, fontSize: 10.5, color: FAINT }}>{streak} days in a row</p>
          </div>
        </div>
        <span style={{ fontSize: 28, fontWeight: 900, color: WARN, letterSpacing: '-0.04em' }}>{streak}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
        {['M','T','W','T','F','S','S'].map((d, i) => {
          const filled = i < streak;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: filled ? `${ACCENT}18` : 'rgba(255,255,255,.04)', border: `1px solid ${filled ? ACCENT : 'rgba(255,255,255,.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: filled ? `0 0 8px ${ACCENT}30` : 'none' }}>
                {filled && <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT }} />}
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: filled ? ACCENT : FAINT }}>{d}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div className="consumer-app" style={{ minHeight: '100vh', background: 'var(--t-bg)', paddingBottom: 100 }}>

      {/* ambient glows */}
      <div style={{ position: 'fixed', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle,${ACCENT}08 0%,transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: 80, left: -60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle,${AI_CLR}08 0%,transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── TOP BAR ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,8,22,.88)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,.05)', padding: '50px 24px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo (mobile only — desktop sidebar has it) */}
          <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ position: 'relative', width: 36, height: 36 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${ACCENT}`, opacity: .95 }} />
              <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: `1.5px solid ${ACCENT}50` }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: ACCENT, letterSpacing: '-0.05em' }}>X</span>
              </div>
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: TXT, letterSpacing: '-0.03em' }}>XHUNT</span>
          </div>
          {/* Desktop greeting */}
          <div className="hidden md:block">
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: TXT, letterSpacing: '-0.025em' }}>{greeting()}, {userName} 👋</h2>
            <p style={{ margin: 0, fontSize: 12, color: DIM }}>
              {active.length > 0 ? `${active.length} mission${active.length !== 1 ? 's' : ''} waiting` : done.length > 0 ? `${done.length} completed · Great work` : 'Start your first mission'}
            </p>
          </div>
          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/explore" style={{ textDecoration: 'none' }}>
              <div style={{ height: 38, borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', cursor: 'pointer' }}>
                <span style={{ fontSize: 12, color: FAINT }}>Search missions…</span>
              </div>
            </Link>
            <button style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
              <Bell size={16} strokeWidth={1.8} style={{ color: DIM }} />
              <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: ACCENT, border: `1.5px solid ${BG}`, animation: 'breathe 2.5s ease-in-out infinite' }} />
            </button>
            <Link href="/profile" style={{ textDecoration: 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg,${ACCENT}20,${AI_CLR}20)`, border: `1.5px solid ${ACCENT}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>{userName[0].toUpperCase()}</span>
              </div>
            </Link>
          </div>
        </div>

        {/* ── WELCOME (mobile) ── */}
        <div className="md:hidden" style={{ padding: '24px 24px 0' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
            <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 800, color: TXT, letterSpacing: '-0.03em' }}>{greeting()}, {userName} 👋</h1>
            <p style={{ margin: 0, fontSize: 13, color: DIM }}>{active.length > 0 ? `${active.length} mission${active.length !== 1 ? 's' : ''} waiting · Let's complete them.` : done.length > 0 ? `${done.length} completed · Great work.` : 'Generate your first mission to start earning.'}</p>
          </motion.div>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <MMSCard score={mms} delta={mmsDelta} tier={tierLabel} tierColor={tierColor} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 108px', width: 108 }}>
              <StatCard label="XPoints" value={xpBalance} sub={`+${completedIds.length * 50 || 0} Today`} icon={Star} accent={AI_CLR} index={0} />
              <StatCard label="Completed" value={completedIds.length} sub={`+${Math.min(streak,3)} this week`} icon={CheckCircle2} accent={ACCENT} index={1} />
            </div>
          </div>
        </div>

        {/* ── FREEMIUM NUDGE ── */}
        <AnimatePresence>
          {subStatus && !subStatus.canUseAI && !subStatus.hasUsedTrial && !nudgeDismissed && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              style={{ margin: '16px 24px 0', borderRadius: 16, background: `${AI_CLR}0D`, border: `1px solid ${AI_CLR}28`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={15} strokeWidth={2} style={{ color: AI_CLR, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TXT }}>Unlock AI Agents + Premium Missions</p>
                <p style={{ margin: '1px 0 0', fontSize: 10.5, color: FAINT }}>14-day free trial · No card required</p>
              </div>
              <button onClick={() => router.push('/upgrade')} style={{ fontSize: 11.5, fontWeight: 700, color: AI_CLR, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>Try free <ArrowRight size={11} strokeWidth={2.5} /></button>
              <button onClick={() => setNudge(true)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 2 }}><X size={13} strokeWidth={2} style={{ color: FAINT }} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════ 2-COL GRID (desktop) / SINGLE COL (mobile) ══════════════ */}
        <div className="md:flex md:gap-6 md:items-start" style={{ padding: '0 24px' }}>

          {/* ── LEFT / MAIN COLUMN ── */}
          <div className="md:flex-1 md:min-w-0">

            {/* Active Mission */}
            {topHunt && (
              <div style={{ paddingTop: 20 }}>
                <ActiveMissionCard hunt={topHunt} stepsCompleted={activeMissionSteps} matchScore={computeMatchScore(topHunt, impactProfile)} />
              </div>
            )}

            {/* AI Insight */}
            {recs.length > 0 && !aiDismissed && (
              <div style={{ paddingTop: 16 }}>
                <AIInsightCard recs={recs} onDismiss={() => setAIDismiss(true)} config={aiConfig} onConfigSave={setAIConfig} />
              </div>
            )}

            {/* Recommended / Active Missions */}
            <div style={{ paddingTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TXT }}>
                  {recs.length > 0 ? 'Recommended for You' : active.length > 0 ? 'Active Missions' : 'All Missions'}
                </p>
                <Link href="/explore" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600, color: DIM, textDecoration: 'none' }}>View all <ArrowUpRight size={12} strokeWidth={2} /></Link>
              </div>
              {hunts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${ACCENT}0D`, border: `1px solid ${ACCENT}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Compass size={22} strokeWidth={1.6} style={{ color: ACCENT }} />
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: TXT }}>No missions yet</p>
                  <p style={{ margin: '0 0 20px', fontSize: 12.5, color: FAINT }}>Generate your first AI mission to start earning.</p>
                  <Link href="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 14, background: ACCENT, color: '#050816', fontWeight: 800, fontSize: 13.5, textDecoration: 'none', boxShadow: `0 0 24px ${ACCENT}40` }}>
                    <Zap size={14} strokeWidth={2.5} /> Start My First Hunt
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(active.length > 0 ? active : done).slice(0, 4).map((hunt, i) => (
                    <MissionCard key={hunt.id} hunt={hunt} index={i} isCompleted={completedIds.includes(hunt.id)} matchScore={computeMatchScore(hunt, impactProfile)} />
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            {done.length > 0 && (
              <div className="liquid-glass" style={{ marginTop: 24, ...XGLASS, borderRadius: 22, padding: '18px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TXT }}>Recent Activity</p>
                  <Link href="/profile" style={{ fontSize: 12, fontWeight: 600, color: DIM, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>View all <ChevronRight size={12} strokeWidth={2} /></Link>
                </div>
                {done.slice(0, 3).map((hunt, i) => (
                  <ActivityItem key={hunt.id} text="Mission Completed" sub={hunt.title.length > 32 ? hunt.title.slice(0, 30) + '…' : hunt.title} xp="+250 XP" positive={true} index={i} />
                ))}
                {streak > 1 && <ActivityItem text="Streak Milestone" sub={`${streak} day streak reached`} xp={`+${streak * 10} XP`} positive={true} index={done.length} />}
              </div>
            )}

            {/* Completed */}
            {done.length > 0 && active.length > 0 && (
              <div style={{ paddingTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TXT }}>Completed</p>
                  <span style={{ fontSize: 11, color: FAINT }}>{done.length} verified</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {done.slice(0, 3).map((hunt, i) => <MissionCard key={hunt.id} hunt={hunt} index={i} isCompleted matchScore={null} />)}
                </div>
              </div>
            )}

            {/* Mobile-only: Quick Actions + Streak */}
            <div className="md:hidden">
              <div style={{ paddingTop: 20 }}>{quickActionsBlock}</div>
              {streak > 0 && <div style={{ marginTop: 16 }}>{streakBlock}</div>}
            </div>
          </div>

          {/* ── RIGHT RAIL (desktop only) ── */}
          <div className="hidden md:flex md:flex-col md:gap-5" style={{ width: 300, flexShrink: 0, paddingTop: 20 }}>
            {quickActionsBlock}
            {streakBlock}

            {/* Progress panel */}
            <div className="liquid-glass" style={{ ...XGLASS, borderRadius: 20, padding: '16px 18px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: TXT }}>Your Progress</p>
              {[
                { label: 'Profile Complete', pct: 72,                                               color: ACCENT  },
                { label: 'Impact Score',     pct: Math.min(100, 45 + completedIds.length * 12),     color: AI_CLR },
                { label: 'Mission XP',       pct: Math.min(100, Math.round(xpBalance / 50)),        color: WARN   },
              ].map(({ label, pct, color }) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: DIM, fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: 11, color, fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: .8, delay: .3, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 999, background: color, boxShadow: `0 0 6px ${color}60` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Mission count desktop teaser */}
            <div className="liquid-glass" style={{ ...XGLASS, borderRadius: 20, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: `${ACCENT}14`, border: `1px solid ${ACCENT}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Target size={20} strokeWidth={1.8} style={{ color: ACCENT }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: TXT, letterSpacing: '-0.04em' }}>{active.length}</p>
                <p style={{ margin: 0, fontSize: 11, color: DIM }}>Active mission{active.length !== 1 ? 's' : ''}</p>
              </div>
              <Link href="/missions" style={{ marginLeft: 'auto', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: ACCENT }}>
                View all <ArrowRight size={11} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
