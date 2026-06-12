'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Coins, Activity, ShieldCheck, Users, TrendingUp,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Scale
} from 'lucide-react';
import { cn } from '@/lib/cn';

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

interface GovernanceAction {
  id: string;
  action_type: string;
  rationale: string;
  is_reversed: boolean;
  created_at: string;
}

type TabId = 'overview' | 'contributions' | 'trust' | 'governance';

export default function AdminEconomyPage() {
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [contribSummary, setContribSummary] = useState<ContributionSummary | null>(null);
  const [trustProfile, setTrustProfile] = useState<TrustProfile | null>(null);
  const [govActions, setGovActions] = useState<GovernanceAction[]>([]);

  useEffect(() => {
    async function load() {
      const [cRes, tRes, gRes] = await Promise.all([
        fetch('/api/economy/contributions?summary=true'),
        fetch('/api/economy/trust'),
        fetch('/api/economy/governance'),
      ]);
      const c = await cRes.json();
      const t = await tRes.json();
      const g = await gRes.json();
      setContribSummary(c.summary ?? null);
      setTrustProfile(t.profile ?? null);
      setGovActions(g.actions ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/20 flex items-center justify-center">
              <Coins size={16} className="text-[#fbbf24]" strokeWidth={1.8} />
            </div>
            <h1 className="text-[28px] font-bold text-[#e8f0fe]">Economy Protocol</h1>
          </div>
          <p className="text-[#7a8fa8] text-sm">
            Decentralized participation economy — contributions, trust, identity & coordination
          </p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Contributions', value: contribSummary?.total_contributions ?? '—', icon: Activity, color: 'text-accent' },
          { label: 'Value Points', value: contribSummary?.total_value_points ?? '—', icon: TrendingUp, color: 'text-[#6D5DFD]' },
          { label: 'Validated', value: contribSummary?.validated_contributions ?? '—', icon: CheckCircle2, color: 'text-[#34d399]' },
          { label: 'Trust Score', value: trustProfile?.composite_score != null ? (trustProfile.composite_score * 100).toFixed(0) + '%' : '—', icon: ShieldCheck, color: 'text-[#fbbf24]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#111927] border border-[#1c2a3a] rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={color} strokeWidth={1.8} />
              <p className="text-[10px] font-bold text-[#3d5068] uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-[22px] font-bold text-[#e8f0fe]">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['overview', 'contributions', 'trust', 'governance'] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 h-9 rounded-xl text-[13px] font-semibold transition-all capitalize',
              tab === t ? 'bg-accent text-[#060a0e]' : 'bg-[#111927] text-[#7a8fa8] border border-[#1c2a3a] hover:border-[#2a3f58]'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'overview' ? (
        <EconomyOverview contribSummary={contribSummary} trustProfile={trustProfile} govActions={govActions} />
      ) : tab === 'contributions' ? (
        <ContributionsPanel />
      ) : tab === 'trust' ? (
        <TrustPanel profile={trustProfile} />
      ) : (
        <GovernancePanel actions={govActions} />
      )}
    </div>
  );
}

function EconomyOverview({ contribSummary, trustProfile, govActions }: {
  contribSummary: ContributionSummary | null;
  trustProfile: TrustProfile | null;
  govActions: GovernanceAction[];
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Constitutional Principles */}
      <div className="xl:col-span-2 bg-[#111927] border border-[#1c2a3a] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={16} className="text-[#A99FFE]" strokeWidth={1.8} />
          <p className="text-[14px] font-bold text-[#e8f0fe]">Constitutional Principles</p>
        </div>
        <div className="space-y-3">
          {[
            { principle: 'Human agency takes precedence over optimization objectives', status: 'enforced' },
            { principle: 'Trust is the platform\'s most valuable asset', status: 'enforced' },
            { principle: 'Neither financial nor impact materiality may be ignored', status: 'enforced' },
            { principle: 'Recommendations must be relevant, explainable, fair, and beneficial', status: 'monitored' },
            { principle: 'Fairness means maximizing opportunity, not reinforcing advantages', status: 'monitored' },
            { principle: 'Engage for value, not for engagement itself', status: 'enforced' },
          ].map(({ principle, status }) => (
            <div key={principle} className="flex items-start gap-3">
              <CheckCircle2 size={13} className={status === 'enforced' ? 'text-accent flex-shrink-0 mt-0.5' : 'text-[#fbbf24] flex-shrink-0 mt-0.5'} strokeWidth={2} />
              <p className="text-[12px] text-[#7a8fa8] leading-relaxed">{principle}</p>
              <span className={cn(
                'text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-auto',
                status === 'enforced' ? 'text-accent bg-accent/10' : 'text-[#fbbf24] bg-[#fbbf24]/10'
              )}>
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Profile */}
      <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-[#fbbf24]" strokeWidth={1.8} />
          <p className="text-[14px] font-bold text-[#e8f0fe]">Trust Dimensions</p>
        </div>
        {trustProfile ? (
          <div className="space-y-4">
            {[
              { label: 'Reliability', value: trustProfile.reliability_score, color: '#22FFAA' },
              { label: 'Skill', value: trustProfile.skill_score, color: '#6D5DFD' },
              { label: 'Ethical', value: trustProfile.ethical_score, color: '#34d399' },
              { label: 'Domain Expertise', value: trustProfile.domain_expertise_score, color: '#fbbf24' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#7a8fa8]">{label}</span>
                  <span className="text-[#e8f0fe]">{(value * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-[#0f1824] rounded-full overflow-hidden">
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
            <div className="pt-3 border-t border-[#1c2a3a]">
              <div className="flex justify-between text-[12px]">
                <span className="text-[#7a8fa8] font-medium">Composite</span>
                <span className="text-accent font-bold">{(trustProfile.composite_score * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[#3d5068] text-sm text-center py-8">No trust data yet</p>
        )}
      </div>

      {/* Recent governance */}
      <div className="xl:col-span-3 bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1c2a3a]">
          <p className="text-[14px] font-bold text-[#e8f0fe]">Recent Governance Actions</p>
        </div>
        {govActions.length === 0 ? (
          <div className="py-12 text-center">
            <Scale size={28} className="text-[#3d5068] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[#7a8fa8] text-sm">No governance actions recorded</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1c2a3a]">
            {govActions.slice(0, 5).map((action) => (
              <div key={action.id} className="flex items-center gap-4 px-5 py-3">
                {action.is_reversed ? (
                  <XCircle size={13} className="text-[#ff5252] flex-shrink-0" strokeWidth={2} />
                ) : (
                  <CheckCircle2 size={13} className="text-accent flex-shrink-0" strokeWidth={2} />
                )}
                <span className="text-[12px] font-semibold text-[#e8f0fe] capitalize">{action.action_type.replace(/_/g, ' ')}</span>
                <span className="text-[12px] text-[#7a8fa8] truncate flex-1">{action.rationale}</span>
                <span className="text-[11px] text-[#3d5068] flex-shrink-0">
                  {new Date(action.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type ContribRow = { id: string; contribution_type: string; value_points: number; status: string; created_at: string };

function ContributionsPanel() {
  const [items, setItems] = useState<ContribRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/economy/contributions?limit=20')
      .then((r) => r.json())
      .then((d) => { setItems(d.contributions ?? []); setLoading(false); });
  }, []);

  if (loading) return <div className="py-16 flex justify-center"><div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#1c2a3a]">
        {['ID', 'Type', 'Points', 'Status', 'Date'].map((h) => (
          <span key={h} className="text-[10px] font-bold text-[#3d5068] uppercase tracking-wider">{h}</span>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="py-16 text-center">
          <Activity size={28} className="text-[#3d5068] mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[#7a8fa8] text-sm">No contributions yet</p>
        </div>
      ) : (
        <div className="divide-y divide-[#1c2a3a]">
          {items.map((item: ContribRow) => (
            <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center px-5 py-3">
              <span className="text-[11px] font-mono text-[#7a8fa8] truncate">{item.id}</span>
              <span className="text-[12px] text-[#e8f0fe] capitalize">{item.contribution_type.replace(/_/g, ' ')}</span>
              <span className="text-[12px] font-bold text-accent">{item.value_points}</span>
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full self-start',
                item.status === 'validated' ? 'text-accent bg-accent/10' :
                item.status === 'pending' ? 'text-[#fbbf24] bg-[#fbbf24]/10' : 'text-[#ff5252] bg-[#ff5252]/10'
              )}>
                {item.status}
              </span>
              <span className="text-[11px] text-[#3d5068]">
                {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrustPanel({ profile }: { profile: TrustProfile | null }) {
  return (
    <div className="space-y-6">
      {profile ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-6">
            <p className="text-[13px] font-bold text-[#e8f0fe] mb-4">Trust Score Breakdown</p>
            <div className="space-y-5">
              {[
                { label: 'Reliability', value: profile.reliability_score, weight: '35%', color: '#22FFAA' },
                { label: 'Skill', value: profile.skill_score, weight: '30%', color: '#6D5DFD' },
                { label: 'Ethical', value: profile.ethical_score, weight: '25%', color: '#34d399' },
                { label: 'Domain Expertise', value: profile.domain_expertise_score, weight: '10%', color: '#fbbf24' },
              ].map(({ label, value, weight, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span className="text-[#7a8fa8]">{label} <span className="text-[#3d5068]">({weight})</span></span>
                    <span className="font-bold" style={{ color }}>{(value * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-[#0f1824] rounded-full overflow-hidden">
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
            <div className="mt-5 pt-4 border-t border-[#1c2a3a] flex items-center justify-between">
              <span className="text-[13px] text-[#7a8fa8] font-medium">Composite Trust Score</span>
              <span className="text-[24px] font-bold text-accent">{(profile.composite_score * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-6">
            <p className="text-[13px] font-bold text-[#e8f0fe] mb-4">Trust Event Types</p>
            <div className="space-y-2">
              {[
                { type: 'contribution_validated', delta: '+0.05 reliability', positive: true },
                { type: 'mission_completed', delta: '+0.03 skill', positive: true },
                { type: 'peer_endorsed', delta: '+0.04 domain', positive: true },
                { type: 'constitutional_violation', delta: '−0.20 ethical', positive: false },
                { type: 'dispute_lost', delta: '−0.08 reliability', positive: false },
                { type: 'accuracy_confirmed', delta: '+0.06 skill', positive: true },
              ].map(({ type, delta, positive }) => (
                <div key={type} className="flex items-center justify-between py-2 border-b border-[#0f1824] last:border-0">
                  <span className="text-[12px] text-[#7a8fa8] capitalize">{type.replace(/_/g, ' ')}</span>
                  <span className={cn('text-[11px] font-semibold', positive ? 'text-accent' : 'text-[#ff5252]')}>{delta}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-24 text-center bg-[#111927] border border-[#1c2a3a] rounded-2xl">
          <ShieldCheck size={36} className="text-[#3d5068] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[#7a8fa8]">No trust profile found</p>
          <p className="text-[#3d5068] text-sm mt-1">Trust events will be recorded as users interact with the platform.</p>
        </div>
      )}
    </div>
  );
}

function GovernancePanel({ actions }: { actions: GovernanceAction[] }) {
  return (
    <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1c2a3a] flex items-center justify-between">
        <p className="text-[14px] font-bold text-[#e8f0fe]">Governance Audit Log</p>
        <span className="text-[11px] text-[#7a8fa8]">{actions.length} actions</span>
      </div>
      {actions.length === 0 ? (
        <div className="py-16 text-center">
          <Scale size={28} className="text-[#3d5068] mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[#7a8fa8] text-sm">No governance actions yet</p>
        </div>
      ) : (
        <div className="divide-y divide-[#1c2a3a]">
          {actions.map((action) => (
            <div key={action.id} className="px-5 py-4">
              <div className="flex items-center gap-3 mb-1">
                {action.is_reversed ? (
                  <XCircle size={13} className="text-[#ff5252]" strokeWidth={2} />
                ) : (
                  <CheckCircle2 size={13} className="text-accent" strokeWidth={2} />
                )}
                <span className="text-[13px] font-semibold text-[#e8f0fe] capitalize">
                  {action.action_type.replace(/_/g, ' ')}
                </span>
                {action.is_reversed && (
                  <span className="text-[9px] font-bold text-[#ff5252] bg-[#ff5252]/10 px-2 py-0.5 rounded-full">Reversed</span>
                )}
                <span className="ml-auto text-[11px] text-[#3d5068]">
                  {new Date(action.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[12px] text-[#7a8fa8] ml-7">{action.rationale}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
