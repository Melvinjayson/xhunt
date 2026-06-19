'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Coins, Activity, ShieldCheck, TrendingUp,
  CheckCircle2, Clock, XCircle, Award, Users,
  Link2, ArrowUpRight, Plus, RefreshCw, ArrowLeftRight
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';

interface ContributionItem {
  id: string;
  contribution_type: string;
  description: string | null;
  value_points: number;
  status: string;
  created_at: string;
}

interface ContributionSummary {
  total_contributions: number;
  total_value_points: number;
  validated_contributions: number;
  pending_validations: number;
}

interface TrustProfile {
  reliability_score: number;
  skill_score: number;
  ethical_score: number;
  domain_expertise_score: number;
  composite_score: number;
}

interface MatchResult {
  id: string;
  mission_title: string;
  match_score: number;
  skill_match: number;
  trust_match: number;
  status: string;
}

interface BarterStat {
  totalListings: number;
  activeListings: number;
  completedTrades: number;
  pointsTransferred: number;
  byType: Record<string, number>;
}

interface RecentTrade {
  id: string;
  initiator_gave: { type: string; amount?: number; badge_label?: string; skill?: string; hours?: number; description?: string };
  responder_gave: { type: string; amount?: number; badge_label?: string; skill?: string; hours?: number; description?: string };
  completed_at: string;
}

type TabId = 'overview' | 'contributions' | 'trust' | 'matches' | 'barter';

const CONTRIBUTION_TYPE_LABELS: Record<string, string> = {
  mission_completion: 'Mission Completed',
  peer_review:        'Peer Review',
  content_creation:   'Content Created',
  skill_verification: 'Skill Verified',
  community_vote:     'Community Vote',
  governance_action:  'Governance Action',
  knowledge_contribution: 'Knowledge Added',
  mentorship:         'Mentorship',
};

export default function WorkspaceEconomyPage() {
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [summary, setSummary] = useState<ContributionSummary | null>(null);
  const [trust, setTrust] = useState<TrustProfile | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [barterStats, setBarterStats] = useState<BarterStat | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [cSumRes, cRes, tRes, mRes, barterRes] = await Promise.all([
          fetch('/api/economy/contributions?summary=true'),
          fetch('/api/economy/contributions?limit=10'),
          fetch('/api/economy/trust'),
          fetch('/api/economy/match'),
          fetch('/api/economy/barter?view=transactions'),
        ]);
        const [cSum, c, tData, m, barterData] = await Promise.all([
          cSumRes.json(), cRes.json(), tRes.json(), mRes.json(), barterRes.json(),
        ]);
        setSummary(cSum.summary ?? null);
        setContributions(c.contributions ?? []);
        setTrust(tData.profile ?? null);
        setMatches(m.matches ?? []);
        setRecentTrades(Array.isArray(barterData) ? barterData.slice(0, 8) : []);
        setBarterStats({
          totalListings: 0, activeListings: 0, completedTrades: Array.isArray(barterData) ? barterData.length : 0,
          pointsTransferred: 0, byType: {}
        });
      } catch (err) {
        console.error('[economy]', err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const trustPct = trust ? Math.round(trust.composite_score * 100) : null;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${t.warning}1A`, border: `1px solid ${t.warning}33` }}>
              <Coins size={17} strokeWidth={1.8} style={{ color: t.warning }} />
            </div>
            <div>
              <h1 className="text-[24px] font-bold leading-tight" style={{ color: t.txt }}>Economy</h1>
              <p className="text-[11px]" style={{ color: t.txtFaint }}>Your participation ledger</p>
            </div>
          </div>
          <p className="text-[13px]" style={{ color: t.txtDim }}>
            Every contribution you make is tracked, validated, and rewarded fairly
          </p>
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Contributions', value: summary?.total_contributions ?? '—', icon: Activity, color: t.accent },
          { label: 'Value Points', value: summary?.total_value_points ?? '—', icon: TrendingUp, color: t.ai },
          { label: 'Validated', value: summary?.validated_contributions ?? '—', icon: CheckCircle2, color: t.accent },
          { label: 'Trust Score', value: trustPct != null ? `${trustPct}%` : '—', icon: ShieldCheck, color: t.warning },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl px-4 py-4" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={13} strokeWidth={1.8} style={{ color }} />
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: t.txtFaint }}>{label}</p>
            </div>
            <p className="text-[20px] font-bold" style={{ color: t.txt }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['overview', 'contributions', 'trust', 'matches', 'barter'] as TabId[]).map((tabId) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={cn(
              'px-4 h-9 rounded-xl text-[13px] font-semibold transition-all capitalize',
              tab === tabId ? 'bg-accent' : 'border transition-colors'
            )}
            style={tab === tabId
              ? { color: t.bg }
              : { color: t.txtDim, borderColor: t.panel }
            }
          >
            {tabId === 'matches' ? 'Opportunity Matches' : tabId === 'barter' ? 'Barter Exchange' : tabId}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'overview' ? (
        <OverviewTab contributions={contributions} summary={summary} trust={trust} matches={matches} />
      ) : tab === 'contributions' ? (
        <ContributionsTab contributions={contributions} />
      ) : tab === 'trust' ? (
        <TrustTab trust={trust} />
      ) : tab === 'matches' ? (
        <MatchesTab matches={matches} />
      ) : tab === 'barter' ? (
        <BarterTab stats={barterStats} trades={recentTrades} />
      ) : null}
    </div>
  );
}

function OverviewTab({ contributions, summary, trust, matches }: {
  contributions: ContributionItem[];
  summary: ContributionSummary | null;
  trust: TrustProfile | null;
  matches: MatchResult[];
}) {
  return (
    <div className="space-y-6">
      {/* Progress rings row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Validation rate */}
        <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: t.txtFaint }}>Validation Rate</p>
          {summary && summary.total_contributions > 0 ? (
            <>
              <p className="text-[32px] font-bold text-accent leading-none">
                {Math.round((summary.validated_contributions / summary.total_contributions) * 100)}%
              </p>
              <p className="text-[11px] mt-1" style={{ color: t.txtDim }}>
                {summary.validated_contributions} of {summary.total_contributions} validated
              </p>
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: t.card }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(summary.validated_contributions / summary.total_contributions) * 100}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-accent rounded-full"
                />
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: t.txtFaint }}>No data yet</p>
          )}
        </div>

        {/* Trust score */}
        <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: t.txtFaint }}>Composite Trust</p>
          {trust ? (
            <>
              <p className="text-[32px] font-bold leading-none" style={{ color: t.warning }}>
                {(trust.composite_score * 100).toFixed(1)}%
              </p>
              <p className="text-[11px] mt-1" style={{ color: t.txtDim }}>Weighted across 4 dimensions</p>
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: t.card }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${trust.composite_score * 100}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: t.warning }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: t.txtFaint }}>No trust data</p>
          )}
        </div>

        {/* Matches */}
        <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: t.txtFaint }}>Opportunity Matches</p>
          <p className="text-[32px] font-bold leading-none" style={{ color: t.ai }}>{matches.length}</p>
          <p className="text-[11px] mt-1" style={{ color: t.txtDim }}>
            {matches.filter((m) => m.match_score >= 0.7).length} high-quality matches
          </p>
        </div>
      </div>

      {/* Recent contributions */}
      <div className="rounded-2xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${t.panel}` }}>
          <p className="text-[14px] font-bold" style={{ color: t.txt }}>Recent Contributions</p>
        </div>
        {contributions.length === 0 ? (
          <div className="py-12 text-center">
            <Activity size={28} className="mx-auto mb-2" strokeWidth={1.5} style={{ color: t.txtFaint }} />
            <p className="text-sm" style={{ color: t.txtFaint }}>No contributions yet</p>
            <p className="text-[12px] mt-1" style={{ color: t.txtFaint }}>Complete missions and collaborate to earn value points</p>
          </div>
        ) : (
          <div style={{ borderTop: `0px` }}>
            {contributions.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: `1px solid ${t.panel}` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                  background: item.status === 'validated' ? `${t.accent}1A` : item.status === 'pending' ? `${t.warning}1A` : `${t.error}1A`
                }}>
                  {item.status === 'validated' ? (
                    <CheckCircle2 size={13} className="text-accent" strokeWidth={2} />
                  ) : item.status === 'pending' ? (
                    <Clock size={13} strokeWidth={2} style={{ color: t.warning }} />
                  ) : (
                    <XCircle size={13} strokeWidth={2} style={{ color: t.error }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: t.txt }}>
                    {CONTRIBUTION_TYPE_LABELS[item.contribution_type] ?? item.contribution_type}
                  </p>
                  {item.description && (
                    <p className="text-[11px] truncate" style={{ color: t.txtFaint }}>{item.description}</p>
                  )}
                </div>
                <span className="text-[13px] font-bold text-accent flex-shrink-0">+{item.value_points}</span>
                <span className="text-[11px] flex-shrink-0" style={{ color: t.txtFaint }}>
                  {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top match preview */}
      {matches.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${t.panel}` }}>
            <p className="text-[14px] font-bold" style={{ color: t.txt }}>Top Opportunity Matches</p>
          </div>
          <div>
            {matches.slice(0, 3).map((match) => (
              <div key={match.id} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: `1px solid ${t.panel}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${t.ai}1A`, border: `1px solid ${t.ai}33` }}>
                  <Award size={15} strokeWidth={1.8} style={{ color: t.aiLight }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: t.txt }}>{match.mission_title}</p>
                  <p className="text-[11px]" style={{ color: t.txtFaint }}>
                    Skill: {Math.round(match.skill_match * 100)}% · Trust: {Math.round(match.trust_match * 100)}%
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[14px] font-bold text-accent">{Math.round(match.match_score * 100)}%</p>
                  <p className="text-[10px]" style={{ color: t.txtFaint }}>match</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContributionsTab({ contributions }: { contributions: ContributionItem[] }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
      <div className="grid grid-cols-[2fr_1fr_80px_80px_100px] gap-4 px-5 py-3" style={{ borderBottom: `1px solid ${t.panel}` }}>
        {['Contribution', 'Type', 'Points', 'Status', 'Date'].map((h) => (
          <span key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>{h}</span>
        ))}
      </div>
      {contributions.length === 0 ? (
        <div className="py-16 text-center">
          <Activity size={28} className="mx-auto mb-2" strokeWidth={1.5} style={{ color: t.txtFaint }} />
          <p className="text-sm" style={{ color: t.txtFaint }}>No contributions yet</p>
        </div>
      ) : (
        <div>
          {contributions.map((item) => (
            <div key={item.id} className="grid grid-cols-[2fr_1fr_80px_80px_100px] gap-4 items-center px-5 py-3" style={{ borderBottom: `1px solid ${t.panel}` }}>
              <div className="min-w-0">
                <p className="text-[13px] truncate" style={{ color: t.txt }}>
                  {item.description ?? CONTRIBUTION_TYPE_LABELS[item.contribution_type] ?? item.contribution_type}
                </p>
              </div>
              <span className="text-[11px] capitalize" style={{ color: t.txtDim }}>
                {(CONTRIBUTION_TYPE_LABELS[item.contribution_type] ?? item.contribution_type).split(' ')[0]}
              </span>
              <span className="text-[13px] font-bold text-accent">+{item.value_points}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full self-start" style={
                item.status === 'validated'
                  ? { color: t.accent, background: `${t.accent}1A` }
                  : item.status === 'pending'
                  ? { color: t.warning, background: `${t.warning}1A` }
                  : { color: t.error, background: `${t.error}1A` }
              }>
                {item.status}
              </span>
              <span className="text-[11px]" style={{ color: t.txtFaint }}>
                {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrustTab({ trust }: { trust: TrustProfile | null }) {
  if (!trust) {
    return (
      <div className="py-24 text-center rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
        <ShieldCheck size={36} className="mx-auto mb-3" strokeWidth={1.5} style={{ color: t.txtFaint }} />
        <p style={{ color: t.txtDim }}>No trust profile yet</p>
        <p className="text-sm mt-1" style={{ color: t.txtFaint }}>Complete contributions and earn peer validations to build trust</p>
      </div>
    );
  }

  const dimensions = [
    { key: 'reliability_score', label: 'Reliability', weight: '35%', value: trust.reliability_score, color: t.accent,
      description: 'Consistent delivery, follow-through on commitments' },
    { key: 'skill_score', label: 'Skill', weight: '30%', value: trust.skill_score, color: t.ai,
      description: 'Demonstrated competence and knowledge depth' },
    { key: 'ethical_score', label: 'Ethical', weight: '25%', value: trust.ethical_score, color: t.accent,
      description: 'Honest, fair, and beneficial conduct' },
    { key: 'domain_expertise_score', label: 'Domain Expertise', weight: '10%', value: trust.domain_expertise_score, color: t.warning,
      description: 'Specialized knowledge in your focus areas' },
  ];

  return (
    <div className="space-y-5">
      {/* Composite score */}
      <div className="rounded-2xl p-6 flex items-center gap-6" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
        <div className="flex-shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: t.txtFaint }}>Composite Trust Score</p>
          <p className="text-[48px] font-bold text-accent leading-none">{(trust.composite_score * 100).toFixed(1)}%</p>
        </div>
        <div className="flex-1">
          <div className="h-3 rounded-full overflow-hidden" style={{ background: t.card }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${trust.composite_score * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(to right, ${t.accent}, ${t.ai})` }}
            />
          </div>
          <p className="text-[11px] mt-2" style={{ color: t.txtFaint }}>
            Weighted composite of 4 dimensions · Updates as peers validate your work
          </p>
        </div>
      </div>

      {/* Dimension breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dimensions.map(({ label, weight, value, color, description }) => (
          <div key={label} className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[13px] font-bold" style={{ color: t.txt }}>{label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>{description}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-[22px] font-bold leading-none" style={{ color }}>
                  {(value * 100).toFixed(0)}
                </p>
                <p className="text-[9px]" style={{ color: t.txtFaint }}>weight: {weight}</p>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: t.card }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value * 100}%` }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarterTab({ stats, trades }: { stats: BarterStat | null; trades: RecentTrade[] }) {
  function fmtAsset(val: RecentTrade['initiator_gave']): string {
    switch (val.type) {
      case 'points': return `${(val.amount ?? 0).toLocaleString()} pts`;
      case 'badge': return val.badge_label ?? 'Badge';
      case 'skill_session': return `${val.hours ?? 1}h ${val.skill ?? 'Session'}`;
      default: return val.description ?? val.type;
    }
  }

  const typeIcon: Record<string, string> = {
    points: '⚡', badge: '🏅', skill_session: '🧠', coupon: '🎟️', benefit: '🎁', open: '🤝'
  };

  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Listings', value: stats?.activeListings ?? 0, color: t.accent },
          { label: 'Completed Trades', value: stats?.completedTrades ?? 0, color: t.ai },
          { label: 'Pts Transferred', value: stats?.pointsTransferred ?? 0, color: t.warning },
          { label: 'Total Listings', value: stats?.totalListings ?? 0, color: t.txt },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl px-4 py-4" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: t.txtFaint }}>{label}</p>
            <p className="text-[22px] font-bold" style={{ color }}>{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* By-type breakdown */}
      {stats?.byType && Object.keys(stats.byType).length > 0 && (
        <div className="rounded-xl p-5" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: t.txtFaint }}>Listings by Asset Type</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byType).map(([type, count]) => (
              <span key={type} className="text-[12px] font-semibold px-3 py-1.5 rounded-xl" style={{ background: `${t.ai}18`, color: t.aiLight }}>
                {typeIcon[type] ?? '🔄'} {type.replace('_', ' ')} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent trades */}
      <div className="rounded-xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: t.panel }}>
          <ArrowLeftRight size={14} style={{ color: t.ai }} strokeWidth={2} />
          <p className="text-[13px] font-bold" style={{ color: t.txt }}>My Recent Trades</p>
        </div>
        {trades.length === 0 ? (
          <div className="py-12 text-center">
            <ArrowLeftRight size={24} className="mx-auto mb-2" style={{ color: t.txtFaint }} strokeWidth={1.5} />
            <p className="font-medium" style={{ color: t.txtDim }}>No trades yet</p>
            <p className="text-sm mt-1" style={{ color: t.txtFaint }}>
              Visit the{' '}
              <a href="/barter" className="underline" style={{ color: t.accent }}>Barter Exchange</a>
              {' '}to start trading.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-color': t.panel } as React.CSSProperties}>
            {trades.map((trade) => (
              <div key={trade.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="text-[18px]">{typeIcon[trade.initiator_gave.type] ?? '🔄'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold" style={{ color: t.txt }}>
                    Gave: {fmtAsset(trade.initiator_gave)}
                  </p>
                  <p className="text-[11px]" style={{ color: t.txtDim }}>
                    Received: {fmtAsset(trade.responder_gave)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: `${t.ai}18`, color: t.aiLight }}>
                    Completed
                  </span>
                  <p className="text-[10px] mt-1" style={{ color: t.txtFaint }}>
                    {new Date(trade.completed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA to consumer barter page */}
      <a
        href="/barter"
        className="flex items-center justify-between px-5 py-4 rounded-xl transition-opacity hover:opacity-80"
        style={{ background: `${t.ai}12`, border: `1px solid ${t.ai}30` }}
      >
        <div>
          <p className="text-[13px] font-bold" style={{ color: t.aiLight }}>Open Barter Exchange</p>
          <p className="text-[11px]" style={{ color: t.txtDim }}>Trade points, badges, and skills with the community</p>
        </div>
        <ArrowLeftRight size={18} style={{ color: t.ai }} strokeWidth={1.8} />
      </a>
    </div>
  );
}

function MatchesTab({ matches }: { matches: MatchResult[] }) {
  const [recomputing, setRecomputing] = useState(false);

  async function recompute() {
    setRecomputing(true);
    try {
      await fetch('/api/economy/match?recompute=true');
    } catch (err) {
      console.error('[recompute]', err);
    } finally {
      setRecomputing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px]" style={{ color: t.txtDim }}>{matches.length} opportunities matched to your profile</p>
        <button
          onClick={recompute}
          disabled={recomputing}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium hover:border-accent/30 hover:text-accent transition-colors disabled:opacity-50"
          style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txtDim }}
        >
          <RefreshCw size={12} className={recomputing ? 'animate-spin' : ''} strokeWidth={2} />
          Recompute
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="py-24 text-center rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
          <Users size={36} className="mx-auto mb-3" strokeWidth={1.5} style={{ color: t.txtFaint }} />
          <p style={{ color: t.txtDim }}>No matches computed yet</p>
          <p className="text-sm mt-1" style={{ color: t.txtFaint }}>Update your match signals to find opportunities</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((match) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 transition-colors"
              style={{ background: t.surface, border: `1px solid ${t.panel}` }}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-[14px] font-bold flex-1 pr-3" style={{ color: t.txt }}>{match.mission_title}</p>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[20px] font-bold text-accent leading-none">{Math.round(match.match_score * 100)}%</p>
                  <p className="text-[10px]" style={{ color: t.txtFaint }}>match</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Skill', value: match.skill_match, color: t.ai },
                  { label: 'Trust', value: match.trust_match, color: t.warning },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span style={{ color: t.txtFaint }}>{label}</span>
                      <span style={{ color }}>{Math.round(value * 100)}%</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: t.card }}>
                      <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={
                    match.status === 'accepted' ? { color: t.accent, background: 'rgba(34,255,170,0.1)' } :
                    match.status === 'pending'  ? { color: t.warning, background: 'rgba(255,184,77,0.1)' } :
                    { color: t.txtDim, background: t.card }
                  }
                >
                  {match.status}
                </span>
                <ArrowUpRight size={14} strokeWidth={1.8} style={{ color: t.txtFaint }} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
