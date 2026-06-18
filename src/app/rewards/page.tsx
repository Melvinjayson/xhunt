'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Trophy, Flame, Zap, Star, TrendingUp,
  Award, Gift, Clock, CheckCircle2, ChevronRight, History,
  ShoppingBag, Send, Plus, X as XIcon, Loader2, Users,
  Tag, Sparkles, ArrowRight, Check,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { loadState } from '@/lib/store';
import { t } from '@/theme/colors';
import type { CompletedHunt } from '@/lib/types';

function parseReward(r: string): number {
  return parseFloat(r.replace(/[^0-9.]/g, '')) || 0;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'XP';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

const TIERS = [
  { name: 'Explorer',        min: 0,    max: 2.9,  color: t.txtFaint, next: 'Verified Hunter' },
  { name: 'Verified Hunter', min: 3.0,  max: 5.9,  color: t.accent,   next: 'Pro Hunter'      },
  { name: 'Pro Hunter',      min: 6.0,  max: 8.4,  color: t.ai,       next: 'Elite Hunter'    },
  { name: 'Elite Hunter',    min: 8.5,  max: 10.0, color: t.warning,  next: null              },
];

type BadgeFn = (h: CompletedHunt[], streak: number) => boolean;

const BADGE_CATALOG: { id: string; emoji: string; label: string; desc: string; earned: BadgeFn }[] = [
  { id: 'first_mission',  emoji: '🚀', label: 'First Launch',    desc: 'Complete your first mission',           earned: (h) => h.length >= 1 },
  { id: 'streak_3',       emoji: '🔥', label: '3-Day Streak',    desc: 'Complete missions 3 days in a row',     earned: (_, s) => s >= 3 },
  { id: 'streak_7',       emoji: '⚡', label: 'Week Warrior',    desc: 'Maintain a 7-day streak',               earned: (_, s) => s >= 7 },
  { id: 'missions_5',     emoji: '🎯', label: 'Sharp Shooter',   desc: 'Complete 5 missions',                   earned: (h) => h.length >= 5 },
  { id: 'missions_10',    emoji: '💎', label: 'Diamond Hunter',  desc: 'Complete 10 missions',                  earned: (h) => h.length >= 10 },
  { id: 'missions_25',    emoji: '👑', label: 'Crown Hunter',    desc: 'Complete 25 missions',                  earned: (h) => h.length >= 25 },
  { id: 'earner_100',     emoji: '💰', label: 'First $100',      desc: 'Earn $100+ across missions',            earned: (h) => h.reduce((sum, c) => sum + parseReward(c.reward), 0) >= 100 },
  { id: 'earner_500',     emoji: '🏦', label: 'High Earner',     desc: 'Earn $500+ across missions',            earned: (h) => h.reduce((sum, c) => sum + parseReward(c.reward), 0) >= 500 },
  { id: 'multi_mission',  emoji: '🌍', label: 'Multi-Hunter',    desc: 'Complete 3 or more different missions', earned: (h) => h.length >= 3 },
];

const LISTING_TYPE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  skill_offer:  { label: 'Skill',    emoji: '🛠',  color: t.ai     },
  coupon_trade: { label: 'Coupon',   emoji: '🎟',  color: t.warning },
  badge_offer:  { label: 'Badge',    emoji: '🏅',  color: t.accent  },
  certificate:  { label: 'Cert',     emoji: '📜',  color: t.aiLight },
  perk:         { label: 'Org Perk', emoji: '✨',  color: t.success },
};

const LISTING_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'skill_offer', label: '🛠 Skills' },
  { id: 'coupon_trade', label: '🎟 Coupons' },
  { id: 'badge_offer', label: '🏅 Badges' },
  { id: 'perk', label: '✨ Org Perks' },
];

interface SubStatus {
  tier: string; isTrialActive: boolean; trialDaysLeft: number;
  canAccessPremiumMissions: boolean;
}

interface RewardEvent {
  id: string;
  mission_id: string;
  reward_type: string;
  reward_value: Record<string, unknown>;
  redeemed: boolean;
  issued_at: string;
  mission?: { title: string } | null;
}

interface BarterListing {
  id: string;
  user_id: string;
  listing_type: string;
  title: string;
  description?: string;
  offering: Record<string, unknown>;
  ask_xp?: number | null;
  ask_description?: string | null;
  status: string;
  created_at: string;
  user?: { id: string; display_name: string } | null;
}

interface OutboundProposal {
  id: string;
  listing_id: string;
  offer_xp?: number | null;
  offer_description?: string | null;
  status: string;
  created_at: string;
  listing?: { id: string; title: string } | null;
}

interface InboundProposal {
  id: string;
  listing_id: string;
  proposer_id: string;
  offer_xp?: number | null;
  offer_description?: string | null;
  status: string;
  message?: string | null;
  created_at: string;
  listing?: { id: string; title: string; user_id: string } | null;
  proposer?: { id: string; display_name: string } | null;
}

const TABS = [
  { id: 'earnings', label: 'Earnings', icon: Trophy },
  { id: 'market',   label: 'Market',   icon: ShoppingBag },
] as const;

type Tab = typeof TABS[number]['id'];

export default function RewardsPage() {
  const router = useRouter();
  const [tab, setTab]                  = useState<Tab>('earnings');
  const [completedHunts, setCompleted] = useState<CompletedHunt[]>([]);
  const [streak, setStreak]            = useState(0);
  const [displayName, setName]         = useState<string | null>(null);
  const [hunterScore, setScore]        = useState(0);
  const [subStatus, setSub]            = useState<SubStatus | null>(null);
  const [rewardEvents, setEvents]      = useState<RewardEvent[]>([]);
  const [mounted, setMounted]          = useState(false);

  // Market tab state
  const [xpBalance, setXPBalance]          = useState<number | null>(null);
  const [listings, setListings]            = useState<BarterListing[]>([]);
  const [listingFilter, setListingFilter]  = useState('all');
  const [outProposals, setOutProposals]    = useState<OutboundProposal[]>([]);
  const [inProposals, setInProposals]      = useState<InboundProposal[]>([]);
  const [marketLoading, setMarketLoading]  = useState(false);
  const [marketLoaded, setMarketLoaded]    = useState(false);

  // Send XP modal
  const [showSendXP, setShowSendXP]       = useState(false);
  const [sendSearch, setSendSearch]        = useState('');
  const [sendResults, setSendResults]      = useState<{ id: string; display_name: string }[]>([]);
  const [sendToUser, setSendToUser]        = useState<{ id: string; display_name: string } | null>(null);
  const [sendAmount, setSendAmount]        = useState('');
  const [sendNote, setSendNote]            = useState('');
  const [sendLoading, setSendLoading]      = useState(false);
  const [sendSuccess, setSendSuccess]      = useState(false);

  // Post offer modal
  const [showPostOffer, setShowPostOffer]  = useState(false);
  const [offerType, setOfferType]          = useState('skill_offer');
  const [offerTitle, setOfferTitle]        = useState('');
  const [offerDesc, setOfferDesc]          = useState('');
  const [offerAskXP, setOfferAskXP]        = useState('');
  const [offerOpenToAny, setOfferOpenToAny] = useState(false);
  const [offerLoading, setOfferLoading]    = useState(false);

  useEffect(() => {
    const state = loadState();
    setCompleted(state.completedHunts ?? []);
    setStreak(state.streak ?? 0);
    setName((state.user as { name?: string })?.name ?? null);
    setScore((state.user as { hunterScore?: number })?.hunterScore ?? 0);
    setMounted(true);

    void fetch('/api/subscription/status')
      .then(r => r.json())
      .then((d: SubStatus) => setSub(d))
      .catch(() => setSub({ tier: 'free', isTrialActive: false, trialDaysLeft: 0, canAccessPremiumMissions: false }));

    void fetch('/api/rewards')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setEvents(d.rewards ?? []); });
  }, []);

  const loadMarketData = useCallback(async () => {
    if (marketLoaded) return;
    setMarketLoading(true);
    try {
      const [sbMod, listRes, outRes, inRes] = await Promise.all([
        import('@/lib/supabase/client'),
        fetch('/api/barter/listings'),
        fetch('/api/barter/proposals?direction=outbound'),
        fetch('/api/barter/proposals?direction=inbound'),
      ]);
      const sb = sbMod.createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: prof } = await sb.from('user_profiles').select('xp_balance').eq('id', user.id).single();
        if (prof) setXPBalance((prof as { xp_balance: number }).xp_balance);
      }
      if (listRes.ok) { const d = await listRes.json() as { listings: BarterListing[] }; setListings(d.listings ?? []); }
      if (outRes.ok) { const d = await outRes.json() as { proposals: OutboundProposal[] }; setOutProposals(d.proposals ?? []); }
      if (inRes.ok) { const d = await inRes.json() as { proposals: InboundProposal[] }; setInProposals(d.proposals ?? []); }
    } catch { /* silent */ }
    setMarketLoading(false);
    setMarketLoaded(true);
  }, [marketLoaded]);

  useEffect(() => {
    if (tab === 'market') void loadMarketData();
  }, [tab, loadMarketData]);

  // User search for Send XP
  useEffect(() => {
    if (!sendSearch.trim() || sendToUser) { setSendResults([]); return; }
    const t_id = setTimeout(() => {
      void import('@/lib/supabase/client').then(mod => {
        const sb = mod.createClient();
        void sb.from('user_profiles')
          .select('id, display_name')
          .ilike('display_name', `%${sendSearch.trim()}%`)
          .limit(5)
          .then(({ data }) => setSendResults((data ?? []) as { id: string; display_name: string }[]));
      });
    }, 300);
    return () => clearTimeout(t_id);
  }, [sendSearch, sendToUser]);

  if (!mounted) return null;

  const totalEarned   = completedHunts.reduce((s, c) => s + parseReward(c.reward), 0);
  const thisMonth     = completedHunts.filter(c => {
    const d = new Date(c.completedAt ?? 0);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, c) => s + parseReward(c.reward), 0);

  const currentTier   = TIERS.find(tier => hunterScore >= tier.min && hunterScore <= tier.max) ?? TIERS[0];
  const nextTier      = currentTier.next ? TIERS.find(tier => tier.name === currentTier.next) : null;
  const scoreProgress = nextTier ? ((hunterScore - currentTier.min) / (nextTier.min - currentTier.min)) * 100 : 100;

  const earnedBadges  = BADGE_CATALOG.filter(b => b.earned(completedHunts, streak));
  const lockedBadges  = BADGE_CATALOG.filter(b => !b.earned(completedHunts, streak));
  const totalXP       = completedHunts.length * 100;

  const filteredListings = listingFilter === 'all'
    ? listings
    : listings.filter(l => l.listing_type === listingFilter);

  async function handleSendXP() {
    if (!sendToUser || !sendAmount) return;
    setSendLoading(true);
    const res = await fetch('/api/barter/send-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_user_id: sendToUser.id, amount: parseInt(sendAmount, 10), note: sendNote || undefined }),
    });
    const d = await res.json() as { ok?: boolean; new_balance?: number; error?: string };
    if (res.ok && d.ok) {
      setSendSuccess(true);
      if (d.new_balance !== undefined) setXPBalance(d.new_balance);
      setTimeout(() => {
        setSendSuccess(false);
        setShowSendXP(false);
        setSendToUser(null);
        setSendSearch('');
        setSendAmount('');
        setSendNote('');
      }, 1800);
    }
    setSendLoading(false);
  }

  async function handlePostOffer() {
    if (!offerTitle.trim()) return;
    setOfferLoading(true);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch('/api/barter/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_type: offerType,
        title: offerTitle.trim(),
        description: offerDesc.trim() || undefined,
        offering: { label: offerTitle.trim() },
        ask_xp: offerOpenToAny ? null : parseInt(offerAskXP, 10) || null,
        ask_description: offerOpenToAny ? 'Open to offers' : undefined,
        expires_at: expiresAt,
      }),
    });
    if (res.ok) {
      const d = await res.json() as { listing: BarterListing };
      setListings(prev => [{ ...d.listing, user: null } as BarterListing, ...prev]);
      setShowPostOffer(false);
      setOfferTitle('');
      setOfferDesc('');
      setOfferAskXP('');
      setOfferOpenToAny(false);
    }
    setOfferLoading(false);
  }

  async function handlePropose(listing: BarterListing) {
    const xp = prompt(`How many XP would you like to offer? (You have ${xpBalance ?? '?'} XP)`);
    if (!xp) return;
    const amount = parseInt(xp, 10);
    if (!amount || amount < 1) return;
    const res = await fetch('/api/barter/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listing.id, offer_xp: amount }),
    });
    if (res.ok) {
      const d = await res.json() as { proposal: OutboundProposal };
      setOutProposals(prev => [{ ...d.proposal, listing: { id: listing.id, title: listing.title } }, ...prev]);
    }
  }

  async function handleRespondProposal(proposalId: string, action: 'accept' | 'reject') {
    const res = await fetch(`/api/barter/proposals/${proposalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setInProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: action === 'accept' ? 'completed' : 'rejected' } : p));
      if (action === 'accept') void loadMarketData();
    }
  }

  const statusColor: Record<string, string> = {
    pending: t.warning,
    completed: t.accent,
    rejected: t.error,
    withdrawn: t.txtFaint,
  };

  return (
    <main className="consumer-app" style={{ background: t.bg, minHeight: '100dvh', paddingBottom: '5.5rem', color: t.txt }}>

      {/* ─── Header ─── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: `${t.bg}F0`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${t.border}`, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: '50%', background: t.card, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={16} style={{ color: t.txt }} />
          </button>
          <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Rewards & Earnings</h1>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === id ? 700 : 500,
                background: tab === id ? `${t.accent}18` : 'transparent',
                color: tab === id ? t.accent : t.txtDim,
                transition: 'all .15s',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'earnings' ? (
          <motion.div key="earnings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px' }}>

            {/* ─── Profile card ─── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ margin: '16px 0', padding: '18px', borderRadius: 20, background: `linear-gradient(135deg, ${t.accent}0A 0%, ${t.ai}0A 100%)`, border: `1px solid ${t.accent}26` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${t.accent},${t.ai})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: t.bg, flexShrink: 0 }}>
                  {getInitials(displayName)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{displayName ?? 'Hunter'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: currentTier.color, background: `${currentTier.color}18`, border: `1px solid ${currentTier.color}30`, borderRadius: 6, padding: '2px 8px' }}>{currentTier.name}</span>
                    {subStatus?.isTrialActive && (
                      <span style={{ fontSize: 11, color: t.ai, background: `${t.ai}1A`, border: `1px solid ${t.ai}33`, borderRadius: 6, padding: '2px 8px' }}>
                        Trial · {subStatus.trialDaysLeft}d left
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 10, color: t.txtFaint }}>Hunter Score</p>
                  <p style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 900, color: currentTier.color, lineHeight: 1 }}>{hunterScore.toFixed(1)}</p>
                </div>
              </div>
            </motion.div>

            {/* ─── Earnings summary ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { icon: <Trophy size={16} />, value: `$${totalEarned.toFixed(0)}`, label: 'Total Earned', color: t.accent },
                { icon: <TrendingUp size={16} />, value: `$${thisMonth.toFixed(0)}`, label: 'This Month', color: t.warning },
                { icon: <Zap size={16} />, value: totalXP.toLocaleString(), label: 'Total XP', color: t.ai },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  style={{ padding: '14px 12px', borderRadius: 16, background: t.card, border: `1px solid ${t.border}`, textAlign: 'center' }}>
                  <div style={{ color: s.color, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: s.color, letterSpacing: '-.025em', lineHeight: 1 }}>{s.value}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 10, color: t.txtFaint }}>{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* ─── Stats row ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ padding: '14px 16px', borderRadius: 16, background: t.card, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: `${t.warning}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={18} style={{ color: t.warning }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: t.warning, lineHeight: 1 }}>{streak} 🔥</p>
                  <p style={{ margin: '3px 0 0', fontSize: 10, color: t.txtFaint }}>Day streak</p>
                </div>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: 16, background: t.card, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: `${t.accent}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={18} style={{ color: t.accent }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{completedHunts.length}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 10, color: t.txtFaint }}>Completed</p>
                </div>
              </div>
            </div>

            {/* ─── Hunter Score progress ─── */}
            {nextTier && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{ marginBottom: 20, padding: '16px', borderRadius: 18, background: t.surface, border: `1px solid ${t.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: t.txtFaint, fontWeight: 600 }}>Next tier</p>
                    <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: nextTier.color }}>{nextTier.name}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 11, color: t.txtFaint }}>Need score</p>
                    <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: nextTier.color }}>{nextTier.min}+</p>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: t.panel, marginBottom: 6 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(scoreProgress, 100)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})` }} />
                </div>
                <p style={{ margin: 0, fontSize: 11, color: t.txtFaint }}>
                  {hunterScore.toFixed(1)} / {nextTier.min} — complete {nextTier.name === 'Verified Hunter' ? 'more missions' : 'higher-tier missions'} to advance
                </p>
              </motion.div>
            )}

            {/* ─── Badges ─── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Award size={16} style={{ color: t.accent }} /> Badges
                  <span style={{ fontSize: 12, color: t.txtFaint, fontWeight: 500 }}>({earnedBadges.length}/{BADGE_CATALOG.length})</span>
                </h2>
              </div>

              {earnedBadges.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  {earnedBadges.map((badge, i) => (
                    <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      style={{ padding: '12px 8px', borderRadius: 14, background: t.card, border: `1px solid ${t.accent}26`, textAlign: 'center' }}>
                      <div style={{ fontSize: 26, marginBottom: 6 }}>{badge.emoji}</div>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: t.accent, lineHeight: 1.2 }}>{badge.label}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 9, color: t.txtFaint, lineHeight: 1.3 }}>{badge.desc}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', borderRadius: 16, background: t.card, border: `1px solid ${t.border}`, textAlign: 'center', marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, color: t.txtDim }}>Complete missions to earn badges</p>
                </div>
              )}

              {lockedBadges.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Locked</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {lockedBadges.slice(0, 6).map(badge => (
                      <div key={badge.id} style={{ padding: '12px 8px', borderRadius: 14, background: t.surface, border: `1px solid ${t.border}`, textAlign: 'center', opacity: 0.5 }}>
                        <div style={{ fontSize: 22, marginBottom: 6, filter: 'grayscale(1)' }}>{badge.emoji}</div>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: t.txtFaint }}>{badge.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ─── Reward History (Supabase) ─── */}
            {rewardEvents.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <History size={16} style={{ color: t.warning }} /> Reward History
                </h2>
                <div style={{ borderRadius: 16, background: t.card, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                  {rewardEvents.slice(0, 8).map((ev, i) => {
                    const val = ev.reward_value as { reward?: string; points?: number; xp?: number };
                    return (
                      <div key={ev.id} style={{ padding: '12px 14px', borderBottom: i < Math.min(rewardEvents.length, 8) - 1 ? `1px solid ${t.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: ev.redeemed ? `${t.accent}14` : `${t.warning}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Gift size={16} style={{ color: ev.redeemed ? t.accent : t.warning }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.mission?.title ?? 'Mission Completed'}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: t.txtFaint }}>{timeAgo(ev.issued_at)}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {val?.reward && <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: t.accent }}>{val.reward}</p>}
                          {val?.points && <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: t.warning }}>+{val.points} pts</p>}
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ev.redeemed ? `${t.accent}18` : `${t.warning}18`, color: ev.redeemed ? t.accent : t.warning }}>
                            {ev.redeemed ? 'REDEEMED' : 'PENDING'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ─── Recent payouts (localStorage fallback) ─── */}
            {rewardEvents.length === 0 && completedHunts.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Clock size={16} style={{ color: t.warning }} /> Recent Payouts
                </h2>
                <div style={{ borderRadius: 16, background: t.card, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                  {[...completedHunts].reverse().slice(0, 5).map((h, i) => (
                    <div key={`${h.huntId}-${i}`} style={{ padding: '12px 14px', borderBottom: i < 4 ? `1px solid ${t.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${t.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle2 size={16} style={{ color: t.accent }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(h as { title?: string }).title ?? `Mission ${i + 1}`}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: t.txtFaint }}>{h.completedAt ? timeAgo(h.completedAt) : '—'}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {parseReward(h.reward) > 0 && (
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: t.accent }}>{h.reward}</p>
                        )}
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: t.warning }}>+100 XP</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Unlock more CTA ─── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              style={{ marginBottom: 16, padding: '20px', borderRadius: 20, background: `linear-gradient(135deg, ${t.accent}0A, ${t.ai}0A)`, border: `1px solid ${t.accent}26`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg,${t.accent},${t.ai})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Gift size={22} style={{ color: t.bg }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: t.txt }}>Unlock higher-value missions</p>
                <p style={{ margin: 0, fontSize: 12, color: t.txtDim }}>Complete more missions to raise your Hunter Score and access premium brand gigs.</p>
              </div>
              <button onClick={() => router.push('/missions')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.accent, flexShrink: 0 }}>
                <ChevronRight size={20} />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ marginBottom: 16, padding: '16px', borderRadius: 16, background: t.surface, border: `1px solid ${t.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: t.ai, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={12} /> Social Impact Missions
              </p>
              <p style={{ margin: 0, fontSize: 12, color: t.txtDim, lineHeight: 1.55 }}>
                Some missions are run by non-profits and civic programs. Completing these earns XP and impact badges but may not include cash payouts. They count toward your Hunter Score.
              </p>
            </motion.div>

          </motion.div>
        ) : (
          /* ─── Market Tab ─── */
          <motion.div key="market" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ maxWidth: 600, margin: '0 auto', padding: '16px 16px' }}>

            {marketLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <Loader2 size={22} style={{ color: t.txtFaint, animation: 'spin 1s linear infinite' }} />
              </div>
            )}

            {!marketLoading && (
              <>
                {/* ─── XP Balance card ─── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginBottom: 16, padding: '18px', borderRadius: 20, background: `linear-gradient(135deg, ${t.ai}0D, ${t.accent}0A)`, border: `1px solid ${t.ai}28` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em' }}>XP Balance</p>
                      <p style={{ margin: 0, fontSize: 34, fontWeight: 900, color: t.ai, lineHeight: 1, letterSpacing: '-.03em' }}>
                        {xpBalance !== null ? xpBalance.toLocaleString() : '—'}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: t.txtFaint }}>XPoints available</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button onClick={() => setShowSendXP(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, background: t.ai, border: 'none', color: t.txt, cursor: 'pointer' }}>
                        <Send size={13} strokeWidth={2} /> Send XP
                      </button>
                      <button onClick={() => setShowPostOffer(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, background: `${t.accent}18`, border: `1px solid ${t.accent}33`, color: t.accent, cursor: 'pointer' }}>
                        <Plus size={13} strokeWidth={2.5} /> Post Offer
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* ─── Filter chips ─── */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
                  {LISTING_FILTERS.map(f => (
                    <button key={f.id} onClick={() => setListingFilter(f.id)} style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                      background: listingFilter === f.id ? `${t.accent}18` : 'rgba(255,255,255,.04)',
                      border: `1px solid ${listingFilter === f.id ? `${t.accent}40` : t.border}`,
                      color: listingFilter === f.id ? t.accent : t.txtDim,
                      flexShrink: 0,
                    }}>{f.label}</button>
                  ))}
                </div>

                {/* ─── Listings ─── */}
                {filteredListings.length === 0 ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center', borderRadius: 20, background: t.surface, border: `1px solid ${t.border}`, marginBottom: 16 }}>
                    <Users size={28} style={{ color: t.txtFaint, marginBottom: 12 }} />
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: t.txt }}>No listings yet</p>
                    <p style={{ margin: '0 0 16px', fontSize: 12, color: t.txtDim }}>Be the first to post an offer in the marketplace.</p>
                    <button onClick={() => setShowPostOffer(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, background: `${t.accent}18`, border: `1px solid ${t.accent}33`, color: t.accent, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      <Plus size={14} /> Post an Offer
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {filteredListings.map((listing, i) => {
                      const typeInfo = LISTING_TYPE_LABELS[listing.listing_type] ?? { label: listing.listing_type, emoji: '📦', color: t.txtDim };
                      return (
                        <motion.div key={listing.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                          style={{ padding: '14px 16px', borderRadius: 18, background: t.card, border: `1px solid ${t.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 11, background: `${typeInfo.color}14`, border: `1px solid ${typeInfo.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                              {typeInfo.emoji}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13.5, fontWeight: 700, color: t.txt }}>{listing.title}</span>
                                <span style={{ fontSize: 9, fontWeight: 800, color: typeInfo.color, background: `${typeInfo.color}14`, borderRadius: 999, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '.06em' }}>{typeInfo.label}</span>
                              </div>
                              {listing.description && (
                                <p style={{ margin: '0 0 4px', fontSize: 11.5, color: t.txtDim, lineHeight: 1.4 }}>{listing.description}</p>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {listing.user?.display_name && (
                                  <span style={{ fontSize: 10.5, color: t.txtFaint }}>by {listing.user.display_name}</span>
                                )}
                                <span style={{ fontSize: 10, color: t.txtFaint }}>· {timeAgo(listing.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              {listing.ask_xp ? (
                                <span style={{ fontSize: 13, fontWeight: 800, color: t.ai }}>{listing.ask_xp.toLocaleString()} XP</span>
                              ) : (
                                <span style={{ fontSize: 11, color: t.txtFaint, background: 'rgba(255,255,255,.04)', border: `1px solid ${t.border}`, borderRadius: 999, padding: '3px 10px' }}>Open to offers</span>
                              )}
                            </div>
                            <button onClick={() => void handlePropose(listing)} style={{ padding: '7px 14px', borderRadius: 10, background: `${t.accent}14`, border: `1px solid ${t.accent}28`, color: t.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              Propose Trade
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* ─── My Proposals ─── */}
                {(outProposals.length > 0 || inProposals.length > 0) && (
                  <div style={{ marginBottom: 16 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Tag size={15} style={{ color: t.warning }} /> My Proposals
                    </h2>

                    {/* Outbound */}
                    {outProposals.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Sent</p>
                        {outProposals.map(p => (
                          <div key={p.id} style={{ padding: '11px 14px', borderRadius: 14, background: t.surface, border: `1px solid ${t.border}`, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.listing?.title ?? 'Listing'}
                              </p>
                              {p.offer_xp && <p style={{ margin: '2px 0 0', fontSize: 11, color: t.ai }}>{p.offer_xp.toLocaleString()} XP offered</p>}
                              <p style={{ margin: '2px 0 0', fontSize: 10, color: t.txtFaint }}>{timeAgo(p.created_at)}</p>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `${statusColor[p.status] ?? t.txtFaint}18`, color: statusColor[p.status] ?? t.txtFaint, textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0 }}>
                              {p.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inbound */}
                    {inProposals.length > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Received</p>
                        {inProposals.map(p => (
                          <div key={p.id} style={{ padding: '11px 14px', borderRadius: 14, background: t.surface, border: `1px solid ${t.border}`, marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: p.status === 'pending' ? 10 : 0 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: '0 0 1px', fontSize: 11, color: t.txtFaint }}>on <span style={{ color: t.txt }}>{p.listing?.title ?? 'your listing'}</span></p>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.txt }}>
                                  {p.proposer?.display_name ?? 'Someone'} {p.offer_xp ? `offers ${p.offer_xp.toLocaleString()} XP` : 'proposed a trade'}
                                </p>
                                {p.message && <p style={{ margin: '3px 0 0', fontSize: 11.5, color: t.txtDim }}>&ldquo;{p.message}&rdquo;</p>}
                              </div>
                              {p.status !== 'pending' && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `${statusColor[p.status] ?? t.txtFaint}18`, color: statusColor[p.status] ?? t.txtFaint, textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0 }}>
                                  {p.status}
                                </span>
                              )}
                            </div>
                            {p.status === 'pending' && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => void handleRespondProposal(p.id, 'accept')} style={{ flex: 1, padding: '7px 12px', borderRadius: 10, background: `${t.accent}18`, border: `1px solid ${t.accent}33`, color: t.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                  <Check size={12} strokeWidth={2.5} /> Accept
                                </button>
                                <button onClick={() => void handleRespondProposal(p.id, 'reject')} style={{ flex: 1, padding: '7px 12px', borderRadius: 10, background: `${t.error}0F`, border: `1px solid ${t.error}26`, color: t.error, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  style={{ padding: '16px', borderRadius: 16, background: t.surface, border: `1px solid ${t.border}`, marginBottom: 12 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: t.ai, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={12} /> How Barter Works
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: t.txtDim, lineHeight: 1.55 }}>
                    Post offers for skills, coupons, or badges. Other participants can propose trades — exchange XP or items directly. Org Perks are posted by organizations and claimable with XP.
                  </p>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />

      {/* ─── Send XP Modal ─── */}
      <AnimatePresence>
        {showSendXP && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSendXP(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,22,.7)', zIndex: 40, backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: t.surface, borderTop: `1px solid ${t.borderMid}`, borderRadius: '24px 24px 0 0', padding: '0 0 40px', maxHeight: '80dvh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 20px' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.txt }}>Send XP</h2>
                <button onClick={() => setShowSendXP(false)} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.05)', border: `1px solid ${t.border}`, cursor: 'pointer' }}>
                  <XIcon size={16} style={{ color: t.txtDim }} />
                </button>
              </div>

              {sendSuccess ? (
                <div style={{ padding: '24px 20px', textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${t.accent}18`, border: `1px solid ${t.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Check size={24} style={{ color: t.accent }} strokeWidth={2.5} />
                  </div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.txt }}>XP Sent!</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: t.txtDim }}>{sendAmount} XP to {sendToUser?.display_name}</p>
                </div>
              ) : (
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Recipient search */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Recipient</label>
                    {sendToUser ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, background: `${t.ai}10`, border: `1px solid ${t.ai}28` }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${t.ai}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: t.ai }}>
                          {sendToUser.display_name[0]?.toUpperCase()}
                        </div>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.txt }}>{sendToUser.display_name}</span>
                        <button onClick={() => setSendToUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.txtFaint }}>
                          <XIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <input
                          value={sendSearch}
                          onChange={e => setSendSearch(e.target.value)}
                          placeholder="Search by name…"
                          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 14, fontSize: 14, background: t.card, border: `1px solid ${t.borderMid}`, color: t.txt, outline: 'none' }}
                        />
                        {sendResults.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden', zIndex: 10, marginTop: 4 }}>
                            {sendResults.map(u => (
                              <button key={u.id} onClick={() => { setSendToUser(u); setSendSearch(''); setSendResults([]); }}
                                style={{ width: '100%', padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${t.border}` }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${t.ai}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: t.ai }}>{u.display_name[0]?.toUpperCase()}</div>
                                <span style={{ fontSize: 13, color: t.txt }}>{u.display_name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                      Amount {xpBalance !== null && <span style={{ fontWeight: 400, textTransform: 'none' }}>(max {xpBalance.toLocaleString()})</span>}
                    </label>
                    <input
                      type="number" min={1} max={xpBalance ?? 10000} value={sendAmount}
                      onChange={e => setSendAmount(e.target.value)}
                      placeholder="100"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 14, fontSize: 16, fontWeight: 700, background: t.card, border: `1px solid ${t.borderMid}`, color: t.txt, outline: 'none' }}
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Note (optional)</label>
                    <input value={sendNote} onChange={e => setSendNote(e.target.value)} placeholder="What's this for?"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 14, fontSize: 14, background: t.card, border: `1px solid ${t.borderMid}`, color: t.txt, outline: 'none' }} />
                  </div>

                  <button onClick={() => void handleSendXP()} disabled={sendLoading || !sendToUser || !sendAmount}
                    style={{ padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700, background: sendLoading ? `${t.ai}30` : t.ai, border: 'none', color: t.txt, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!sendToUser || !sendAmount) ? 0.5 : 1 }}>
                    {sendLoading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                    {sendLoading ? 'Sending…' : `Send ${sendAmount || '—'} XP`}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Post Offer Modal ─── */}
      <AnimatePresence>
        {showPostOffer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPostOffer(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,22,.7)', zIndex: 40, backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: t.surface, borderTop: `1px solid ${t.borderMid}`, borderRadius: '24px 24px 0 0', padding: '0 0 40px', maxHeight: '85dvh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 20px' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.txt }}>Post an Offer</h2>
                <button onClick={() => setShowPostOffer(false)} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.05)', border: `1px solid ${t.border}`, cursor: 'pointer' }}>
                  <XIcon size={16} style={{ color: t.txtDim }} />
                </button>
              </div>

              <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Type */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Type</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(LISTING_TYPE_LABELS).filter(([id]) => id !== 'perk').map(([id, info]) => (
                      <button key={id} onClick={() => setOfferType(id)} style={{ padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: offerType === id ? `${info.color}18` : 'rgba(255,255,255,.04)', border: `1px solid ${offerType === id ? `${info.color}40` : t.border}`, color: offerType === id ? info.color : t.txtDim }}>
                        {info.emoji} {info.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Title</label>
                  <input value={offerTitle} onChange={e => setOfferTitle(e.target.value)} maxLength={120} placeholder="e.g. 1hr Python tutoring"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 14, fontSize: 14, background: t.card, border: `1px solid ${t.borderMid}`, color: t.txt, outline: 'none' }} />
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Description (optional)</label>
                  <textarea value={offerDesc} onChange={e => setOfferDesc(e.target.value)} maxLength={500} rows={3} placeholder="What exactly are you offering?"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 14, fontSize: 14, background: t.card, border: `1px solid ${t.borderMid}`, color: t.txt, outline: 'none', resize: 'vertical' }} />
                </div>

                {/* Ask price */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Asking Price</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <button onClick={() => setOfferOpenToAny(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: offerOpenToAny ? `${t.accent}18` : 'rgba(255,255,255,.04)', border: `1px solid ${offerOpenToAny ? `${t.accent}40` : t.border}`, color: offerOpenToAny ? t.accent : t.txtDim, cursor: 'pointer' }}>
                      <ArrowRight size={12} /> Open to offers
                    </button>
                  </div>
                  {!offerOpenToAny && (
                    <input type="number" min={1} value={offerAskXP} onChange={e => setOfferAskXP(e.target.value)} placeholder="XP amount"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 14, fontSize: 16, fontWeight: 700, background: t.card, border: `1px solid ${t.borderMid}`, color: t.txt, outline: 'none' }} />
                  )}
                </div>

                <button onClick={() => void handlePostOffer()} disabled={offerLoading || !offerTitle.trim()}
                  style={{ padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700, background: offerLoading ? `${t.accent}30` : `linear-gradient(135deg, ${t.accent}, ${t.accentDark})`, border: 'none', color: t.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: !offerTitle.trim() ? 0.5 : 1 }}>
                  {offerLoading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                  {offerLoading ? 'Posting…' : 'Post Offer'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </main>
  );
}
