'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import { SlidersHorizontal } from 'lucide-react';
import { t } from '@/theme/colors';
import type { Category } from '@/lib/missionCategories';

interface SortOption {
  id: string;
  label: string;
}

interface FilterBarProps {
  categories?: Category[];
  activeCategory?: string;
  onCategory?: (id: string) => void;
  sortOptions?: SortOption[];
  activeSort?: string;
  onSort?: (id: string) => void;
  onFilterSheet?: () => void;
  compact?: boolean;
}

export default function FilterBar({
  categories,
  activeCategory = 'all',
  onCategory,
  sortOptions,
  activeSort,
  onSort,
  onFilterSheet,
  compact = false,
}: FilterBarProps) {
  return (
    <Stack direction="column" spacing={1.25}>
      {/* Category chips */}
      {categories && (
        <Box sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          pb: 0.25,
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
          {categories.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <Chip
                key={cat.id}
                label={<><span>{cat.emoji}</span> {cat.label}</>}
                onClick={() => onCategory?.(cat.id)}
                size={compact ? 'small' : 'medium'}
                sx={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  fontWeight: active ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  ...(active ? {
                    bgcolor: `${cat.color}18`,
                    color: cat.color,
                    border: `1.5px solid ${cat.color}`,
                  } : {
                    bgcolor: t.card,
                    color: t.txtDim,
                    border: `1px solid rgba(255,255,255,0.08)`,
                  }),
                  borderRadius: '100px',
                  '&:hover': {
                    bgcolor: active ? `${cat.color}28` : 'rgba(255,255,255,0.06)',
                  },
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Sort row */}
      {(sortOptions || onFilterSheet) && (
        <Stack direction="row" alignItems="center" spacing={1}>
          {sortOptions && (
            <Box sx={{
              display: 'flex',
              gap: 0.75,
              overflowX: 'auto',
              flex: 1,
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}>
              {sortOptions.map((s) => {
                const active = activeSort === s.id;
                return (
                  <Chip
                    key={s.id}
                    label={s.label}
                    onClick={() => onSort?.(s.id)}
                    size="small"
                    sx={{
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      fontWeight: active ? 700 : 500,
                      fontSize: 11,
                      cursor: 'pointer',
                      borderRadius: '10px',
                      ...(active ? {
                        bgcolor: `${t.accent}14`,
                        color: t.accent,
                        border: `1px solid ${t.accent}60`,
                      } : {
                        bgcolor: 'rgba(255,255,255,0.03)',
                        color: t.txtFaint,
                        border: `1px solid rgba(255,255,255,0.06)`,
                      }),
                      '&:hover': {
                        bgcolor: active ? `${t.accent}20` : 'rgba(255,255,255,0.06)',
                      },
                    }}
                  />
                );
              })}
            </Box>
          )}
          {onFilterSheet && (
            <Chip
              icon={<SlidersHorizontal size={13} strokeWidth={2} />}
              label="Filters"
              onClick={onFilterSheet}
              size="small"
              sx={{
                flexShrink: 0,
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                borderRadius: '10px',
                bgcolor: t.card,
                color: t.txtDim,
                border: `1px solid rgba(255,255,255,0.10)`,
                '& .MuiChip-icon': { color: t.txtDim },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}
