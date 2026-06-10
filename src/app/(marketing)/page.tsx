'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Check, Brain, BarChart3,
  ChevronRight, Shield, CheckCircle2, Radio,
  Clock, Award, Wallet,
  Users, TrendingUp, Activity,
  Share2, Flame, Eye,
} from 'lucide-react';

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const, delay: d } }),
};

function Sec({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} className={className} style={style}>
      {children}
    </motion.section>
  );
}

/* ─── platform layers ─── */
const LAYERS = [
  {
    num: '01', id: 'social', label: 'Social Intelligence Layer', accentColor: '#6D5DFD',
    headline: 'A performance feed, not a content feed.',
    body: 'Every post on X-hunt is a verified real-world achievement. Share mission completions, broadcast live hunts, and build a public performance record that other hunters and brands can see — not vanity metrics.',
    specs: [
      'Completion posts with mission metadata & MEI score',
      'Live streaming during active hunts — viewers can follow your steps',
      'Flame reactions tied to verified achievement, not popularity',
      'Hunter profiles publicly show completion rate, score, and earnings',
    ],
  },
  {
    num: '02', id: 'hunt', label: 'Location-Based Mission Engine', accentColor: '#22FFAA',
    headline: 'AI-generated, real-world, context-aware.',
    body: 'The Mission Architect AI builds unique multi-stage hunts based on your city, interests, and current capability level. Every checkpoint is a real location. Every clue is grounded in the physical world around you.',
    specs: [
      'GPS-anchored checkpoints with radius validation',
      'Dynamic clue generation based on real POI data',
      'Adaptive difficulty: mission complexity grows with your Hunter Score',
      'Offline mode with cached mission data for field use',
    ],
  },
  {
    num: '03', id: 'marketplace', label: 'Brand Mission Marketplace', accentColor: '#FFB84D',
    headline: 'Real gigs. Real escrow. Real pay.',
    body: 'Brands fund missions upfront into escrow. You accept, execute, and submit proof. The AI validation engine confirms your delivery, and escrow releases automatically. No invoicing. No chasing payments.',
    specs: [
      'Brand-posted missions with pre-funded escrow rewards',
      'Evidence submission: GPS, photo, review, log, or third-party check-in',
      'AI validation confirms every submission before release',
      'Hunter Score gates access to higher-value mission tiers',
    ],
  },
  {
    num: '04', id: 'ai', label: 'AI Outcome Orchestration', accentColor: '#a78bfa',
    headline: 'Six agents. One adaptive intelligence.',
    body: 'The Mission Architect, Behavioral Analyst, Outcome Planner, Experience Designer, Knowledge Agent, and Insight Analyst operate in parallel on every mission — building, monitoring, and adapting in real-time.',
    specs: [
      'Mission Architect: decomposes goals into structured action sequences',
      'Behavioral Analyst: monitors drop-off signals and adjusts difficulty',
      'Outcome Planner: maps KPIs and validates progress against targets',
      'MEI (Mission Effectiveness Index): composite score across all missions',
    ],
  },
  {
    num: '05', id: 'deliver', label: 'Verified Delivery & Escrow', accentColor: '#22FFAA',
    headline: 'Outcomes you can prove. Payments you can trust.',
    body: 'Every brand gig runs on a tamper-resistant outcome pipeline. AI validates evidence, escrow releases on confirmation, and your Hunter Score updates — building a portable, verifiable performance record.',
    specs: [
      'Multi-modal evidence: photo, GPS log, third-party API, review',
      'Confidence-scored validation: 0–100 AI outcome score per submission',
      'Smart escrow: partial or full release based on delivery conditions',
      'Hunter Score: reputation graph visible to all brands on the platform',
    ],
  },
];

const LIVE_MISSIONS = [
  {
    brand: 'FitLife Pro', brandInitials: 'FL', brandColor: '#22FFAA', category: 'Fitness',
    title: '30-Day Progressive Training Challenge',
    description: 'Complete 30 structured training sessions with daily photo evidence, nutrition logs, and a final performance assessment.',
    reward: 120, currency: 'USD', duration: '30 days', difficulty: 'Hard',
    huntersActive: 847, completionRate: 89, minScore: 3.5,
    tags: ['fitness', 'habits', 'health'], hot: true,
  },
  {
    brand: 'VisitLagos Tourism', brandInitials: 'VL', brandColor: '#FFB84D', category: 'Travel',
    title: 'Hidden Lagos: 12 Undocumented Spots',
    description: 'Locate, photograph, and write a 150-word review of 12 lesser-known Lagos locations using GPS check-ins.',
    reward: 75, currency: 'USD', duration: '14 days', difficulty: 'Medium',
    huntersActive: 234, completionRate: 76, minScore: 2.0,
    tags: ['travel', 'photography', 'local'], hot: false,
  },
  {
    brand: 'TechHub Events', brandInitials: 'TH', brandColor: '#6D5DFD', category: 'Tech',
    title: 'Attend, Review & Amplify: Quarterly Meetup',
    description: 'Attend the TechHub Q2 meetup, submit a verified check-in, post a 200-word review, and share a highlight on X-hunt Timeline.',
    reward: 40, currency: 'USD', duration: '3 days', difficulty: 'Easy',
    huntersActive: 156, completionRate: 94, minScore: 1.0,
    tags: ['tech', 'networking', 'review'], hot: false,
  },
  {
    brand: 'NutrientBox', brandInitials: 'NB', brandColor: '#a78bfa', category: 'Wellness',
    title: 'Product Trial: 21-Day Nutrition Protocol',
    description: 'Follow the NutrientBox protocol for 21 days, log daily meals with photos, and submit a final outcome assessment with biometric data.',
    reward: 95, currency: 'USD', duration: '21 days', difficulty: 'Medium',
    huntersActive: 312, completionRate: 82, minScore: 4.0,
    tags: ['nutrition', 'wellness', 'protocol'], hot: true,
  },
];

const SCORE_TIERS = [
  {
    tier: 'Explorer', range: '0 – 2.9', color: '#54625f', border: 'rgba(84,98,95,.3)', bg: 'rgba(84,98,95,.06)',
    access: 'Free community hunts, XP accumulation, public profile',
    gigs: 'Free missions only', earnings: '$0 / month',
  },
  {
    tier: 'Verified Hunter', range: '3.0 – 5.9', color: '#22FFAA', border: 'rgba(34,255,170,.3)', bg: 'rgba(34,255,170,.06)',
    access: 'Standard brand gig access, submission portal, basic AI coaching',
    gigs: '$10 – $100 missions', earnings: 'Avg. $80 / month',
  },
  {
    tier: 'Pro Hunter', range: '6.0 – 8.4', color: '#6D5DFD', border: 'rgba(109,93,253,.3)', bg: 'rgba(109,93,253,.06)',
    access: 'Premium gig library, priority validation, advanced AI agents, live hosting',
    gigs: '$100 – $500 missions', earnings: 'Avg. $320 / month',
  },
  {
    tier: 'Elite Hunter', range: '8.5 – 10.0', color: '#FFB84D', border: 'rgba(247,147,26,.3)', bg: 'rgba(247,147,26,.06)',
    access: 'Enterprise missions, direct brand deals, white-glove validation, escrow bonuses',
    gigs: '$500+ missions', earnings: 'Avg. $900 / month',
  },
];

/* ─── MissionCard ─── */
function MissionCard({ mission, index }: { mission: typeof LIVE_MISSIONS[0]; index: number }) {
  const diffColor = { Easy: '#22FFAA', Medium: '#FFB84D', Hard: '#FF5C7A' }[mission.difficulty] ?? '#7d8b8e';
  return (
    <motion.div
      variants={fadeUp} custom={index * 0.08}
      className="relative rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.12)]"
      style={{ background: '#0c1a1d', borderColor: `${mission.brandColor}20` }}
    >
      {mission.hot && (
        <div className="absolute -top-2.5 left-5 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full"
          style={{ background: mission.brandColor, color: '#050816' }}>Featured Gig</div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black flex-shrink-0"
            style={{ background: `${mission.brandColor}18`, border: `1px solid ${mission.brandColor}30`, color: mission.brandColor }}>
            {mission.brandInitials}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-txt-dim leading-none">{mission.brand}</p>
            <p className="text-[10px] text-txt-faint mt-0.5">{mission.category}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-black text-txt leading-none" style={{ color: mission.brandColor }}>${mission.reward}</p>
          <p className="text-[10px] text-txt-faint">USD · escrow</p>
        </div>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-txt leading-snug mb-2">{mission.title}</h3>
        <p className="text-[12px] text-txt-dim leading-relaxed line-clamp-2">{mission.description}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {mission.tags.map((t) => (
          <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', color: '#7d8b8e' }}>{t}</span>
        ))}
      </div>
      <div className="flex items-center gap-4 pt-4 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div className="flex items-center gap-1.5">
          <Clock size={11} strokeWidth={2} className="text-txt-faint" />
          <span className="text-[11px] text-txt-dim">{mission.duration}</span>
        </div>
        <div className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${diffColor}12`, color: diffColor }}>
          {mission.difficulty}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Users size={11} strokeWidth={2} className="text-txt-faint" />
          <span className="text-[11px] text-txt-dim">{mission.huntersActive.toLocaleString()} active</span>
        </div>
        <div className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,255,170,.08)', color: '#22FFAA' }}>
          {mission.completionRate}% rate
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-[11px]"
        style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
        <span className="text-txt-faint">Hunter Score required</span>
        <span className="font-bold" style={{ color: mission.brandColor }}>{mission.minScore}+</span>
      </div>
    </motion.div>
  );
}

/* ─── Phone Frame ─── */
function PhoneFrame({ children, tilt = 0, scale = 1, zIndex = 1 }: {
  children: React.ReactNode; tilt?: number; scale?: number; zIndex?: number;
}) {
  return (
    <div style={{
      transform: `rotate(${tilt}deg) scale(${scale})`,
      transformOrigin: 'center bottom',
      position: 'relative',
      zIndex,
      filter: 'drop-shadow(0 32px 64px rgba(0,0,0,0.7))',
    }}>
      {/* Phone shell */}
      <div style={{
        width: 240,
        height: 490,
        borderRadius: 40,
        background: '#0D1530',
        border: '2px solid rgba(255,255,255,0.12)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px rgba(34,255,170,0.04)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Notch pill */}
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          width: 72, height: 8, borderRadius: 4, background: '#000', zIndex: 10,
        }} />
        {/* Screen area */}
        <div style={{ position: 'absolute', inset: 0, overflowY: 'hidden', overflowX: 'hidden' }}>
          {children}
        </div>
        {/* Bottom home indicator */}
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          width: 80, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.25)', zIndex: 10,
        }} />
      </div>
    </div>
  );
}

/* ─── Screen: Mission Command Center (Home) ─── */
function HomeScreen() {
  return (
    <div style={{ background: '#050816', height: '100%', padding: '32px 0 0', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: '#4A5578', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Mission OS</p>
          <p style={{ margin: 0, fontSize: 13, color: '#F0F4FF', fontWeight: 800 }}>Command Center</p>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: 10, background: 'rgba(34,255,170,.12)', border: '1px solid rgba(34,255,170,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#22FFAA' }}>A</div>
      </div>

      {/* MMS Score ring */}
      <div style={{ margin: '0 16px 14px', padding: '12px 16px', borderRadius: 18, background: 'linear-gradient(135deg, rgba(34,255,170,.06) 0%, rgba(109,93,253,.06) 100%)', border: '1px solid rgba(34,255,170,.12)' }}>
        <p style={{ margin: '0 0 8px', fontSize: 8, color: '#22FFAA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em' }}>Mission Momentum Score</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* SVG progress ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="22" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <circle cx="26" cy="26" r="22" stroke="#22FFAA" strokeWidth="3" strokeLinecap="round"
                strokeDasharray="138.2" strokeDashoffset="42"
                transform="rotate(-90 26 26)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#22FFAA' }}>695</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#FFB84D', background: 'rgba(255,184,77,.1)', border: '1px solid rgba(255,184,77,.2)', borderRadius: 6, padding: '1px 6px' }}>Pro Hunter</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#F0F4FF' }}>12</p>
                <p style={{ margin: 0, fontSize: 8, color: '#4A5578' }}>Done</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#6D5DFD' }}>7 🔥</p>
                <p style={{ margin: 0, fontSize: 8, color: '#4A5578' }}>Streak</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#22FFAA' }}>$640</p>
                <p style={{ margin: 0, fontSize: 8, color: '#4A5578' }}>Earned</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active missions label */}
      <div style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 9, color: '#4A5578', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Active Missions</p>
        <span style={{ fontSize: 9, color: '#22FFAA' }}>See all →</span>
      </div>

      {/* Mission card 1 */}
      <div style={{ margin: '0 16px 8px', padding: '11px 13px', borderRadius: 14, background: '#0A1226', border: '1px solid rgba(34,255,170,.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(34,255,170,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🏋️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#F0F4FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>FitLife 30-Day Challenge</p>
            <p style={{ margin: 0, fontSize: 8, color: '#4A5578' }}>Day 18 of 30</p>
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#22FFAA' }}>$120</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.06)' }}>
          <div style={{ height: '100%', width: '60%', borderRadius: 2, background: 'linear-gradient(90deg, #22FFAA, #6D5DFD)' }} />
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 8, color: '#4A5578', textAlign: 'right' }}>60% complete</p>
      </div>

      {/* Mission card 2 */}
      <div style={{ margin: '0 16px 8px', padding: '11px 13px', borderRadius: 14, background: '#0A1226', border: '1px solid rgba(255,184,77,.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(255,184,77,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>📍</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#F0F4FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Hidden Lagos: 12 Spots</p>
            <p style={{ margin: 0, fontSize: 8, color: '#4A5578' }}>Checkpoint 6 of 12</p>
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#FFB84D' }}>$75</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.06)' }}>
          <div style={{ height: '100%', width: '50%', borderRadius: 2, background: 'linear-gradient(90deg, #FFB84D, #FF5C7A)' }} />
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 8, color: '#4A5578', textAlign: 'right' }}>50% complete</p>
      </div>

      {/* Recommended chip */}
      <div style={{ margin: '0 16px', padding: '9px 12px', borderRadius: 12, background: 'rgba(109,93,253,.06)', border: '1px solid rgba(109,93,253,.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 18, height: 18, borderRadius: 6, background: 'rgba(109,93,253,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><circle cx="4.5" cy="4.5" r="3" fill="#6D5DFD" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#a78bfa' }}>AI Recommended</p>
          <p style={{ margin: 0, fontSize: 8, color: '#4A5578' }}>NutrientBox Protocol — matches your score</p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#a78bfa' }}>$95</span>
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,.05)', background: 'rgba(5,8,22,.95)', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {[
          { icon: '⌂', label: 'Home', active: true },
          { icon: '◎', label: 'Explore', active: false },
          { icon: '⏱', label: 'Feed', active: false },
          { icon: '○', label: 'Profile', active: false },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 12, opacity: item.active ? 1 : 0.35, color: item.active ? '#22FFAA' : '#F0F4FF' }}>{item.icon}</span>
            <span style={{ fontSize: 7, color: item.active ? '#22FFAA' : '#4A5578', fontWeight: item.active ? 700 : 400 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Screen: Active Mission ─── */
function ActiveMissionScreen() {
  return (
    <div style={{ background: '#050816', height: '100%', fontFamily: 'inherit' }}>
      {/* Progress bar strip */}
      <div style={{ height: 3, background: '#0D1530' }}>
        <div style={{ height: '100%', width: '45%', background: 'linear-gradient(90deg, #22FFAA, #6D5DFD)', boxShadow: '0 0 8px rgba(34,255,170,.5)' }} />
      </div>

      {/* Header */}
      <div style={{ padding: '28px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 10, background: '#0A1226', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: '#8B9CC0' }}>←</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 9, color: '#4A5578', fontWeight: 600 }}>FITLIFE 30-DAY CHALLENGE</p>
          <p style={{ margin: 0, fontSize: 11, color: '#F0F4FF', fontWeight: 700 }}>Step 5 of 7</p>
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#22FFAA', background: 'rgba(34,255,170,.08)', border: '1px solid rgba(34,255,170,.15)', borderRadius: 8, padding: '3px 8px' }}>
          Day 18
        </div>
      </div>

      {/* Step dots */}
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 4 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < 4 ? '#22FFAA' : i === 4 ? 'rgba(34,255,170,.5)' : 'rgba(255,255,255,.08)',
          }} />
        ))}
      </div>

      {/* Current step card */}
      <div style={{ margin: '0 16px 12px', padding: '14px', borderRadius: 18, background: 'rgba(34,255,170,.05)', border: '1px solid rgba(34,255,170,.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 8, fontWeight: 800, color: '#22FFAA', background: 'rgba(34,255,170,.1)', borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '.08em' }}>Discovery</span>
          <span style={{ fontSize: 8, color: '#4A5578' }}>Current step</span>
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#F0F4FF', lineHeight: 1.4 }}>Complete today&apos;s workout session and upload your post-exercise biometrics</p>
        <p style={{ margin: 0, fontSize: 10, color: '#8B9CC0', lineHeight: 1.5 }}>Submit photo evidence + your heart rate data within 2 hours of completing the session.</p>
      </div>

      {/* GPS map placeholder */}
      <div style={{ margin: '0 16px 12px', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)', position: 'relative', height: 82 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #07101F 0%, #0A1226 100%)' }}>
          {/* Grid lines mimicking map */}
          {[0, 1, 2, 3].map(i => (
            <div key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: `${25 * i}%`, height: 1, background: 'rgba(34,255,170,0.06)' }} />
          ))}
          {[0, 1, 2, 3, 4].map(i => (
            <div key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${25 * i}%`, width: 1, background: 'rgba(34,255,170,0.06)' }} />
          ))}
          {/* Location pin */}
          <div style={{ position: 'absolute', top: '50%', left: '55%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#22FFAA', boxShadow: '0 0 12px rgba(34,255,170,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <span style={{ fontSize: 9 }}>📍</span>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,255,170,.1)', border: '1px solid rgba(34,255,170,.25)', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: -1 }} />
          </div>
          {/* GPS label */}
          <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 8, color: '#22FFAA', background: 'rgba(5,8,22,.8)', padding: '2px 6px', borderRadius: 5, fontWeight: 700 }}>
            GPS · 12m accuracy
          </div>
        </div>
      </div>

      {/* AI Adapt chip */}
      <div style={{ margin: '0 16px 14px', padding: '9px 12px', borderRadius: 12, background: 'rgba(109,93,253,.06)', border: '1px solid rgba(109,93,253,.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12 }}>🤖</span>
        <div>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#a78bfa' }}>AI Adapt</p>
          <p style={{ margin: 0, fontSize: 8, color: '#4A5578' }}>Difficulty adjusted — you&apos;re on a 7-day streak</p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ margin: '0 16px' }}>
        <div style={{ height: 40, borderRadius: 14, background: '#22FFAA', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#050816' }}>Submit Evidence</span>
          <span style={{ fontSize: 11, color: '#050816' }}>→</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Screen: Hunter Profile ─── */
function ProfileScreen() {
  return (
    <div style={{ background: '#050816', height: '100%', fontFamily: 'inherit', overflowY: 'hidden' }}>
      {/* Profile header */}
      <div style={{ padding: '28px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg, #22FFAA, #6D5DFD)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#050816' }}>A</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#F0F4FF' }}>Adeola Okonkwo</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#6D5DFD', background: 'rgba(109,93,253,.1)', border: '1px solid rgba(109,93,253,.2)', borderRadius: 6, padding: '1px 6px' }}>Pro Hunter</span>
              <span style={{ fontSize: 9, color: '#4A5578' }}>@adeola_hunts</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 8, color: '#4A5578' }}>Hunter Score</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#6D5DFD' }}>7.4</p>
          </div>
        </div>

        {/* MMS hero */}
        <div style={{ padding: '10px 14px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(34,255,170,.06), rgba(109,93,253,.06))', border: '1px solid rgba(34,255,170,.1)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <p style={{ margin: 0, fontSize: 8, color: '#22FFAA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Mission Momentum</p>
            <span style={{ fontSize: 9, color: '#22FFAA' }}>+40 this week</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 5 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#22FFAA', letterSpacing: '-1px' }}>695</span>
            <span style={{ fontSize: 9, color: '#4A5578' }}>/ 1000 MMS</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.06)' }}>
            <div style={{ height: '100%', width: '69.5%', borderRadius: 2, background: 'linear-gradient(90deg, #22FFAA, #6D5DFD)' }} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
          {[
            { value: '12', label: 'Completed', color: '#22FFAA' },
            { value: '$640', label: 'Earned', color: '#FFB84D' },
            { value: '94%', label: 'Completion', color: '#6D5DFD' },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 6px', borderRadius: 10, background: '#0A1226', border: '1px solid rgba(255,255,255,.06)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 7, color: '#4A5578', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent missions */}
        <p style={{ margin: '0 0 7px', fontSize: 8, color: '#4A5578', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Recent Completions</p>
        {[
          { title: 'FitLife — Day 18', reward: '$120', color: '#22FFAA', status: 'Active' },
          { title: 'TechHub Meetup', reward: '$40', color: '#6D5DFD', status: 'Validated ✓' },
          { title: 'Lagos Photography', reward: '$75', color: '#FFB84D', status: 'Validated ✓' },
        ].map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < 2 ? 6 : 0, padding: '8px 10px', borderRadius: 10, background: '#0A1226', border: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 9, color: '#F0F4FF', fontWeight: 600, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{m.title}</p>
            <span style={{ fontSize: 8, color: '#4A5578', whiteSpace: 'nowrap' }}>{m.status}</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: m.color, whiteSpace: 'nowrap' }}>{m.reward}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── App Mocks Section ─── */
function AppMocksSection() {
  const [activeScreen, setActiveScreen] = useState(0);
  const screens = [
    { id: 'home', label: 'Command Center', desc: 'Your mission dashboard with live MMS tracking, active hunts, and AI-powered recommendations.', component: <HomeScreen /> },
    { id: 'active', label: 'Active Mission', desc: 'Step-by-step mission execution with GPS anchoring, AI coaching, and evidence submission flow.', component: <ActiveMissionScreen /> },
    { id: 'profile', label: 'Hunter Profile', desc: 'Your verified performance record — MMS score, tier, earnings, and completion history.', component: <ProfileScreen /> },
  ];

  return (
    <Sec className="py-28 lg:py-36 overflow-hidden" style={{ background: '#050816' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <motion.p variants={fadeUp} className="text-[11px] font-bold text-txt-faint uppercase tracking-widest mb-3">
            In-App Experience
          </motion.p>
          <motion.h2 variants={fadeUp} custom={0.06} className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-black text-txt leading-tight tracking-tight mb-4">
            Built for hunters on the move.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-ai">Every screen earns.</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={0.12} className="text-[14px] text-txt-dim max-w-[480px] mx-auto">
            The X-hunt app is a fully integrated mission OS — from AI-powered recommendations to GPS-verified completions and automatic escrow release.
          </motion.p>
        </div>

        {/* Screen tabs */}
        <motion.div variants={fadeUp} custom={0.16} className="flex justify-center gap-2 mb-12">
          {screens.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveScreen(i)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200"
              style={{
                background: activeScreen === i ? 'rgba(34,255,170,.1)' : 'rgba(255,255,255,.03)',
                border: `1px solid ${activeScreen === i ? 'rgba(34,255,170,.25)' : 'rgba(255,255,255,.07)'}`,
                color: activeScreen === i ? '#22FFAA' : '#8B9CC0',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* Phones + description */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Phones cluster */}
          <motion.div variants={fadeUp} custom={0.2} className="flex-shrink-0 relative" style={{ height: 540 }}>
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(34,255,170,.07) 0%, transparent 65%)', transform: 'scale(1.4)' }} />

            <div className="relative flex items-end justify-center gap-6" style={{ height: 540 }}>
              {/* Left phone — prev screen */}
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={`left-${(activeScreen + screens.length - 1) % screens.length}`}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 0.45, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                  className="hidden md:block"
                >
                  <PhoneFrame tilt={-6} scale={0.82} zIndex={1}>
                    {screens[(activeScreen + screens.length - 1) % screens.length].component}
                  </PhoneFrame>
                </motion.div>
              </AnimatePresence>

              {/* Center phone — active screen */}
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={`center-${activeScreen}`}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.96 }}
                  transition={{ duration: 0.45, ease: 'easeOut' as const }}
                  style={{ zIndex: 3, position: 'relative' }}
                >
                  <PhoneFrame tilt={0} scale={1} zIndex={3}>
                    {screens[activeScreen].component}
                  </PhoneFrame>
                </motion.div>
              </AnimatePresence>

              {/* Right phone — next screen */}
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={`right-${(activeScreen + 1) % screens.length}`}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 0.45, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.4 }}
                  className="hidden md:block"
                >
                  <PhoneFrame tilt={6} scale={0.82} zIndex={1}>
                    {screens[(activeScreen + 1) % screens.length].component}
                  </PhoneFrame>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {screens.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveScreen(i)}
                  style={{
                    width: i === activeScreen ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === activeScreen ? '#22FFAA' : 'rgba(255,255,255,.15)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Text description */}
          <div className="flex-1 max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeScreen}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
              >
                <div
                  className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-5"
                  style={{ background: 'rgba(34,255,170,.08)', color: '#22FFAA', border: '1px solid rgba(34,255,170,.2)' }}
                >
                  {screens[activeScreen].label}
                </div>
                <p className="text-[1.05rem] text-txt-dim leading-relaxed mb-8">
                  {screens[activeScreen].desc}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="flex flex-col gap-3">
              {[
                { icon: '⚡', title: 'Mission Momentum Score', body: 'Real-time composite score tracking streaks, completions, and earnings across every hunt.' },
                { icon: '📍', title: 'GPS-Verified Checkpoints', body: 'Every location visit is cryptographically anchored — no fakes, no shortcuts.' },
                { icon: '🤖', title: 'AI Adapt Engine', body: 'Difficulty, coaching, and next-mission recommendations update after every action you take.' },
                { icon: '💸', title: 'Auto Escrow Release', body: 'Evidence confirmed → escrow unlocks instantly. No invoices, no chasing brands.' },
              ].map((feat, i) => (
                <motion.div
                  key={feat.title}
                  variants={fadeUp}
                  custom={0.24 + i * 0.07}
                  className="flex items-start gap-4 p-4 rounded-xl border transition-all hover:border-[rgba(255,255,255,.1)]"
                  style={{ background: 'rgba(255,255,255,.02)', borderColor: 'rgba(255,255,255,.06)' }}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">{feat.icon}</span>
                  <div>
                    <p className="text-[13px] font-bold text-txt mb-1">{feat.title}</p>
                    <p className="text-[12px] text-txt-dim leading-relaxed">{feat.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} custom={0.52} className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/get-started"
                className="flex items-center gap-2.5 h-12 px-6 bg-accent text-[#050816] rounded-xl text-[14px] font-bold shadow-[0_0_24px_rgba(34,255,170,0.3)] hover:shadow-[0_0_40px_rgba(34,255,170,0.5)] hover:bg-accent-dark transition-all"
              >
                Start Hunting Free
                <ArrowRight size={15} strokeWidth={2.8} />
              </Link>
              <Link
                href="/missions"
                className="flex items-center gap-2.5 h-12 px-5 border text-txt-dim rounded-xl text-[14px] font-semibold hover:text-txt transition-all"
                style={{ background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.09)' }}
              >
                Browse Live Missions
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </Sec>
  );
}

/* ─── PAGE ─── */
export default function RootPage() {
  const [activeLayer, setActiveLayer] = useState(0);
  const layer = LAYERS[activeLayer];

  return (
    <div className="bg-muted text-txt overflow-x-hidden">

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: 'linear-gradient(rgba(34,255,170,1) 1px,transparent 1px),linear-gradient(90deg,rgba(34,255,170,1) 1px,transparent 1px)',
              backgroundSize: '52px 52px',
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, x: 80 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute"
            style={{ right: '-8%', top: '50%', transform: 'translateY(-54%)', width: '54%', maxWidth: 760, zIndex: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/depth-orb.webp"
              alt=""
              aria-hidden
              style={{ width: '100%', height: 'auto', opacity: 0.55, mixBlendMode: 'luminosity', filter: 'saturate(1.4) brightness(0.9)' }}
            />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at right center, transparent 20%, #050816 72%)' }} />
          </motion.div>
          <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 blur-[140px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-ai/4 blur-[100px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-24 lg:py-32 w-full">
          <div className="max-w-[660px]">
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 mb-10"
              style={{ background: 'rgba(34,255,170,.06)', border: '1px solid rgba(34,255,170,.15)', borderRadius: 999, padding: '6px 16px' }}
            >
              <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              <span className="text-[11px] font-semibold text-accent tracking-wider uppercase">Consumer Platform · Open Beta</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
              className="text-[clamp(2.8rem,5.5vw,4.8rem)] font-black text-txt leading-[1.04] tracking-tighter mb-8"
            >
              Every real-world
              <br />outcome has a
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-accent to-ai">
                verified price.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.22 }}
              className="text-[1.05rem] text-txt-dim leading-relaxed max-w-[540px] mb-4"
            >
              X-hunt is a high-performance marketplace for individuals — combining a social achievement feed, AI-orchestrated real-world missions, a brand gig economy, and a tamper-resistant outcome delivery system.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
              className="text-[13px] text-txt-faint mb-10"
            >
              Build your Hunter Score. Unlock higher-value missions. Get paid when AI confirms your delivery.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.38 }}
              className="flex flex-wrap gap-x-8 gap-y-3 mb-12"
            >
              {[
                { value: '$1.2M', label: 'Paid to hunters this month' },
                { value: '94%', label: 'AI validation pass rate' },
                { value: '48', label: 'Countries active' },
                { value: '2.4M', label: 'Missions completed' },
              ].map((m) => (
                <div key={m.label}>
                  <p className="text-[1.5rem] font-black text-txt tracking-tight leading-none mb-1">{m.value}</p>
                  <p className="text-[11px] text-txt-faint">{m.label}</p>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.46 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                href="/get-started"
                className="flex items-center gap-2.5 h-13 px-7 bg-accent text-[#050816] rounded-xl text-[15px] font-bold shadow-[0_0_28px_rgba(34,255,170,0.3)] hover:shadow-[0_0_44px_rgba(34,255,170,0.5)] hover:bg-accent-dark transition-all duration-200"
              >
                Start as a Hunter
                <ArrowRight size={16} strokeWidth={2.8} />
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-2.5 h-13 px-6 border text-txt-dim rounded-xl text-[15px] font-semibold hover:text-txt transition-all duration-200"
                style={{ background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.09)' }}
              >
                View Earnings Model
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.62 }}
              className="mt-5 text-[12px] text-txt-faint"
            >
              Already hunting?{' '}
              <Link href="/home" className="text-accent underline underline-offset-2 hover:text-accent-dark transition-colors">
                Open your dashboard →
              </Link>
            </motion.p>
          </div>
        </div>
      </section>

      {/* ─── APP MOCKS ─── */}
      <AppMocksSection />

      {/* ─── PLATFORM ARCHITECTURE ─── */}
      <Sec className="py-28 lg:py-36 border-y border-[rgba(255,255,255,0.05)]" style={{ background: '#07101F' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[320px_1fr] gap-12 lg:gap-16">
            <div>
              <motion.p variants={fadeUp} className="text-[11px] font-bold text-txt-faint uppercase tracking-widest mb-4">Platform Architecture</motion.p>
              <motion.h2 variants={fadeUp} custom={0.06} className="text-[clamp(1.7rem,3vw,2.4rem)] font-black text-txt leading-tight tracking-tight mb-8">
                Five integrated systems. One seamless experience.
              </motion.h2>
              <div className="flex flex-col gap-1">
                {LAYERS.map((l, i) => {
                  const active = i === activeLayer;
                  return (
                    <motion.button
                      key={l.id} variants={fadeUp} custom={0.1 + i * 0.06}
                      onClick={() => setActiveLayer(i)}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 w-full"
                      style={{
                        background: active ? `${l.accentColor}0d` : 'transparent',
                        border: `1px solid ${active ? l.accentColor + '25' : 'transparent'}`,
                        fontFamily: 'inherit', cursor: 'pointer',
                      }}
                    >
                      <span className="text-[11px] font-black tabular-nums flex-shrink-0" style={{ color: active ? l.accentColor : '#54625f' }}>{l.num}</span>
                      <span className="text-[13px] font-semibold transition-colors" style={{ color: active ? l.accentColor : '#7d8b8e' }}>{l.label}</span>
                      {active && <ChevronRight size={14} strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: l.accentColor }} />}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeLayer}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35 }}
                className="rounded-2xl p-8 lg:p-10"
                style={{ background: '#0c1a1d', border: `1px solid ${layer.accentColor}18` }}
              >
                <div className="inline-block text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-6"
                  style={{ background: `${layer.accentColor}12`, color: layer.accentColor, border: `1px solid ${layer.accentColor}25` }}>
                  {layer.num} / {layer.label}
                </div>
                <h3 className="text-[clamp(1.4rem,2.5vw,2rem)] font-black text-txt leading-tight tracking-tight mb-4">{layer.headline}</h3>
                <p className="text-[14px] text-txt-dim leading-relaxed mb-8">{layer.body}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {layer.specs.map((spec) => (
                    <div key={spec} className="flex items-start gap-3 p-4 rounded-xl"
                      style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${layer.accentColor}18` }}>
                        <Check size={9} strokeWidth={3} style={{ color: layer.accentColor }} />
                      </div>
                      <p className="text-[12px] text-txt-dim leading-relaxed">{spec}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Sec>

      {/* ─── LIVE MISSION MARKETPLACE ─── */}
      <Sec className="py-28 lg:py-36">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div>
              <motion.p variants={fadeUp} className="text-[11px] font-bold text-txt-faint uppercase tracking-widest mb-3">Live Mission Marketplace</motion.p>
              <motion.h2 variants={fadeUp} custom={0.06} className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-black text-txt leading-tight tracking-tight">
                Real gigs. Funded escrow.
                <br />AI-validated outcomes.
              </motion.h2>
            </div>
            <motion.div variants={fadeUp} custom={0.1}>
              <Link href="/missions" className="flex items-center gap-2 text-[13px] font-semibold text-accent hover:text-accent-dark transition-colors">
                Browse all open missions <ChevronRight size={14} strokeWidth={2.5} />
              </Link>
            </motion.div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 lg:gap-5">
            {LIVE_MISSIONS.map((m, i) => <MissionCard key={m.title} mission={m} index={i} />)}
          </div>
          <motion.div variants={fadeUp} custom={0.5} className="flex flex-wrap items-center gap-6 mt-10 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
            {[
              { icon: Shield, label: 'All rewards held in verified escrow before mission starts' },
              { icon: CheckCircle2, label: 'AI validation confirms every evidence item before release' },
              { icon: Award, label: 'Hunter Score tracks your verified delivery record permanently' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-[12px] text-txt-dim">
                <Icon size={13} strokeWidth={2} className="text-txt-faint flex-shrink-0" />{label}
              </div>
            ))}
          </motion.div>
        </div>
      </Sec>

      {/* ─── HUNTER SCORE / EARNINGS MODEL ─── */}
      <Sec className="py-28 lg:py-36 border-y border-[rgba(255,255,255,0.05)]" style={{ background: '#050816' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-[11px] font-bold text-txt-faint uppercase tracking-widest mb-3">Revenue Model</motion.p>
            <motion.h2 variants={fadeUp} custom={0.06} className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-black text-txt leading-tight tracking-tight mb-4">
              Your Hunter Score determines
              <br />the missions you can access.
            </motion.h2>
            <motion.p variants={fadeUp} custom={0.12} className="text-[14px] text-txt-dim max-w-[500px] mx-auto">
              Hunter Score is a composite of completion rate, evidence quality, MEI, and peer feedback. It is public, verifiable, and builds over every mission you complete.
            </motion.p>
          </div>
          <div className="flex flex-col gap-3 max-w-4xl mx-auto">
            {SCORE_TIERS.map((tier, i) => (
              <motion.div key={tier.tier} variants={fadeUp} custom={i * 0.08}
                className="grid grid-cols-1 md:grid-cols-[200px_1fr_140px_140px] gap-4 items-center p-5 rounded-2xl border transition-all hover:border-[rgba(255,255,255,.1)]"
                style={{ background: tier.bg, borderColor: tier.border }}>
                <div>
                  <p className="text-[13px] font-bold mb-0.5" style={{ color: tier.color }}>{tier.tier}</p>
                  <p className="text-[11px] font-mono" style={{ color: `${tier.color}80` }}>Score {tier.range}</p>
                </div>
                <p className="text-[12px] text-txt-dim leading-relaxed">{tier.access}</p>
                <div className="text-center">
                  <p className="text-[11px] text-txt-faint mb-0.5">Gig access</p>
                  <p className="text-[13px] font-bold" style={{ color: tier.color }}>{tier.gigs}</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-txt-faint mb-0.5">Average earnings</p>
                  <p className="text-[15px] font-black" style={{ color: tier.color }}>{tier.earnings}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.p variants={fadeUp} custom={0.4} className="text-center text-[12px] text-txt-faint mt-8">
            Score is recalculated after every mission. Starts at 0, no cap. Top 5% of hunters hold an Elite tier score.
          </motion.p>
        </div>
      </Sec>

      {/* ─── SOCIAL & LIVE LAYER ─── */}
      <Sec className="py-28 lg:py-36">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.p variants={fadeUp} className="text-[11px] font-bold text-txt-faint uppercase tracking-widest mb-4">Social Intelligence Layer</motion.p>
              <motion.h2 variants={fadeUp} custom={0.06} className="text-[clamp(1.7rem,3.2vw,2.6rem)] font-black text-txt leading-tight tracking-tight mb-6">
                Your performance is your content.
                <br />Your community is your leverage.
              </motion.h2>
              <motion.p variants={fadeUp} custom={0.12} className="text-[14px] text-txt-dim leading-relaxed mb-8">
                Every mission completion, live session, and highlight on X-hunt builds a public performance record that brands actively scout. The more visible your outcomes, the higher-value the gigs you attract.
              </motion.p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Activity, label: 'Completion Feed', desc: 'Verified posts, not self-reported claims' },
                  { icon: Radio, label: 'Live Sessions', desc: 'Stream hunts, earn from Pro-only viewers' },
                  { icon: Share2, label: 'Moment Sharing', desc: 'Real-time updates during missions' },
                  { icon: Eye, label: 'Brand Visibility', desc: 'Scouts browse top hunter profiles' },
                ].map((item, i) => (
                  <motion.div key={item.label} variants={fadeUp} custom={0.18 + i * 0.07}
                    className="p-4 rounded-xl border"
                    style={{ background: 'rgba(255,255,255,.02)', borderColor: 'rgba(255,255,255,.06)' }}>
                    <item.icon size={16} strokeWidth={1.8} className="text-txt-faint mb-2.5" />
                    <p className="text-[13px] font-bold text-txt mb-1">{item.label}</p>
                    <p className="text-[11px] text-txt-dim leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div variants={fadeUp} custom={0.2} className="relative">
              <div className="absolute inset-0 rounded-3xl blur-3xl scale-105 -z-10"
                style={{ background: 'radial-gradient(ellipse, rgba(109,93,253,.06) 0%, transparent 70%)' }} />
              <div className="rounded-2xl overflow-hidden"
                style={{ background: '#0c1a1d', border: '1px solid rgba(255,255,255,.07)', boxShadow: '0 24px 80px rgba(0,0,0,.55)' }}>
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#e9eff0' }}>Timeline</span>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, border: 'none', background: '#ff3b30', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                    Go Live
                  </button>
                </div>
                {[
                  { initials: 'AO', color: '#22FFAA', name: 'Adeola O.', time: '4m ago', badge: 'Completed', badgeColor: '#22FFAA', text: 'FitLife 30-Day Challenge — Day 30 submitted. Waiting on AI validation.', xp: 480, reactions: 64 },
                  { initials: 'MV', color: '#6D5DFD', name: 'Marcus V.', time: 'Live', badge: '● LIVE', badgeColor: '#ff3b30', isLive: true, text: 'Hidden Lagos: Checkpoint 6 of 12 — Found the Balogun Market entrance mural', viewers: 218 },
                  { initials: 'RM', color: '#a78bfa', name: 'Ryan M.', time: '32m ago', badge: 'Highlight', badgeColor: '#FFB84D', text: 'Hunter Score just crossed 6.0 — unlocked Pro tier gigs. First mission: $180 product trial.', reactions: 102 },
                ].map((post, i) => (
                  <div key={i} style={{ padding: '14px 20px', borderBottom: i < 2 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: `${post.color}18`, border: `1px solid ${post.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: post.color }}>{post.initials}</div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e9eff0' }}>{post.name}</span>
                        <span style={{ fontSize: 11, color: '#54625f', marginLeft: 8 }}>{post.time}</span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: post.badgeColor, background: `${post.badgeColor}15`, border: `1px solid ${post.badgeColor}25`, borderRadius: 8, padding: '2px 8px' }}>{post.badge}</span>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: 12.5, color: '#7d8b8e', lineHeight: 1.5 }}>{post.text}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {'reactions' in post && post.reactions !== undefined && (
                        <span style={{ fontSize: 12, color: '#54625f', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Flame size={13} style={{ color: '#FFB84D' }} /> {post.reactions}
                        </span>
                      )}
                      {'viewers' in post && post.viewers !== undefined && (
                        <span style={{ fontSize: 12, color: '#54625f', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Eye size={13} /> {post.viewers} watching
                        </span>
                      )}
                      {'xp' in post && post.xp !== undefined && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#22FFAA', marginLeft: 'auto' }}>+{post.xp} XP</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </Sec>

      {/* ─── VALIDATION & TRUST ─── */}
      <Sec className="py-28 lg:py-36 border-y border-[rgba(255,255,255,.05)]" style={{ background: '#050816' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-[11px] font-bold text-txt-faint uppercase tracking-widest mb-3">Validation Infrastructure</motion.p>
            <motion.h2 variants={fadeUp} custom={0.06} className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-black text-txt leading-tight tracking-tight">
              The outcome delivery system
              <br />brands actually trust.
            </motion.h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {[
              { icon: Brain, color: '#a78bfa', title: 'AI Outcome Validation', desc: 'Multi-modal evidence reviewed by the Outcome AI — photo authenticity, GPS accuracy, content quality, and contextual consistency all scored before any payment releases.' },
              { icon: Wallet, color: '#22FFAA', title: 'Pre-Funded Escrow', desc: 'Brand rewards are held in escrow before the mission goes live. Hunters are never paid from unfunded accounts. Disputes trigger a neutral AI arbitration process.' },
              { icon: BarChart3, color: '#6D5DFD', title: 'Mission Effectiveness Index', desc: 'Your MEI is a composite of completion (40%), engagement (25%), retention (20%), and outcome attainment (15%). It is a direct input to your Hunter Score.' },
              { icon: Shield, color: '#FFB84D', title: 'Tamper-Resistant Records', desc: 'All validation decisions, evidence submissions, and score changes are logged immutably. Brands can audit the full proof chain for any mission they have funded.' },
              { icon: Award, color: '#22FFAA', title: 'Portable Hunter Score', desc: 'Your score follows you. New brands, new categories, new gig tiers — your verified track record travels with you, independently of any single brand relationship.' },
              { icon: TrendingUp, color: '#6D5DFD', title: 'Adaptive Difficulty Engine', desc: 'As your score rises, mission specs tighten to match your capability. Elite hunters work to stricter evidence standards and earn proportionally higher rewards.' },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i * 0.07}
                className="rounded-2xl p-6 border transition-all hover:border-[rgba(255,255,255,.1)]"
                style={{ background: '#0c1a1d', borderColor: `${item.color}18` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: `${item.color}12` }}>
                  <item.icon size={20} strokeWidth={1.8} style={{ color: item.color }} />
                </div>
                <p className="text-[14px] font-bold text-txt mb-2">{item.title}</p>
                <p className="text-[12.5px] text-txt-dim leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Sec>

      {/* ─── CTA ─── */}
      <Sec className="py-28 lg:py-36 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }}
            className="absolute"
            style={{ right: '-10%', top: '50%', transform: 'translateY(-50%)', width: '45%', maxWidth: 560, zIndex: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/depth-orb.webp" alt="" aria-hidden style={{ width: '100%', height: 'auto', opacity: 0.18, mixBlendMode: 'screen', filter: 'saturate(1.6)' }} />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/80 to-transparent" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-6 lg:px-8">
          <motion.p variants={fadeUp} className="text-[11px] font-bold text-txt-faint uppercase tracking-widest mb-5">Join the Platform</motion.p>
          <motion.h2 variants={fadeUp} custom={0.07}
            className="text-[clamp(2.2rem,5vw,3.8rem)] font-black text-txt leading-[1.04] tracking-tighter mb-6">
            Your city is full of
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-ai">funded missions.</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={0.14} className="text-[14px] text-txt-dim max-w-[440px] mb-4">
            Start as a free explorer. Build your Hunter Score. Unlock brand gigs. Get paid for outcomes you can prove.
          </motion.p>
          <motion.p variants={fadeUp} custom={0.2} className="text-[12px] text-txt-faint mb-10">
            Free to start · No credit card required · First hunt generates in under 15 seconds
          </motion.p>
          <motion.div variants={fadeUp} custom={0.26} className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/get-started"
              className="flex items-center justify-center gap-2.5 h-13 px-8 bg-accent text-[#050816] rounded-xl text-[15px] font-bold shadow-[0_0_32px_rgba(34,255,170,0.3)] hover:shadow-[0_0_48px_rgba(34,255,170,0.5)] hover:bg-accent-dark transition-all"
            >
              Start as a Hunter <ArrowRight size={16} strokeWidth={2.8} />
            </Link>
            <Link
              href="/enterprise"
              className="flex items-center justify-center gap-2.5 h-13 px-7 border text-txt-dim rounded-xl text-[15px] font-semibold hover:text-txt transition-all"
              style={{ background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.09)' }}
            >
              Post a Brand Mission <ChevronRight size={15} strokeWidth={2.5} />
            </Link>
          </motion.div>
        </div>
      </Sec>
    </div>
  );
}
