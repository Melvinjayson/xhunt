'use client';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Category chips */}
      {categories && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 0 2px', WebkitOverflowScrolling: 'touch' }}>
          {categories.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategory?.(cat.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: compact ? '5px 10px' : '7px 14px',
                  borderRadius: 100,
                  border: active ? `1.5px solid ${cat.color}` : `1px solid rgba(255,255,255,0.08)`,
                  background: active ? `${cat.color}18` : t.card,
                  color: active ? cat.color : t.txtDim,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Sort row */}
      {(sortOptions || onFilterSheet) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {sortOptions && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', flex: 1 }}>
              {sortOptions.map((s) => {
                const active = activeSort === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSort?.(s.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 10,
                      border: active ? `1px solid ${t.accent}60` : `1px solid rgba(255,255,255,0.06)`,
                      background: active ? `${t.accent}14` : 'rgba(255,255,255,0.03)',
                      color: active ? t.accent : t.txtFaint,
                      fontSize: 11,
                      fontWeight: active ? 700 : 500,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
          {onFilterSheet && (
            <button
              onClick={onFilterSheet}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 10,
                border: `1px solid rgba(255,255,255,0.10)`,
                background: t.card,
                color: t.txtDim,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <SlidersHorizontal size={13} strokeWidth={2} />
              Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
