'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Zap, Trophy, ChevronDown, ChevronUp, ShieldCheck, Building2 } from 'lucide-react';
import { loadState } from '@/lib/store';
import { getTagGradient, getTagEmoji } from '@/lib/mockHunts';
import type { Hunt } from '@/lib/types';

const DIFF_CLR: Record<string, string> = {
  easy:   '#22FFAA',
  medium: '#FFB84D',
  hard:   '#FF5C7A',
};

const STEP_TYPE: Record<string, { bg: string; color: string; label: string }> = {
  action:     { bg: 'rgba(255,184,77,.08)',  color: '#FFB84D', label: 'Action'     },
  reflection: { bg: 'rgba(109,93,253,.08)', color: '#6D5DFD', label: 'Reflection' },
  discovery:  { bg: 'rgba(34,255,170,.08)', color: '#22FFAA', label: 'Discovery'  },
};

export default function HuntDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [hunt, setHunt]                 = useState<Hunt | null>(null);
  const [stepsExpanded, setExpanded]    = useState(false);
  const [isCompleted, setIsCompleted]   = useState(false);
  const [mounted, setMounted]           = useState(false);

  const huntId = params?.id as string;

  useEffect(() => {
    const state  = loadState();
    const all    = state.hunts;
    const found  = all.find((h) => h.id === huntId);
    if (found) { setHunt(found); setIsCompleted(state.completedHunts.some((c) => c.huntId === huntId)); }
    setMounted(true);
  }, [huntId]);

  if (!mounted) return null;
  if (!hunt) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050816' }}>
      <p style={{ color: '#4A5578' }}>Hunt not found.</p>
    </div>
  );

  const gradient = getTagGradient(hunt.tags);
  const emoji    = getTagEmoji(hunt.tags);
  const diffColor = DIFF_CLR[hunt.difficulty] ?? '#22FFAA';

  return (
    <div style={{ minHeight: '100vh', background: '#050816' }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>

        {/* Hero */}
        <div className={`relative bg-gradient-to-br h-72 ${gradient}`} style={{ position: 'relative', height: 288 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)' }} />

          <button onClick={() => router.back()}
            style={{ position: 'absolute', top: 48, left: 20, zIndex: 10, width: 36, height: 36, backdropFilter: 'blur(8px)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.16)', cursor: 'pointer' }}>
            <ArrowLeft size={18} strokeWidth={2} style={{ color: '#fff' }} />
          </button>

          <div style={{ position: 'absolute', bottom: 24, left: 20, right: 20, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>{emoji}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {hunt.tags.slice(0, 3).map((tag) => (
                  <span key={tag} style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,.35)', color: '#fff', fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 999 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: 0 }}>{hunt.title}</h1>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 20px 120px' }}>

          {/* Sponsor / verified */}
          {(hunt.tenantName || hunt.isVerified) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
              {hunt.tenantName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {hunt.tenantLogo ? (
                    <img src={hunt.tenantLogo} alt={hunt.tenantName} style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1530' }}>
                      <Building2 size={13} strokeWidth={2} style={{ color: '#4A5578' }} />
                    </div>
                  )}
                  <div>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: '#4A5578' }}>Hosted by</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F0F4FF' }}>{hunt.tenantName}</p>
                  </div>
                </div>
              )}
              {hunt.isVerified && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                  <ShieldCheck size={14} strokeWidth={2.5} style={{ color: '#22FFAA' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#22FFAA' }}>Verified</span>
                </div>
              )}
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            {[
              { icon: <Clock size={14} strokeWidth={2} style={{ color: '#8B9CC0' }} />, value: hunt.estimated_time },
              { icon: <Zap size={14} strokeWidth={2} style={{ color: diffColor }} />,
                value: <span style={{ color: diffColor, fontWeight: 700 }}>{hunt.difficulty.charAt(0).toUpperCase() + hunt.difficulty.slice(1)}</span> },
              { icon: null, value: <><span style={{ color: '#8B9CC0' }}>{hunt.steps.length}</span>{' '}<span style={{ color: '#F0F4FF', fontWeight: 700 }}>Steps</span></> },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center', borderRadius: 14, padding: '10px 8px', background: '#0A1226', border: '1px solid rgba(255,255,255,.07)' }}>
                {s.icon}
                <span style={{ fontSize: 13, fontWeight: 600, color: '#F0F4FF' }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Story */}
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#4A5578' }}>The Story</h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#8B9CC0' }}>{hunt.story_context}</p>
          </section>

          {/* Reward */}
          <section style={{ marginBottom: 24 }}>
            <div style={{ borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,184,77,.06)', border: '1px solid rgba(255,184,77,.18)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,184,77,.12)' }}>
                <Trophy size={20} style={{ color: '#FFB84D' }} strokeWidth={2} />
              </div>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#FFB84D' }}>Reward</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#F0F4FF' }}>{hunt.reward}</p>
              </div>
            </div>
          </section>

          {/* Steps */}
          <section style={{ marginBottom: 28 }}>
            <button onClick={() => setExpanded(!stepsExpanded)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px' }}>
              <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#4A5578' }}>
                Your Journey ({hunt.steps.length} steps)
              </h2>
              {stepsExpanded ? <ChevronUp size={18} style={{ color: '#4A5578' }} /> : <ChevronDown size={18} style={{ color: '#4A5578' }} />}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(stepsExpanded ? hunt.steps : hunt.steps.slice(0, 2)).map((step, i) => {
                const ts = STEP_TYPE[step.type] ?? STEP_TYPE.action;
                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 14, background: ts.bg, border: `1px solid ${ts.color}20` }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.2)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ts.color }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: ts.color }}>{ts.label}</span>
                      <p style={{ margin: '3px 0 0', fontSize: 13, lineHeight: 1.5, color: '#8B9CC0' }}>{step.instruction}</p>
                    </div>
                  </div>
                );
              })}
              {!stepsExpanded && hunt.steps.length > 2 && (
                <button onClick={() => setExpanded(true)} style={{ fontSize: 13, fontWeight: 600, color: '#22FFAA', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', textAlign: 'center' }}>
                  +{hunt.steps.length - 2} more steps
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Sticky CTA */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, padding: '12px 20px 24px', background: 'rgba(5,8,22,.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ maxWidth: 430, margin: '0 auto' }}>
            {isCompleted ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 18, background: 'rgba(34,255,170,.08)', border: '1px solid rgba(34,255,170,.2)' }}>
                <span style={{ color: '#22FFAA', fontWeight: 700, fontSize: 15 }}>Mission Completed ✓</span>
              </div>
            ) : (
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => router.push(`/active/${hunt.id}`)}
                style={{ width: '100%', height: 56, borderRadius: 18, border: 'none', cursor: 'pointer', background: '#22FFAA', color: '#050816', fontWeight: 800, fontSize: 16, boxShadow: '0 4px 24px rgba(34,255,170,.4)', fontFamily: 'inherit' }}>
                Start Hunt
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
