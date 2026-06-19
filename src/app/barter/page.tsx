'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight, Coins, Award, Brain, Ticket, Gift, Users, Plus, X,
  ChevronRight, ArrowRight, Clock, CheckCircle2, ArrowLeft, RefreshCw,
  Zap, Star, Filter,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { t } from '@/theme/colors';
import { cn } from '@/lib/cn';
import type {
  BarterListing, BarterOffer, BarterTransaction, BarterAssetType, BarterWantType, AssetValue,
} from '@/lib/economy/barter';

const LINE = 'rgba(255,255,255,.07)';

type TabId = 'browse' | 'mine' | 'my_offers' | 'history';
type FilterType = BarterAssetType | 'all';

function getInitials(name: string | null | undefined): string {
  if (!name) return 'XH';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function formatAsset(type: BarterAssetType | 'open', value: AssetValue): string {
  switch (type) {
    case 'points':        return `${(value.amount ?? 0).toLocaleString()} pts`;
    case 'badge':         return `${value.badge_emoji ?? '🏅'} ${value.badge_label ?? 'Badge'}`;
    case 'skill_session': return `${value.hours ?? 1}h ${value.skill ?? 'Session'}`;
    case 'coupon':        return value.coupon_code ? `Coupon: ${value.coupon_code}` : 'Coupon';
    case 'benefit':       return value.description ?? 'Benefit';
    case 'open':          return 'Open offer';
    default:              return 'Unknown';
  }
}

function assetIcon(type: BarterAssetType | 'open'): string {
  const MAP: Record<string, string> = {
    points: '⚡', badge: '🏅', skill_session: '🧠',
    coupon: '🎟️', benefit: '🎁', open: '🤝',
  };
  return MAP[type] ?? '🔄';
}

function timeUntilExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  if (d > 0) return `${d}d left`;
  if (h > 0) return `${h}h left`;
  return 'Expiring soon';
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function assetTypeColor(type: BarterAssetType | 'open'): string {
  switch (type) {
    case 'points':        return t.warning;
    case 'badge':         return t.ai;
    case 'skill_session': return t.accent;
    case 'coupon':        return t.info;
    case 'benefit':       return t.error;
    case 'open':          return t.txtDim;
    default:              return t.txtDim;
  }
}

function statusStyle(status: string): { bg: string; color: string } {
  switch (status) {
    case 'open':       return { bg: `${t.accent}1A`, color: t.accent };
    case 'pending':    return { bg: `${t.warning}1A`, color: t.warning };
    case 'completed':  return { bg: `${t.ai}1A`, color: t.aiLight };
    default:           return { bg: `${t.txtFaint}1A`, color: t.txtFaint };
  }
}

const ASSET_TYPES: { type: BarterAssetType; label: string; icon: string }[] = [
  { type: 'points', label: 'Points', icon: '⚡' },
  { type: 'badge', label: 'Badge', icon: '🏅' },
  { type: 'skill_session', label: 'Skill', icon: '🧠' },
  { type: 'coupon', label: 'Coupon', icon: '🎟️' },
  { type: 'benefit', label: 'Benefit', icon: '🎁' },
];

const WANT_TYPES: { type: BarterWantType; label: string; icon: string }[] = [
  ...ASSET_TYPES,
  { type: 'open', label: 'Open', icon: '🤝' },
];

const FILTER_OPTIONS: { type: FilterType; label: string }[] = [
  { type: 'all', label: 'All' },
  { type: 'points', label: 'Points' },
  { type: 'badge', label: 'Badges' },
  { type: 'skill_session', label: 'Skills' },
  { type: 'coupon', label: 'Coupons' },
  { type: 'benefit', label: 'Benefits' },
];

async function apiPost(body: Record<string, unknown>) {
  const res = await fetch('/api/economy/barter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function Skeleton({ w, h, radius = 8 }: { w?: string | number; h: number; radius?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{
        width: w ?? '100%', height: h, borderRadius: radius,
        background: t.surface,
      }}
    />
  );
}

function AssetValueFields({
  type, value, onChange,
}: {
  type: BarterAssetType | 'open';
  value: AssetValue;
  onChange: (v: AssetValue) => void;
}) {
  const inp = (placeholder: string, field: keyof AssetValue, inputType = 'text') => (
    <input
      type={inputType}
      placeholder={placeholder}
      value={(value[field] as string | number | undefined) ?? ''}
      onChange={e => onChange({ ...value, [field]: inputType === 'number' ? Number(e.target.value) : e.target.value })}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 10,
        background: t.surface, border: `1px solid ${LINE}`, color: t.txt,
        fontSize: 14, outline: 'none', boxSizing: 'border-box',
      }}
    />
  );

  switch (type) {
    case 'points': return inp('Amount (e.g. 500)', 'amount', 'number');
    case 'badge':  return (
      <div className="flex flex-col gap-2">
        {inp('Badge label (e.g. Week Warrior)', 'badge_label')}
        {inp('Badge emoji (e.g. ⚡)', 'badge_emoji')}
      </div>
    );
    case 'skill_session': return (
      <div className="flex flex-col gap-2">
        {inp('Skill (e.g. UX Design)', 'skill')}
        {inp('Hours (e.g. 2)', 'hours', 'number')}
      </div>
    );
    case 'coupon':  return inp('Coupon code', 'coupon_code');
    case 'benefit': return inp('Describe the benefit', 'description');
    default: return null;
  }
}

function AssetTypeGrid({
  selected, onSelect, types = ASSET_TYPES,
}: {
  selected: BarterAssetType | 'open' | null;
  onSelect: (t: BarterAssetType | 'open') => void;
  types?: { type: BarterAssetType | 'open'; label: string; icon: string }[];
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${types.length}, 1fr)` }}>
      {types.map(({ type, label, icon }) => {
        const active = selected === type;
        const color = assetTypeColor(type as BarterAssetType);
        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            style={{
              padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
              background: active ? `${color}1A` : t.surface,
              border: `1px solid ${active ? color : LINE}`,
              color: active ? color : t.txtDim,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              transition: 'all .15s',
            }}
          >
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Drawer({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              background: 'rgba(5,8,22,.82)', backdropFilter: 'blur(4px)',
            }}
          />
          <motion.div
            key="panel"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61,
              maxHeight: '92dvh', overflowY: 'auto',
              background: t.card, borderRadius: '20px 20px 0 0',
              border: `1px solid ${LINE}`, borderBottom: 'none',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: t.card, zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.txt }}>{title}</h2>
              <button
                onClick={onClose}
                style={{ background: t.surface, border: `1px solid ${LINE}`, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} style={{ color: t.txtDim }} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function BarterListingCard({
  listing, isOwn, onMakeOffer, onViewOffers, onCancel,
}: {
  listing: BarterListing;
  isOwn?: boolean;
  onMakeOffer?: (l: BarterListing) => void;
  onViewOffers?: (l: BarterListing) => void;
  onCancel?: (l: BarterListing) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const offerColor = assetTypeColor(listing.offer_type);
  const ss = statusStyle(listing.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18, background: t.card,
        border: `1px solid ${hovered ? `${t.accent}33` : LINE}`,
        padding: '14px', display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color .2s',
      }}
    >
      <div className="flex items-center gap-3">
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${offerColor}33, ${offerColor}1A)`,
          border: `1px solid ${offerColor}4D`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: offerColor,
        }}>
          {listing.user ? getInitials(listing.user.display_name) : 'XH'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: t.txtDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {listing.user?.display_name ?? 'Anonymous'}
          </p>
          {isOwn && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 6, background: ss.bg, color: ss.color }}>
              {listing.status}
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: t.txtFaint, flexShrink: 0 }}>{timeAgo(listing.created_at)}</span>
      </div>

      <div>
        <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 600, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.06em' }}>Offering</p>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: offerColor }}>
          {assetIcon(listing.offer_type)} {formatAsset(listing.offer_type, listing.offer_value)}
        </p>
      </div>

      <div>
        <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 600, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.06em' }}>Wants</p>
        <p style={{ margin: 0, fontSize: 13, color: t.txtDim, lineHeight: 1.4 }}>
          {listing.want_type !== 'open' ? `${assetIcon(listing.want_type)} ` : ''}
          {listing.want_description || formatAsset(listing.want_type as BarterAssetType, listing.want_value)}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap" style={{ borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: t.txtDim, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={11} /> {listing.offer_count} offer{listing.offer_count !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: 11, color: t.txtDim, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} /> {timeUntilExpiry(listing.expires_at)}
        </span>
        {listing.min_trust_score > 0 && (
          <span style={{ fontSize: 11, color: t.warning, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Star size={11} /> {listing.min_trust_score}+ trust
          </span>
        )}
      </div>

      {isOwn ? (
        <div className="flex gap-2">
          <button
            onClick={() => onViewOffers?.(listing)}
            style={{
              flex: 1, padding: '8px', borderRadius: 10, cursor: 'pointer',
              background: `${t.ai}1A`, border: `1px solid ${t.ai}33`, color: t.aiLight,
              fontSize: 12, fontWeight: 700,
            }}
          >
            View Offers ({listing.offer_count})
          </button>
          {listing.status === 'open' && (
            <button
              onClick={() => onCancel?.(listing)}
              style={{
                padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                background: `${t.error}1A`, border: `1px solid ${t.error}33`, color: t.error,
                fontSize: 12, fontWeight: 700,
              }}
            >
              Cancel
            </button>
          )}
        </div>
      ) : (
        <button
          disabled={isOwn}
          onClick={() => onMakeOffer?.(listing)}
          style={{
            width: '100%', padding: '9px', borderRadius: 10, cursor: 'pointer',
            background: `${t.accent}1A`, border: `1px solid ${t.accent}33`, color: t.accent,
            fontSize: 13, fontWeight: 700,
          }}
        >
          Make Offer
        </button>
      )}
    </motion.div>
  );
}

function CreateListingDrawer({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [offerType, setOfferType] = useState<BarterAssetType | null>(null);
  const [offerValue, setOfferValue] = useState<AssetValue>({});
  const [wantType, setWantType] = useState<BarterWantType | null>(null);
  const [wantDesc, setWantDesc] = useState('');
  const [wantValue, setWantValue] = useState<AssetValue>({});
  const [minTrust, setMinTrust] = useState(0);
  const [expiresIn, setExpiresIn] = useState(14);
  const [loading, setLoading] = useState(false);

  function reset() {
    setStep(1); setOfferType(null); setOfferValue({}); setWantType(null);
    setWantDesc(''); setWantValue({}); setMinTrust(0); setExpiresIn(14);
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit() {
    if (!offerType || !wantType || !wantDesc.trim()) return;
    setLoading(true);
    await apiPost({
      action: 'create_listing',
      offer_type: offerType,
      offer_value: offerValue,
      want_type: wantType,
      want_description: wantDesc,
      want_value: wantValue,
      min_trust_score: minTrust,
      expires_in_days: expiresIn,
    });
    setLoading(false);
    reset();
    onSuccess();
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: t.txtFaint,
    textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, display: 'block',
  };

  return (
    <Drawer open={open} onClose={handleClose} title="Post a Trade">
      {step === 1 ? (
        <div className="flex flex-col gap-5">
          <div>
            <span style={labelStyle}>What are you offering?</span>
            <AssetTypeGrid selected={offerType} onSelect={t => { setOfferType(t as BarterAssetType); setOfferValue({}); }} />
          </div>
          {offerType && (
            <div>
              <span style={labelStyle}>Offer details</span>
              <AssetValueFields type={offerType} value={offerValue} onChange={setOfferValue} />
            </div>
          )}
          <button
            disabled={!offerType}
            onClick={() => setStep(2)}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, cursor: offerType ? 'pointer' : 'not-allowed',
              background: offerType ? t.accent : t.surface,
              border: 'none', color: offerType ? t.bg : t.txtFaint,
              fontSize: 14, fontWeight: 800,
              opacity: offerType ? 1 : 0.5,
            }}
          >
            Next: What do you want? <ArrowRight size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setStep(1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.txtDim, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: 0, width: 'fit-content' }}
          >
            <ArrowLeft size={15} /> Back
          </button>

          <div>
            <span style={labelStyle}>What do you want?</span>
            <AssetTypeGrid selected={wantType} onSelect={setWantType} types={WANT_TYPES} />
          </div>

          <div>
            <span style={labelStyle}>Describe what you want</span>
            <textarea
              placeholder="e.g. Looking for 2h UX design session or equivalent..."
              value={wantDesc}
              onChange={e => setWantDesc(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: t.surface, border: `1px solid ${LINE}`, color: t.txt,
                fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {wantType && wantType !== 'open' && (
            <div>
              <span style={labelStyle}>Preferred value (optional)</span>
              <AssetValueFields type={wantType as BarterAssetType} value={wantValue} onChange={setWantValue} />
            </div>
          )}

          <div>
            <span style={labelStyle}>Min trust score</span>
            <div className="flex gap-2">
              {[0, 20, 40, 60, 80].map(v => (
                <button
                  key={v}
                  onClick={() => setMinTrust(v)}
                  style={{
                    flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                    background: minTrust === v ? `${t.warning}1A` : t.surface,
                    border: `1px solid ${minTrust === v ? t.warning : LINE}`,
                    color: minTrust === v ? t.warning : t.txtDim,
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  {v === 0 ? 'Any' : v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span style={labelStyle}>Expires in</span>
            <div className="flex gap-2">
              {[3, 7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setExpiresIn(d)}
                  style={{
                    flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                    background: expiresIn === d ? `${t.accent}1A` : t.surface,
                    border: `1px solid ${expiresIn === d ? t.accent : LINE}`,
                    color: expiresIn === d ? t.accent : t.txtDim,
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!wantType || !wantDesc.trim() || loading}
            onClick={handleSubmit}
            style={{
              width: '100%', padding: '12px', borderRadius: 12,
              cursor: wantType && wantDesc.trim() && !loading ? 'pointer' : 'not-allowed',
              background: wantType && wantDesc.trim() ? t.accent : t.surface,
              border: 'none', color: wantType && wantDesc.trim() ? t.bg : t.txtFaint,
              fontSize: 14, fontWeight: 800,
              opacity: wantType && wantDesc.trim() && !loading ? 1 : 0.5,
            }}
          >
            {loading ? 'Posting...' : 'Post Listing'}
          </button>
        </div>
      )}
    </Drawer>
  );
}

function MakeOfferDrawer({ listing, onClose, onSuccess }: {
  listing: BarterListing | null; onClose: () => void; onSuccess: () => void;
}) {
  const [offerType, setOfferType] = useState<BarterAssetType | null>(null);
  const [offerValue, setOfferValue] = useState<AssetValue>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() { setOfferType(null); setOfferValue({}); setMessage(''); }
  function handleClose() { reset(); onClose(); }

  async function handleSubmit() {
    if (!listing || !offerType) return;
    setLoading(true);
    await apiPost({
      action: 'make_offer',
      listing_id: listing.id,
      offer_type: offerType,
      offer_value: offerValue,
      message: message || undefined,
    });
    setLoading(false);
    reset();
    onSuccess();
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: t.txtFaint,
    textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, display: 'block',
  };

  return (
    <Drawer open={!!listing} onClose={handleClose} title="Make an Offer">
      {listing && (
        <div className="flex flex-col gap-5">
          <div style={{ padding: '12px 14px', borderRadius: 14, background: t.surface, border: `1px solid ${LINE}` }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.06em' }}>Responding to</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.txt }}>
              {assetIcon(listing.offer_type)} {formatAsset(listing.offer_type, listing.offer_value)}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: t.txtDim }}>{listing.want_description}</p>
          </div>

          <div>
            <span style={labelStyle}>What are you offering?</span>
            <AssetTypeGrid selected={offerType} onSelect={tp => { setOfferType(tp as BarterAssetType); setOfferValue({}); }} />
          </div>

          {offerType && (
            <div>
              <span style={labelStyle}>Offer details</span>
              <AssetValueFields type={offerType} value={offerValue} onChange={setOfferValue} />
            </div>
          )}

          <div>
            <span style={labelStyle}>Message (optional)</span>
            <textarea
              placeholder="Add a message to the listing owner..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: t.surface, border: `1px solid ${LINE}`, color: t.txt,
                fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            disabled={!offerType || loading}
            onClick={handleSubmit}
            style={{
              width: '100%', padding: '12px', borderRadius: 12,
              cursor: offerType && !loading ? 'pointer' : 'not-allowed',
              background: offerType ? t.accent : t.surface,
              border: 'none', color: offerType ? t.bg : t.txtFaint,
              fontSize: 14, fontWeight: 800,
              opacity: offerType && !loading ? 1 : 0.5,
            }}
          >
            {loading ? 'Sending...' : 'Send Offer'}
          </button>
        </div>
      )}
    </Drawer>
  );
}

function OffersDrawer({ listing, onClose, onAccepted }: {
  listing: BarterListing | null; onClose: () => void; onAccepted: () => void;
}) {
  const [offers, setOffers] = useState<BarterOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!listing) { setOffers([]); return; }
    setLoading(true);
    fetch(`/api/economy/barter?view=offers_for_listing&listing_id=${listing.id}`)
      .then(r => r.json())
      .then((d: BarterOffer[]) => setOffers(d ?? []))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, [listing]);

  async function handleAccept(offerId: string) {
    setActing(offerId);
    await apiPost({ action: 'accept_offer', offer_id: offerId });
    setActing(null);
    onAccepted();
  }

  return (
    <Drawer open={!!listing} onClose={onClose} title={`Offers (${offers.length})`}>
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map(i => <Skeleton key={i} h={80} radius={14} />)}
        </div>
      ) : offers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🤝</p>
          <p style={{ margin: 0, fontSize: 14, color: t.txtDim }}>No offers yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {offers.map(offer => {
            const oColor = assetTypeColor(offer.offer_type);
            return (
              <div
                key={offer.id}
                style={{
                  padding: '14px', borderRadius: 14,
                  background: t.surface, border: `1px solid ${LINE}`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: `${oColor}1A`, border: `1px solid ${oColor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: oColor,
                  }}>
                    {getInitials(offer.offerer?.display_name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.txt }}>
                      {offer.offerer?.display_name ?? 'Anonymous'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: t.txtFaint }}>{timeAgo(offer.created_at)}</p>
                  </div>
                  {(() => {
                    const ss = statusStyle(offer.status);
                    return (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: ss.bg, color: ss.color }}>
                        {offer.status}
                      </span>
                    );
                  })()}
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: oColor }}>
                  {assetIcon(offer.offer_type)} {formatAsset(offer.offer_type, offer.offer_value)}
                </p>
                {offer.message && (
                  <p style={{ margin: '6px 0 10px', fontSize: 12, color: t.txtDim, fontStyle: 'italic' }}>
                    "{offer.message}"
                  </p>
                )}
                {offer.status === 'pending' && (
                  <button
                    disabled={acting === offer.id}
                    onClick={() => handleAccept(offer.id)}
                    style={{
                      width: '100%', padding: '8px', borderRadius: 10, cursor: 'pointer',
                      background: `${t.accent}1A`, border: `1px solid ${t.accent}33`, color: t.accent,
                      fontSize: 13, fontWeight: 700, opacity: acting === offer.id ? 0.5 : 1,
                    }}
                  >
                    <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    {acting === offer.id ? 'Accepting...' : 'Accept'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

export default function BarterPage() {
  const [tab, setTab] = useState<TabId>('browse');
  const [filter, setFilter] = useState<FilterType>('all');
  const [listings, setListings] = useState<BarterListing[]>([]);
  const [myListings, setMyListings] = useState<BarterListing[]>([]);
  const [myOffers, setMyOffers] = useState<(BarterOffer & { listing?: BarterListing })[]>([]);
  const [history, setHistory] = useState<BarterTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [offerTarget, setOfferTarget] = useState<BarterListing | null>(null);
  const [offersListing, setOffersListing] = useState<BarterListing | null>(null);

  const fetchTab = useCallback(async (which: TabId) => {
    setLoading(true);
    try {
      if (which === 'browse') {
        const r = await fetch('/api/economy/barter?view=listings');
        const d = await r.json();
        setListings(d ?? []);
      } else if (which === 'mine') {
        const r = await fetch('/api/economy/barter?view=mine');
        const d = await r.json();
        setMyListings(d ?? []);
      } else if (which === 'my_offers') {
        const r = await fetch('/api/economy/barter?view=my_offers');
        const d = await r.json();
        setMyOffers(d ?? []);
      } else if (which === 'history') {
        const r = await fetch('/api/economy/barter?view=transactions');
        const d = await r.json();
        setHistory(d ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTab(tab);
  }, [tab, fetchTab]);

  function handleTabChange(t: TabId) {
    setTab(t);
  }

  async function handleCancelListing(l: BarterListing) {
    await apiPost({ action: 'cancel_listing', listing_id: l.id });
    void fetchTab('mine');
  }

  async function handleWithdrawOffer(offer: BarterOffer) {
    await apiPost({ action: 'withdraw_offer', offer_id: offer.id });
    void fetchTab('my_offers');
  }

  const filteredListings = filter === 'all'
    ? listings
    : listings.filter(l => l.offer_type === filter);

  const TABS: { id: TabId; label: string }[] = [
    { id: 'browse', label: 'Browse' },
    { id: 'mine', label: 'My Listings' },
    { id: 'my_offers', label: 'My Offers' },
    { id: 'history', label: 'History' },
  ];

  return (
    <main className="consumer-app" style={{ background: t.bg, minHeight: '100dvh', paddingBottom: '5.5rem', color: t.txt }}>

      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(5,8,22,.94)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${LINE}`, padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeftRight size={18} style={{ color: t.accent }} />
          Barter Exchange
        </h1>
        <button
          onClick={() => setCreateOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 10, background: t.accent, border: 'none',
            color: t.bg, fontSize: 13, fontWeight: 800, cursor: 'pointer',
          }}
        >
          <Plus size={15} /> Post Trade
        </button>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px' }}>

        <div className="flex gap-2 overflow-x-auto no-scrollbar" style={{ padding: '14px 0 4px' }}>
          {TABS.map(({ id, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                style={{
                  padding: '7px 16px', borderRadius: 10, cursor: 'pointer', flexShrink: 0,
                  background: active ? t.accent : 'transparent',
                  border: `1px solid ${active ? t.accent : LINE}`,
                  color: active ? t.bg : t.txtDim,
                  fontSize: 13, fontWeight: 700, transition: 'all .15s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {tab === 'browse' && (
          <div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar" style={{ padding: '10px 0 14px' }}>
              {FILTER_OPTIONS.map(({ type, label }) => {
                const active = filter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    style={{
                      padding: '5px 14px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                      background: active ? `${t.accent}1A` : t.surface,
                      border: `1px solid ${active ? t.accent : LINE}`,
                      color: active ? t.accent : t.txtDim,
                      fontSize: 12, fontWeight: 700, transition: 'all .15s',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ borderRadius: 18, background: t.card, border: `1px solid ${LINE}`, padding: 14 }}>
                    <Skeleton h={10} w={80} radius={6} />
                    <div style={{ marginTop: 10 }}><Skeleton h={18} radius={6} /></div>
                    <div style={{ marginTop: 8 }}><Skeleton h={12} w="70%" radius={6} /></div>
                    <div style={{ marginTop: 12 }}><Skeleton h={36} radius={10} /></div>
                  </div>
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
                <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: t.txtDim }}>No listings yet</p>
                <p style={{ margin: 0, fontSize: 13, color: t.txtFaint }}>Be the first to post a trade</p>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', paddingBottom: 8 }}>
                {filteredListings.map(l => (
                  <BarterListingCard
                    key={l.id}
                    listing={l}
                    onMakeOffer={setOfferTarget}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'mine' && (
          <div style={{ paddingTop: 12 }}>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2].map(i => <Skeleton key={i} h={120} radius={18} />)}
              </div>
            ) : myListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: t.txtDim }}>No listings yet</p>
                <p style={{ margin: 0, fontSize: 13, color: t.txtFaint }}>Post a trade to start bartering</p>
                <button
                  onClick={() => setCreateOpen(true)}
                  style={{
                    marginTop: 16, padding: '10px 20px', borderRadius: 12,
                    background: t.accent, border: 'none', color: t.bg,
                    fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  }}
                >
                  <Plus size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  Post a Trade
                </button>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {myListings.map(l => (
                  <BarterListingCard
                    key={l.id}
                    listing={l}
                    isOwn
                    onViewOffers={setOffersListing}
                    onCancel={handleCancelListing}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'my_offers' && (
          <div style={{ paddingTop: 12 }}>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => <Skeleton key={i} h={100} radius={14} />)}
              </div>
            ) : myOffers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: t.txtDim }}>No offers yet</p>
                <p style={{ margin: 0, fontSize: 13, color: t.txtFaint }}>Browse listings and make your first offer</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myOffers.map(offer => {
                  const oColor = assetTypeColor(offer.offer_type);
                  const ss = statusStyle(offer.status);
                  return (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '14px', borderRadius: 16,
                        background: t.card, border: `1px solid ${LINE}`,
                      }}
                    >
                      {offer.listing && (
                        <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 10, background: t.surface }}>
                          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.06em' }}>On listing</p>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.txt }}>
                            {assetIcon(offer.listing.offer_type)} {formatAsset(offer.listing.offer_type, offer.listing.offer_value)}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: oColor }}>
                          {assetIcon(offer.offer_type)} {formatAsset(offer.offer_type, offer.offer_value)}
                        </p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: ss.bg, color: ss.color }}>
                          {offer.status}
                        </span>
                      </div>
                      {offer.message && (
                        <p style={{ margin: '0 0 8px', fontSize: 12, color: t.txtDim, fontStyle: 'italic' }}>"{offer.message}"</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 11, color: t.txtFaint }}>{timeAgo(offer.created_at)}</span>
                        {offer.status === 'pending' && (
                          <button
                            onClick={() => handleWithdrawOffer(offer)}
                            style={{
                              padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                              background: `${t.error}1A`, border: `1px solid ${t.error}33`, color: t.error,
                              fontSize: 12, fontWeight: 700,
                            }}
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div style={{ paddingTop: 12 }}>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => <Skeleton key={i} h={80} radius={14} />)}
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
                <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: t.txtDim }}>No trades yet</p>
                <p style={{ margin: 0, fontSize: 13, color: t.txtFaint }}>Completed trades appear here</p>
              </div>
            ) : (
              <div style={{ borderRadius: 16, background: t.card, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
                {history.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    style={{
                      padding: '12px 14px',
                      borderBottom: i < history.length - 1 ? `1px solid ${LINE}` : 'none',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                      background: `${t.accent}14`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ArrowLeftRight size={16} style={{ color: t.accent }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.error }}>
                          {assetIcon(tx.initiator_gave.type)} {formatAsset(tx.initiator_gave.type, tx.initiator_gave)}
                        </span>
                        <ArrowRight size={12} style={{ color: t.txtFaint, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.accent }}>
                          {assetIcon(tx.responder_gave.type)} {formatAsset(tx.responder_gave.type, tx.responder_gave)}
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: t.txtFaint }}>{timeAgo(tx.completed_at)}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${t.accent}14`, color: t.accent, flexShrink: 0 }}>
                      completed
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <CreateListingDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => { setCreateOpen(false); void fetchTab(tab); }}
      />

      <MakeOfferDrawer
        listing={offerTarget}
        onClose={() => setOfferTarget(null)}
        onSuccess={() => { setOfferTarget(null); void fetchTab('browse'); }}
      />

      <OffersDrawer
        listing={offersListing}
        onClose={() => setOffersListing(null)}
        onAccepted={() => { setOffersListing(null); void fetchTab('mine'); }}
      />

      <BottomNav />
    </main>
  );
}
