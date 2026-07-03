'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Compass, CheckCircle2, Gift, Trophy, MessageSquare, ClipboardList } from 'lucide-react';
import { t } from '@/theme/colors';

const ACTIONS = [
  { icon: Compass,       label: 'Find Opportunities', href: '/explore',  color: t.accent },
  { icon: ClipboardList, label: 'My Missions',         href: '/missions', color: t.ai    },
  { icon: CheckCircle2,  label: 'Submit Proof',        href: '/missions', color: t.accent },
  { icon: Gift,          label: 'Rewards',             href: '/rewards',  color: t.warning },
  { icon: Trophy,        label: 'Reputation',          href: '/profile',  color: t.ai    },
  { icon: MessageSquare, label: 'Messages',            href: '/messages', color: t.txtDim },
];

export default function QuickActionFAB() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="lg:hidden"
      style={{ position: 'fixed', bottom: 88, right: 20, zIndex: 60 }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            style={{
              position: 'absolute', bottom: 52, right: 0,
              background: t.surface, border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 18, padding: '8px 0', minWidth: 200,
              boxShadow: '0 16px 48px rgba(0,0,0,.55)',
            }}
          >
            {ACTIONS.map(({ icon: Icon, label, href, color }) => (
              <Link key={label} href={href} onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer' }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} strokeWidth={2} style={{ color }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.txt }}>{label}</span>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(v => !v)}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: open ? t.surface : t.accent,
          border: open ? `1px solid rgba(255,255,255,.15)` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: open ? 'none' : `0 4px 20px ${t.accent}50`,
        }}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          {open
            ? <X size={18} strokeWidth={2.5} style={{ color: t.txtDim }} />
            : <Plus size={20} strokeWidth={2.8} style={{ color: t.bg }} />
          }
        </motion.div>
      </motion.button>
    </div>
  );
}
