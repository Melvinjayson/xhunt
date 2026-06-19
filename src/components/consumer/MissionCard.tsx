'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bookmark, BookmarkCheck, Clock, MapPin, Shield, Zap } from 'lucide-react';
import { t } from '@/theme/colors';
import { toggleSavedHunt, loadState } from '@/lib/store';
import {
  estimateCashReward, estimateXP, deadlineLabel, spotsLabel, demandLabel,
  resolveCategory, DIFF_META, MISSION_TYPE_META,
} from '@/lib/missionCategories';
import type { Hunt } from '@/lib/types';
import MatchRing from './MatchRing';
import StatusPill from './StatusPill';
import type { MissionStatus } from './StatusPill';
import type { VerificationStatus } from '@/lib/types';

interface MissionCardProps {
  hunt: Hunt;
  matchScore?: number;
  distanceKm?: number;
  missionStatus?: MissionStatus;
  verificationStatus?: VerificationStatus;
  compact?: boolean;
  onClick?: () => void;
}

export default function MissionCard({
  hunt,
  matchScore,
  distanceKm,
  missionStatus,
  verificationStatus,
  compact = false,
  onClick,
}: MissionCardProps) {
  const [saved, setSaved] = useState(() => (loadState().savedHunts ?? []).includes(hunt.id));
  const [saving, setSaving] = useState(false);

  const cash = estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType);
  const xp   = estimateXP(hunt.xpReward, hunt.difficulty, hunt.steps?.length ?? 0);
  const diff  = DIFF_META[hunt.difficulty] ?? DIFF_META.easy;
  const typeMeta = hunt.missionType ? MISSION_TYPE_META[hunt.missionType] : null;
  const category = resolveCategory(hunt.tags ?? [], hunt.category);
  const dl = deadlineLabel(hunt.deadline);
  const sl = spotsLabel(hunt.spotsRemaining, hunt.spotsTotal);
  const demand = demandLabel(hunt.applicationCount);

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    const next = toggleSavedHunt(hunt.id);
    setSaved(next);
    setSaving(false);
  }

  const inner = (
    <div
      onClick={onClick}
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: compact ? 16 : 20,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        position: 'relative',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      {/* Category accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${category.color}, ${category.color}44)` }} />

      <div style={{ padding: compact ? '12px 14px' : '16px 18px' }}>
        {/* Header row: org + save */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            {/* Org avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
              background: `${category.color}18`, border: `1px solid ${category.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>
              {hunt.tenantLogo
                ? <img src={hunt.tenantLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span>{category.emoji}</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: t.txtFaint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {hunt.tenantName ?? 'Organization'}
                {hunt.isVerified && <Shield size={9} strokeWidth={2} style={{ color: t.info, marginLeft: 4, display: 'inline' }} />}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {matchScore != null && <MatchRing score={matchScore} size={36} strokeWidth={3} />}
            <button
              onClick={handleSave}
              title={saved ? 'Unsave' : 'Save'}
              disabled={saving}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: saved ? t.accent : t.txtFaint, flexShrink: 0 }}
            >
              {saved
                ? <BookmarkCheck size={16} strokeWidth={2} />
                : <Bookmark size={16} strokeWidth={1.8} />}
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 style={{ margin: '0 0 6px', fontSize: compact ? 14 : 15, fontWeight: 800, color: t.txt, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
          {hunt.title}
        </h3>

        {/* Description */}
        {!compact && hunt.story_context && (
          <p style={{ margin: '0 0 12px', fontSize: 12, color: t.txtDim, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {hunt.story_context}
          </p>
        )}

        {/* Tags */}
        {!compact && hunt.tags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
            {hunt.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: category.color, background: `${category.color}14`, padding: '2px 8px', borderRadius: 100 }}>
                {tag}
              </span>
            ))}
            {hunt.tags.length > 3 && (
              <span style={{ fontSize: 10, fontWeight: 500, color: t.txtFaint }}>+{hunt.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Reward + meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Cash reward */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${t.accent}14`, borderRadius: 8, padding: '4px 10px' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>${cash}</span>
          </div>

          {/* XP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Zap size={11} strokeWidth={2} style={{ color: t.ai }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: t.ai }}>{xp} XP</span>
          </div>

          {/* Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={11} strokeWidth={1.8} style={{ color: t.txtFaint }} />
            <span style={{ fontSize: 11, color: t.txtFaint }}>{hunt.estimated_time}</span>
          </div>

          {/* Distance */}
          {distanceKm != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={11} strokeWidth={1.8} style={{ color: t.txtFaint }} />
              <span style={{ fontSize: 11, color: t.txtFaint }}>{distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}</span>
            </div>
          )}
        </div>

        {/* Bottom row: badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {/* Difficulty */}
          <span style={{ fontSize: 10, fontWeight: 700, color: diff.color, background: diff.bg, padding: '3px 8px', borderRadius: 100 }}>
            {diff.label}
          </span>

          {/* Mission type */}
          {typeMeta && (
            <span style={{ fontSize: 10, fontWeight: 600, color: typeMeta.color, background: `${typeMeta.color}14`, padding: '3px 8px', borderRadius: 100 }}>
              {typeMeta.emoji} {typeMeta.label}
            </span>
          )}

          {/* Deadline */}
          {dl && <span style={{ fontSize: 10, fontWeight: 600, color: dl.color, marginLeft: 'auto' }}>{dl.label}</span>}

          {/* Spots */}
          {!dl && sl && <span style={{ fontSize: 10, fontWeight: 600, color: sl.color, marginLeft: 'auto' }}>{sl.label}</span>}

          {/* Demand */}
          {demand && <span style={{ fontSize: 10, fontWeight: 600, color: t.warning }}>{demand}</span>}

          {/* Verification / mission status */}
          {(verificationStatus || missionStatus) && (
            <StatusPill status={verificationStatus ?? missionStatus!} />
          )}
        </div>
      </div>
    </div>
  );

  if (onClick) return inner;
  return <Link href={`/hunt/${hunt.id}`} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
}
