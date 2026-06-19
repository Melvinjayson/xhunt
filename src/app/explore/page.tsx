'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import FilterBar from '@/components/consumer/FilterBar';
import MissionCard from '@/components/consumer/MissionCard';
import SectionHeader from '@/components/consumer/SectionHeader';
import EmptyState from '@/components/consumer/EmptyState';
import BottomSheet from '@/components/consumer/BottomSheet';
import CopilotFab from '@/components/consumer/CopilotFab';
import { t } from '@/theme/colors';
import { loadState } from '@/lib/store';
import { IMPACT_CATEGORIES, resolveCategory, deadlineLabel, estimateCashReward } from '@/lib/missionCategories';
import type { Hunt } from '@/lib/types';

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Best Match' },
  { id: 'reward',      label: 'Highest Reward' },
  { id: 'newest',      label: 'Newest' },
  { id: 'deadline',    label: 'Deadline Soon' },
  { id: 'spots',       label: 'Most Spots' },
];

const LOCATION_OPTS = ['All', 'Remote', 'Local', 'Hybrid'];
const DIFFICULTY_OPTS = ['All', 'Entry Level', 'Professional', 'Expert'];
const DIFF_MAP: Record<string, Hunt['difficulty']> = { 'Entry Level': 'easy', 'Professional': 'medium', 'Expert': 'hard' };

function sortMissions(missions: Hunt[], sort: string): Hunt[] {
  const copy = [...missions];
  switch (sort) {
    case 'reward':   return copy.sort((a, b) => estimateCashReward(b.cashReward, b.difficulty, b.missionType) - estimateCashReward(a.cashReward, a.difficulty, a.missionType));
    case 'newest':   return copy.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    case 'deadline': return copy.sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
    case 'spots':    return copy.sort((a, b) => (b.spotsRemaining ?? 99) - (a.spotsRemaining ?? 99));
    default:         return copy;
  }
}

function filterMissions(missions: Hunt[], opts: { category: string; location: string; difficulty: string; query: string }): Hunt[] {
  return missions.filter((h) => {
    if (opts.category !== 'all') {
      if (resolveCategory(h.tags ?? [], h.category).id !== opts.category) return false;
    }
    if (opts.location !== 'All') {
      const loc = opts.location.toLowerCase() as Hunt['locationType'];
      if (h.locationType && h.locationType !== loc) return false;
    }
    if (opts.difficulty !== 'All') {
      const d = DIFF_MAP[opts.difficulty];
      if (d && h.difficulty !== d) return false;
    }
    if (opts.query) {
      const q = opts.query.toLowerCase();
      if (!h.title.toLowerCase().includes(q) && !(h.story_context ?? '').toLowerCase().includes(q) && !(h.tags ?? []).join(' ').toLowerCase().includes(q) && !(h.tenantName ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function SectionRail({ title, missions, onSeeAll }: { title: string; missions: Hunt[]; onSeeAll?: () => void }) {
  if (!missions.length) return null;
  return (
    <section style={{ marginBottom: 28 }}>
      <SectionHeader title={title} count={missions.length} onSeeAll={onSeeAll} />
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', padding: '2px 0 4px' }}>
        {missions.slice(0, 8).map((h) => (
          <div key={h.id} style={{ width: 'min(288px, calc(85vw))', flexShrink: 0 }}>
            <MissionCard hunt={h} compact />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ExplorePage() {
  const [allMissions, setAll]     = useState<Hunt[]>([]);
  const [recs, setRecs]           = useState<Hunt[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [category, setCategory]   = useState('all');
  const [sort, setSort]           = useState('recommended');
  const [location, setLocation]   = useState('All');
  const [difficulty, setDiff]     = useState('All');
  const [filterOpen, setFilter]   = useState(false);
  const [locDraft, setLocDraft]   = useState('All');
  const [diffDraft, setDiffDraft] = useState('All');

  useEffect(() => {
    const base = loadState().hunts ?? [];
    setAll(base);
    fetch('/api/recommendations?limit=8')
      .then(r => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.recommendations ?? d.hunts ?? []);
        setRecs(list);
        if (base.length === 0 && list.length > 0) setAll(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    if (base.length > 0) setLoading(false);
  }, []);

  const filtered = useCallback(
    () => sortMissions(filterMissions(allMissions, { category, location, difficulty, query }), sort),
    [allMissions, category, location, difficulty, query, sort]
  )();

  const isFiltering = query.length > 0 || category !== 'all';
  const trending    = sortMissions(allMissions.filter(h => (h.applicationCount ?? 0) >= 5), 'recommended').slice(0, 8);
  const newest      = sortMissions(allMissions, 'newest').slice(0, 8);
  const highReward  = sortMissions(allMissions, 'reward').slice(0, 8);
  const urgent      = allMissions.filter(h => { const dl = deadlineLabel(h.deadline); return dl && dl.label.includes('d left') && parseInt(dl.label) <= 7; }).slice(0, 8);

  return (
    <div className="consumer-app" style={{ background: t.bg, minHeight: '100vh' }}>
      <div className="consumer-app-inner">

        {/* Sticky search header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: `${t.bg}F0`, backdropFilter: 'blur(16px)', padding: '14px 20px 12px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} strokeWidth={2} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: t.txtFaint, pointerEvents: 'none' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search missions, organizations, causes..."
              style={{ width: '100%', height: 48, paddingLeft: 42, paddingRight: query ? 40 : 16, borderRadius: 14, border: `1px solid ${t.border}`, background: t.card, color: t.txt, fontSize: 14, fontFamily: 'var(--font-onest, system-ui)', outline: 'none', boxSizing: 'border-box' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: t.txtFaint }}>
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ marginBottom: 20 }}>
            <FilterBar categories={IMPACT_CATEGORIES} activeCategory={category} onCategory={setCategory} sortOptions={SORT_OPTIONS} activeSort={sort} onSort={setSort} onFilterSheet={() => setFilter(true)} />
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 180, borderRadius: 20, background: t.card, border: `1px solid ${t.border}`, opacity: 0.6 }} className="breathe" />)}
            </div>
          ) : isFiltering ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filtered.length > 0 ? (
                <>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: t.txtFaint }}>{filtered.length} mission{filtered.length !== 1 ? 's' : ''} found</p>
                  {filtered.map(h => <MissionCard key={h.id} hunt={h} />)}
                </>
              ) : (
                <EmptyState emoji="🔍" title="No missions found" description="Try adjusting your search or filters." action={{ label: 'Clear filters', onClick: () => { setQuery(''); setCategory('all'); } }} />
              )}
            </div>
          ) : (
            <>
              {recs.length > 0 && <SectionRail title="Recommended for You" missions={recs} />}
              {trending.length > 0 && <SectionRail title="Trending Now" missions={trending} />}
              {urgent.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  <SectionHeader title="Closing Soon" count={urgent.length} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {urgent.slice(0, 3).map(h => <MissionCard key={h.id} hunt={h} />)}
                  </div>
                </section>
              )}
              {highReward.length > 0 && <SectionRail title="High Reward" missions={highReward} />}
              {newest.length > 0 && <SectionRail title="New Missions" missions={newest} />}
              {['climate','education','tech','future-of-work','health'].map(catId => {
                const cat = IMPACT_CATEGORIES.find(c => c.id === catId);
                if (!cat) return null;
                const ms = allMissions.filter(h => resolveCategory(h.tags ?? [], h.category).id === catId).slice(0, 6);
                if (ms.length < 2) return null;
                return <SectionRail key={catId} title={`${cat.emoji} ${cat.label}`} missions={ms} onSeeAll={() => setCategory(catId)} />;
              })}
              {allMissions.length === 0 && <EmptyState emoji="🌍" title="No missions yet" description="Missions from organizations will appear here. Check back soon!" />}
            </>
          )}
        </div>
      </div>

      <BottomSheet isOpen={filterOpen} onClose={() => setFilter(false)} title="Filters">
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LOCATION_OPTS.map(opt => (
                <button key={opt} onClick={() => setLocDraft(opt)} style={{ padding: '7px 16px', borderRadius: 100, border: `1.5px solid ${locDraft === opt ? t.accent : t.border}`, background: locDraft === opt ? `${t.accent}18` : t.card, color: locDraft === opt ? t.accent : t.txtDim, fontSize: 13, fontWeight: locDraft === opt ? 700 : 500, cursor: 'pointer' }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Difficulty</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DIFFICULTY_OPTS.map(opt => (
                <button key={opt} onClick={() => setDiffDraft(opt)} style={{ padding: '7px 16px', borderRadius: 100, border: `1.5px solid ${diffDraft === opt ? t.ai : t.border}`, background: diffDraft === opt ? `${t.ai}18` : t.card, color: diffDraft === opt ? t.ai : t.txtDim, fontSize: 13, fontWeight: diffDraft === opt ? 700 : 500, cursor: 'pointer' }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setLocDraft('All'); setDiffDraft('All'); }} style={{ flex: 1, height: 46, borderRadius: 14, background: t.card, border: `1px solid ${t.border}`, color: t.txtDim, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Clear All</button>
            <button onClick={() => { setLocation(locDraft); setDiff(diffDraft); setFilter(false); }} style={{ flex: 2, height: 46, borderRadius: 14, background: t.accent, color: t.bg, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none' }}>Apply Filters</button>
          </div>
        </div>
      </BottomSheet>

      <CopilotFab />
      <BottomNav />
    </div>
  );
}
