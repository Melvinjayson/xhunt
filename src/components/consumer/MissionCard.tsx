'use client';

import Link from 'next/link';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
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
    <Card
      onClick={onClick}
      sx={{
        bgcolor: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: compact ? '16px' : '20px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        position: 'relative',
        boxShadow: 'none',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
        },
      }}
    >
      {/* Category accent bar */}
      <Box sx={{ height: 3, background: `linear-gradient(90deg, ${category.color}, ${category.color}44)` }} />

      <Box sx={{ p: compact ? '12px 14px' : '16px 18px' }}>
        {/* Header row: org + save */}
        <Stack direction="row" sx={{ mb: 1.25, alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ minWidth: 0, flex: 1, alignItems: 'center' }}>
            {/* Org avatar */}
            <Avatar
              src={hunt.tenantLogo ?? undefined}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '10px',
                flexShrink: 0,
                bgcolor: `${category.color}18`,
                border: `1px solid ${category.color}30`,
                fontSize: 16,
              }}
            >
              {!hunt.tenantLogo && <span>{category.emoji}</span>}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'text.secondary',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {hunt.tenantName ?? 'Organization'}
                {hunt.isVerified && (
                  <Shield size={9} strokeWidth={2} style={{ color: t.info, marginLeft: 4, display: 'inline', verticalAlign: 'middle' }} />
                )}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {matchScore != null && <MatchRing score={matchScore} size={36} strokeWidth={3} />}
            <IconButton
              size="small"
              onClick={handleSave}
              title={saved ? 'Unsave' : 'Save'}
              disabled={saving}
              sx={{
                color: saved ? t.accent : 'text.secondary',
                p: 0.5,
                flexShrink: 0,
              }}
            >
              {saved
                ? <BookmarkCheck size={16} strokeWidth={2} />
                : <Bookmark size={16} strokeWidth={1.8} />}
            </IconButton>
          </Stack>
        </Stack>

        {/* Title */}
        <Typography
          variant="subtitle2"
          sx={{
            mb: 0.75,
            fontSize: compact ? 14 : 15,
            fontWeight: 800,
            color: 'text.primary',
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
          }}
        >
          {hunt.title}
        </Typography>

        {/* Description */}
        {!compact && hunt.story_context && (
          <Typography
            variant="body2"
            sx={{
              mb: 1.5,
              fontSize: 12,
              color: 'text.secondary',
              lineHeight: 1.55,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {hunt.story_context}
          </Typography>
        )}

        {/* Tags */}
        {!compact && hunt.tags?.length > 0 && (
          <Stack direction="row" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.625 }}>
            {hunt.tags.slice(0, 3).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{
                  fontSize: 10,
                  fontWeight: 600,
                  height: 20,
                  color: category.color,
                  bgcolor: `${category.color}14`,
                  borderRadius: '100px',
                  '& .MuiChip-label': { px: '8px' },
                }}
              />
            ))}
            {hunt.tags.length > 3 && (
              <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 500, color: 'text.secondary', alignSelf: 'center' }}>
                +{hunt.tags.length - 3}
              </Typography>
            )}
          </Stack>
        )}

        {/* Reward + meta row */}
        <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          {/* Cash reward */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: `${t.accent}14`, borderRadius: '8px', px: 1.25, py: 0.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: t.accent }}>${cash}</Typography>
          </Box>

          {/* XP */}
          <Stack direction="row" spacing={0.375} sx={{ alignItems: 'center' }}>
            <Zap size={11} strokeWidth={2} style={{ color: t.ai }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.ai }}>{xp} XP</Typography>
          </Stack>

          {/* Time */}
          <Stack direction="row" spacing={0.375} sx={{ alignItems: 'center' }}>
            <Clock size={11} strokeWidth={1.8} style={{ color: t.txtFaint }} />
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{hunt.estimated_time}</Typography>
          </Stack>

          {/* Distance */}
          {distanceKm != null && (
            <Stack direction="row" spacing={0.375} sx={{ alignItems: 'center' }}>
              <MapPin size={11} strokeWidth={1.8} style={{ color: t.txtFaint }} />
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Bottom row: badges */}
        <Stack direction="row" sx={{ mt: 1.25, alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
          {/* Difficulty */}
          <Chip
            label={diff.label}
            size="small"
            sx={{
              fontSize: 10,
              fontWeight: 700,
              height: 20,
              color: diff.color,
              bgcolor: diff.bg,
              borderRadius: '100px',
              '& .MuiChip-label': { px: '8px' },
            }}
          />

          {/* Mission type */}
          {typeMeta && (
            <Chip
              label={`${typeMeta.emoji} ${typeMeta.label}`}
              size="small"
              sx={{
                fontSize: 10,
                fontWeight: 600,
                height: 20,
                color: typeMeta.color,
                bgcolor: `${typeMeta.color}14`,
                borderRadius: '100px',
                '& .MuiChip-label': { px: '8px' },
              }}
            />
          )}

          {/* Deadline */}
          {dl && (
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: dl.color, ml: 'auto' }}>
              {dl.label}
            </Typography>
          )}

          {/* Spots */}
          {!dl && sl && (
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: sl.color, ml: 'auto' }}>
              {sl.label}
            </Typography>
          )}

          {/* Demand */}
          {demand && (
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: t.warning }}>
              {demand}
            </Typography>
          )}

          {/* Verification / mission status */}
          {(verificationStatus || missionStatus) && (
            <StatusPill status={verificationStatus ?? missionStatus!} />
          )}
        </Stack>
      </Box>
    </Card>
  );

  if (onClick) return inner;
  return <Link href={`/hunt/${hunt.id}`} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
}
