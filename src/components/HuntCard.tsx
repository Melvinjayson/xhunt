'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Clock, Zap, Trophy, ShieldCheck, Building2 } from 'lucide-react';
import { getTagEmoji } from '@/lib/mockHunts';
import type { Hunt } from '@/lib/types';

interface HuntCardProps {
  hunt: Hunt;
  isCompleted?: boolean;
}

const DIFF = {
  easy:   { label: 'Easy',   color: '#27e07d', bg: 'rgba(39,224,125,.12)' },
  medium: { label: 'Medium', color: '#f7931a', bg: 'rgba(247,147,26,.12)' },
  hard:   { label: 'Hard',   color: '#ef5b6b', bg: 'rgba(239,91,107,.12)' },
} as const;

export default function HuntCard({ hunt, isCompleted = false }: HuntCardProps) {
  const emoji = getTagEmoji(hunt.tags);
  const diff = DIFF[hunt.difficulty] ?? DIFF.easy;

  return (
    <motion.div whileTap={{ scale: 0.985 }} transition={{ duration: 0.1 }}>
      <Link href={`/hunt/${hunt.id}`} className="block" style={{ textDecoration: 'none' }}>
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,.022), rgba(255,255,255,0)), #121d20',
            border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 22,
            overflow: 'hidden',
            opacity: isCompleted ? 0.62 : 1,
          }}
        >
          {/* Accent bar */}
          <div
            style={{
              height: 2,
              background: isCompleted
                ? 'linear-gradient(90deg,#34d98a,#15b866)'
                : 'linear-gradient(90deg,#27e07d,rgba(39,224,125,0))',
            }}
          />

          <div style={{ padding: '14px 16px 0' }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: 'rgba(39,224,125,.10)', border: '1px solid rgba(39,224,125,.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}
              >
                {emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isCompleted && (
                  <div
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
                      color: '#27e07d', background: 'rgba(39,224,125,.12)',
                      padding: '2px 8px', borderRadius: 999, marginBottom: 4,
                    }}
                  >
                    ✓ Completed
                  </div>
                )}
                <h3
                  style={{
                    margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3,
                    color: '#e9eff0', letterSpacing: '-.01em',
                  }}
                >
                  {hunt.title}
                </h3>
              </div>
            </div>

            <p
              style={{
                margin: '0 0 10px', fontSize: 13, lineHeight: 1.5, color: '#7d8b8e',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {hunt.story_context}
            </p>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {hunt.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10.5, fontWeight: 500, color: '#7d8b8e',
                    background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)',
                    padding: '2px 10px', borderRadius: 999,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Sponsor / verified row */}
            {(hunt.tenantName || hunt.isVerified) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {hunt.tenantName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {hunt.tenantLogo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={hunt.tenantLogo}
                        alt={hunt.tenantName}
                        style={{ width: 16, height: 16, borderRadius: 4, objectFit: 'cover' }}
                      />
                    ) : (
                      <Building2 size={12} strokeWidth={2} style={{ color: '#54625f' }} />
                    )}
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#54625f' }}>
                      {hunt.tenantName}
                    </span>
                  </div>
                )}
                {hunt.isVerified && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={11} strokeWidth={2.5} style={{ color: '#27e07d' }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#27e07d', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                      Verified
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.07)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={12} strokeWidth={2} style={{ color: '#54625f' }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: '#7d8b8e' }}>{hunt.estimated_time}</span>
              </div>

              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 999, background: diff.bg,
                }}
              >
                <Zap size={10} strokeWidth={2.5} style={{ color: diff.color }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: diff.color }}>{diff.label}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                <Trophy size={12} strokeWidth={2} style={{ color: '#27e07d' }} />
                <span
                  style={{
                    fontSize: 12, fontWeight: 600, color: '#27e07d',
                    maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {hunt.reward.split('+')[0].trim()}
                </span>
              </div>
            </div>
          </div>

          {/* CTA */}
          {!isCompleted ? (
            <div style={{ padding: '12px 16px 16px' }}>
              <div
                style={{
                  width: '100%', height: 46, borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(180deg,#3ee888 0%,#19c268 100%)',
                  boxShadow: '0 6px 20px rgba(39,224,125,.28)',
                  color: '#04130b', fontSize: 14, fontWeight: 700, letterSpacing: '-.01em',
                }}
              >
                Start Mission
              </div>
            </div>
          ) : (
            <div style={{ height: 16 }} />
          )}
        </div>
      </Link>
    </motion.div>
  );
}
