'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plug, Check, ExternalLink, Plus, Settings, Zap, RefreshCw,
  MessageSquare, Monitor, Users, Database, Code2, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  bg: string;
  status: 'connected' | 'available' | 'coming_soon';
  docsUrl?: string;
}

const INTEGRATIONS: Integration[] = [
  { id: 'slack',          name: 'Slack',              description: 'Send mission notifications and completions to channels.',  category: 'Communication', icon: '🔲', color: '#4A154B', bg: '#4A154B20', status: 'available' },
  { id: 'teams',          name: 'Microsoft Teams',    description: 'Push mission updates to Teams channels and bots.',         category: 'Communication', icon: '🔷', color: '#6264A7', bg: '#6264A720', status: 'available' },
  { id: 'salesforce',     name: 'Salesforce',         description: 'Sync outcomes and participant data with CRM.',             category: 'CRM',           icon: '☁️', color: '#00A1E0', bg: '#00A1E020', status: 'available' },
  { id: 'hubspot',        name: 'HubSpot',            description: 'Connect mission completions to contact records.',          category: 'CRM',           icon: '🟠', color: '#FF7A59', bg: '#FF7A5920', status: 'available' },
  { id: 'workday',        name: 'Workday',            description: 'Map mission outcomes to performance reviews.',             category: 'HR',            icon: '🔶', color: '#F5A623', bg: '#F5A62320', status: 'coming_soon' },
  { id: 'google',         name: 'Google Workspace',   description: 'Calendar events, Drive storage, and Gmail notifications.', category: 'Productivity', icon: '🔵', color: '#4285F4', bg: '#4285F420', status: 'available' },
  { id: 'ms365',          name: 'Microsoft 365',      description: 'Outlook, SharePoint, and OneDrive integration.',           category: 'Productivity', icon: '🟦', color: '#D83B01', bg: '#D83B0120', status: 'available' },
  { id: 'moodle',         name: 'Moodle',             description: 'Import courses and track learning outcomes.',              category: 'LMS',           icon: '🟫', color: '#F7633B', bg: '#F7633B20', status: 'coming_soon' },
  { id: 'canvas',         name: 'Canvas LMS',         description: 'Sync assignments and learning missions with Canvas.',      category: 'LMS',           icon: '🔴', color: '#E66000', bg: '#E6600020', status: 'coming_soon' },
  { id: 'zapier',         name: 'Zapier',             description: 'Connect X-hunt to 5000+ apps via automated Zaps.',        category: 'Automation',    icon: '⚡', color: '#FF4A00', bg: '#FF4A0020', status: 'available' },
  { id: 'webhooks',       name: 'Webhooks',           description: 'Send real-time event notifications to your endpoints.',    category: 'Developer',     icon: '🔗', color: t.accent,  bg: 'rgba(34,255,170,0.08)', status: 'connected' },
  { id: 'rest-api',       name: 'REST API',           description: 'Full programmatic access to missions, outcomes, and data.',category: 'Developer',     icon: '⚙️', color: t.ai,     bg: 'rgba(109,93,253,0.08)', status: 'connected' },
];

const CATEGORIES = ['All', 'Communication', 'CRM', 'HR', 'Productivity', 'LMS', 'Automation', 'Developer'];

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [connected, setConnected] = useState<Set<string>>(new Set(['webhooks', 'rest-api']));

  function toggleConnect(id: string) {
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const filtered = INTEGRATIONS.filter((i) => {
    if (activeCategory !== 'All' && i.category !== activeCategory) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const connectedCount = connected.size;

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34,255,170,0.08)', border: `1px solid rgba(34,255,170,0.15)` }}>
            <Plug size={18} strokeWidth={1.8} style={{ color: t.accent }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: t.txt }}>Integrations Hub</h1>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>{connectedCount} connected · {INTEGRATIONS.length} available</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Connected',    value: connectedCount,                                          icon: Check, color: t.accent,   bg: 'rgba(34,255,170,0.08)'  },
          { label: 'Available',    value: INTEGRATIONS.filter(i => i.status !== 'coming_soon').length, icon: Plug,  color: t.ai,      bg: 'rgba(109,93,253,0.1)'  },
          { label: 'Coming Soon',  value: INTEGRATIONS.filter(i => i.status === 'coming_soon').length, icon: Zap,   color: t.warning, bg: 'rgba(255,184,77,0.1)'  },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ backgroundColor: t.card, border: `1px solid ${t.panel}` }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
              <Icon size={16} strokeWidth={1.8} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
              <p className="text-[11px] font-medium" style={{ color: t.txtFaint }}>{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl p-1 overflow-x-auto" style={{ backgroundColor: t.card, border: `1px solid ${t.panel}` }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="h-7 px-3 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all"
              style={activeCategory === cat ? { backgroundColor: t.panel, color: t.txt } : { color: t.txtFaint }}
            >{cat}</button>
          ))}
        </div>
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations…"
            className="w-56 h-9 pl-3 pr-3 rounded-xl text-[12px] focus:outline-none"
            style={{ backgroundColor: t.card, border: `1px solid ${t.panel}`, color: t.txt }}
          />
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((integration, i) => {
          const isConnected = connected.has(integration.id);
          const isComingSoon = integration.status === 'coming_soon';
          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl p-5 transition-all"
              style={{
                backgroundColor: t.card,
                border: isConnected ? `1px solid rgba(34,255,170,0.2)` : `1px solid ${t.panel}`,
                opacity: isComingSoon ? 0.6 : 1,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: integration.bg }}>
                    {integration.icon}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: t.txt }}>{integration.name}</p>
                    <p className="text-[10px] font-medium" style={{ color: t.txtFaint }}>{integration.category}</p>
                  </div>
                </div>
                {isConnected && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34,255,170,0.1)', border: `1px solid rgba(34,255,170,0.2)` }}>
                    <div className="w-1 h-1 rounded-full breathe" style={{ backgroundColor: t.accent }} />
                    <span className="text-[9px] font-bold" style={{ color: t.accent }}>Live</span>
                  </div>
                )}
              </div>

              <p className="text-[12px] mb-4 leading-relaxed" style={{ color: t.txtFaint }}>{integration.description}</p>

              <div className="flex items-center gap-2">
                {isComingSoon ? (
                  <button disabled className="flex-1 h-8 rounded-xl text-[11px] font-semibold" style={{ backgroundColor: t.surface, border: `1px solid ${t.panel}`, color: t.txtFaint }}>
                    Coming Soon
                  </button>
                ) : (
                  <button
                    onClick={() => toggleConnect(integration.id)}
                    className="flex-1 h-8 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                    style={isConnected
                      ? { backgroundColor: 'rgba(255,92,122,0.1)', border: `1px solid rgba(255,92,122,0.2)`, color: t.error }
                      : { backgroundColor: 'rgba(34,255,170,0.1)', border: `1px solid rgba(34,255,170,0.2)`, color: t.accent }
                    }
                  >
                    {isConnected ? (
                      <><RefreshCw size={11} strokeWidth={2} />Disconnect</>
                    ) : (
                      <><Plus size={11} strokeWidth={2.5} />Connect</>
                    )}
                  </button>
                )}
                <button className="h-8 w-8 flex items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: t.surface, border: `1px solid ${t.panel}`, color: t.txtFaint }}>
                  <ExternalLink size={12} strokeWidth={2} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
