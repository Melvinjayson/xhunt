'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Users, ChevronRight } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const, delay: d } }),
};

function Sec({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} className={className}>
      {children}
    </motion.section>
  );
}

const FEATURED_MISSIONS = [
  { title: '30-Day Fitness Reset', category: 'Fitness & Health', creator: 'Health OS', completions: '12.4K', rating: '4.9', emoji: '💪', tag: 'Featured' },
  { title: 'Startup Ideation Sprint', category: 'Tech & Innovation', creator: 'Founder Labs', completions: '8.2K', rating: '4.8', emoji: '🚀', tag: 'Trending' },
  { title: 'Learn Python in 21 Days', category: 'Learning & Skills', creator: 'DevPath', completions: '24.1K', rating: '4.9', emoji: '🐍', tag: 'Popular' },
  { title: 'Mindful Morning Ritual', category: 'Mindfulness', creator: 'WellnessOS', completions: '18.7K', rating: '4.7', emoji: '🧘', tag: 'Top Rated' },
  { title: 'City Explorer Challenge', category: 'Adventure', creator: 'Urban Hunt', completions: '6.8K', rating: '4.8', emoji: '🗺️', tag: 'New' },
  { title: 'Sales Mastery Programme', category: 'Business', creator: 'SalesOS', completions: '5.1K', rating: '4.9', emoji: '💼', tag: 'Professional' },
];

const CREATOR_TYPES = [
  { icon: '✍️', title: 'Individual Creators', desc: 'Build and monetise personalised mission experiences. Share your expertise as structured, outcome-driven hunts.' },
  { icon: '🏢', title: 'Brands & Companies', desc: 'Launch branded mission programmes that deepen customer relationships and drive measurable engagement outcomes.' },
  { icon: '🎓', title: 'Educators & Coaches', desc: 'Transform your curriculum and coaching frameworks into scalable, AI-powered mission experiences.' },
  { icon: '🌐', title: 'NGOs & Governments', desc: 'Run verified behavioural change programmes with outcome tracking and evidence-based impact reporting.' },
];

export default function MarketplacePage() {
  return (
    <div className="bg-muted text-txt overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[700px] h-[500px] bg-accent/4 blur-[110px] rounded-full" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-ai/3 blur-[100px] rounded-full" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="max-w-[680px]">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-full px-3 py-1 mb-8"
            >
              <span className="text-[10px] font-bold text-txt-faint uppercase tracking-wider">Coming Soon</span>
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Q3 2025</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-black text-txt leading-[1.04] tracking-tighter mb-6"
            >
              The Mission
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-dark">
                Marketplace.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="text-[1.05rem] text-txt-dim leading-relaxed mb-10 max-w-[540px]"
            >
              An open ecosystem where mission creators, brands, educators, and communities publish, discover, and run outcome-driven experiences. For every goal, there&apos;s a mission.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28 }}
              className="flex flex-wrap gap-3"
            >
              <Link href="/get-started" className="flex items-center gap-2 h-12 px-6 bg-accent text-[#050816] rounded-xl text-[14px] font-bold shadow-[0_0_24px_rgba(34,255,170,0.3)] hover:bg-accent-dark transition-all">
                Join the Waitlist <ArrowRight size={14} strokeWidth={2.8} />
              </Link>
              <Link href="/contact" className="flex items-center gap-2 h-12 px-5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-txt rounded-xl text-[14px] font-semibold hover:bg-[rgba(255,255,255,0.08)] transition-all">
                Become a Creator
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURED MISSIONS ── */}
      <Sec className="py-20 lg:py-28 bg-[#050816] border-y border-[rgba(255,255,255,0.05)]">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <motion.p variants={fadeUp} className="text-[12px] font-bold text-accent uppercase tracking-widest mb-1">
                Preview
              </motion.p>
              <motion.h2 variants={fadeUp} custom={0.05} className="text-[clamp(1.6rem,3vw,2.4rem)] font-black text-txt leading-tight">
                Featured missions
              </motion.h2>
            </div>
            <motion.div variants={fadeUp} custom={0.1}>
              <span className="text-[12px] text-txt-faint bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] px-3 py-1.5 rounded-full">
                Preview — full library launching Q3 2025
              </span>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURED_MISSIONS.map((m, i) => (
              <motion.div
                key={m.title}
                variants={fadeUp}
                custom={i * 0.07}
                className="bg-card border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 hover:border-accent/15 transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{m.emoji}</span>
                  <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full">{m.tag}</span>
                </div>
                <p className="text-[15px] font-bold text-txt mb-1 group-hover:text-accent transition-colors">{m.title}</p>
                <p className="text-[11px] text-txt-faint mb-3">{m.category} · by {m.creator}</p>
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 text-txt-dim">
                    <Users size={11} strokeWidth={2} />
                    <span>{m.completions} completed</span>
                  </div>
                  <div className="flex items-center gap-1 text-txt-dim">
                    <span className="text-accent">★</span>
                    <span>{m.rating}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Sec>

      {/* ── CREATOR TYPES ── */}
      <Sec className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.p variants={fadeUp} className="text-[12px] font-bold text-txt-faint uppercase tracking-widest mb-3">
              Who Builds on X-hunt
            </motion.p>
            <motion.h2 variants={fadeUp} custom={0.06} className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-black text-txt leading-tight tracking-tight">
              Every kind of mission creator.
            </motion.h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {CREATOR_TYPES.map((c, i) => (
              <motion.div
                key={c.title}
                variants={fadeUp}
                custom={i * 0.08}
                className="flex gap-4 bg-card border border-[rgba(255,255,255,0.07)] rounded-2xl p-6 hover:border-accent/15 transition-all"
              >
                <span className="text-3xl flex-shrink-0">{c.icon}</span>
                <div>
                  <p className="text-[15px] font-bold text-txt mb-2">{c.title}</p>
                  <p className="text-[13px] text-txt-dim leading-relaxed">{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Sec>

      {/* ── STATS ── */}
      <Sec className="py-16 bg-[#050816] border-y border-[rgba(255,255,255,0.05)]">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { n: '1,600+', label: 'Missions at launch' },
              { n: '200+', label: 'Creator partners' },
              { n: '40+', label: 'Mission categories' },
              { n: '24M+', label: 'Projected year-1 completions' },
            ].map((s, i) => (
              <motion.div key={s.label} variants={fadeUp} custom={i * 0.07}>
                <p className="text-[2rem] font-black text-txt tracking-tight tabular-nums">{s.n}</p>
                <p className="text-[12px] text-txt-dim mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Sec>

      {/* ── CTA ── */}
      <Sec className="py-20 lg:py-28 text-center">
        <div className="max-w-xl mx-auto px-5">
          <motion.h2 variants={fadeUp} className="text-[clamp(1.8rem,4vw,3rem)] font-black text-txt leading-tight tracking-tighter mb-5">
            Be first on the marketplace.
          </motion.h2>
          <motion.p variants={fadeUp} custom={0.07} className="text-[13px] text-txt-dim mb-8 max-w-[360px] mx-auto">
            Join our creator waitlist and get early access, priority onboarding, and featured placement at launch.
          </motion.p>
          <motion.div variants={fadeUp} custom={0.14} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/get-started" className="flex items-center justify-center gap-2 h-12 px-7 bg-accent text-[#050816] rounded-xl text-[14px] font-bold shadow-[0_0_24px_rgba(34,255,170,0.3)] hover:bg-accent-dark transition-all">
              Join Creator Waitlist <ArrowRight size={14} strokeWidth={2.8} />
            </Link>
            <Link href="/contact" className="flex items-center justify-center gap-2 h-12 px-5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-txt rounded-xl text-[14px] font-semibold hover:bg-[rgba(255,255,255,0.08)] transition-all">
              Partner With Us <ChevronRight size={14} strokeWidth={2.5} />
            </Link>
          </motion.div>
        </div>
      </Sec>
    </div>
  );
}
