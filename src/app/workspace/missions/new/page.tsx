'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Wand2, Plus, Trash2, ChevronLeft, Zap, Save, Target,
  Clock, Tag, CheckCircle2, AlertCircle, Layers, ArrowUp, ArrowDown,
  Users, Settings2, Eye, Globe, Lock, Calendar, Loader2, ArrowRight,
  MapPin, Navigation,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/cn';
import { geocodeCity } from '@/lib/proximity';
import { t } from '@/theme/colors';

interface Step {
  id: number;
  type: 'action' | 'reflection' | 'discovery';
  instruction: string;
  success_criteria: string;
  aiGenerating?: boolean;
}

interface Segment { id: string; name: string; member_count?: number; }

type StepType = 'action' | 'reflection' | 'discovery';
type Tab = 'overview' | 'steps' | 'audience' | 'settings' | 'preview';

const STEP_TYPES: { value: StepType; label: string; color: string; activeBg: string; activeBorder: string }[] = [
  { value: 'action',     label: 'Action',     color: t.accent,  activeBg: 'rgba(34,255,170,0.1)',  activeBorder: 'rgba(34,255,170,0.3)' },
  { value: 'reflection', label: 'Reflection', color: t.ai,      activeBg: 'rgba(109,93,253,0.1)',  activeBorder: 'rgba(109,93,253,0.3)' },
  { value: 'discovery',  label: 'Discovery',  color: t.warning, activeBg: 'rgba(255,184,77,0.1)',  activeBorder: 'rgba(255,184,77,0.3)' },
];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',  label: 'Overview',  icon: Target },
  { id: 'steps',     label: 'Steps',     icon: Layers },
  { id: 'audience',  label: 'Audience',  icon: Users },
  { id: 'settings',  label: 'Settings',  icon: Settings2 },
  { id: 'preview',   label: 'Preview',   icon: Eye },
];

export default function NewMissionPage() {
  const router = useRouter();
  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  const [title, setTitle]           = useState('');
  const [story, setStory]           = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [estimatedTime, setEst]     = useState('30 min');
  const [reward, setReward]         = useState('');
  const [tags, setTags]             = useState<string[]>([]);
  const [tagInput, setTagInput]     = useState('');

  const [steps, setSteps] = useState<Step[]>([
    { id: 1, type: 'action', instruction: '', success_criteria: '' },
  ]);

  const [segments, setSegments]    = useState<Segment[]>([]);
  const [selectedSegs, setSelSegs] = useState<string[]>([]);
  const [segLoading, setSegLoading]= useState(false);

  const [isPublic, setIsPublic] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [maxParts, setMaxParts] = useState('');

  // Location / proximity
  const [locationType, setLocationType]     = useState<'remote' | 'local' | 'hybrid'>('remote');
  const [locationCity, setLocationCity]     = useState('');
  const [locationLat, setLocationLat]       = useState<number | null>(null);
  const [locationLng, setLocationLng]       = useState<number | null>(null);
  const [locationRadius, setLocationRadius] = useState(50);
  const [geoLoading, setGeoLoading]         = useState(false);
  const [geoError, setGeoError]             = useState('');

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [saving, setSaving]       = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError]         = useState('');
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    async function loadSegments() {
      setSegLoading(true);
      if (!isLoaded || !user) { setSegLoading(false); return; }
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) { setSegLoading(false); return; }
      const { data } = await supabase.from('audience_segments').select('id, name, member_count').eq('tenant_id', profile.tenant_id).order('name');
      setSegments(data ?? []);
      setSegLoading(false);
    }
    loadSegments();
  }, [user, isLoaded]);

  function addStep() {
    setSteps((prev) => [...prev, { id: Date.now(), type: 'action', instruction: '', success_criteria: '' }]);
  }

  function removeStep(sid: number) {
    if (steps.length === 1) return;
    setSteps((prev) => prev.filter((s) => s.id !== sid));
  }

  function moveStep(sid: number, dir: 'up' | 'down') {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === sid);
      if (dir === 'up' && idx === 0) return prev;
      if (dir === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  function updateStep(sid: number, field: keyof Step, value: string) {
    setSteps((prev) => prev.map((s) => s.id === sid ? { ...s, [field]: value } : s));
  }

  async function generateStepWithAI(step: Step) {
    if (!title.trim()) { setError('Add a mission title first.'); return; }
    setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, aiGenerating: true } : s));
    try {
      const res = await fetch('/api/agents/mission-architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `For mission "${title}" (${difficulty}), write a ${step.type} step instruction (1-2 sentences, actionable and specific). Then on a new line write a short measurable success criteria.`,
        }),
      });
      const json = await res.json();
      const text: string = json.content ?? json.message ?? '';
      if (text) {
        const lines = text.split('\n').filter((l: string) => l.trim());
        updateStep(step.id, 'instruction', lines[0]?.slice(0, 200) ?? text.slice(0, 200));
        if (lines[1]) updateStep(step.id, 'success_criteria', lines[1].slice(0, 120));
      }
    } catch { /* silent */ } finally {
      setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, aiGenerating: false } : s));
    }
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag]);
    setTagInput('');
  }

  function toggleSegment(sid: string) {
    setSelSegs((prev) => prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]);
  }

  async function resolveLocationCoords() {
    if (!locationCity.trim()) return;
    setGeoLoading(true);
    setGeoError('');
    try {
      const result = await geocodeCity(locationCity.trim());
      if (result) {
        setLocationLat(result.lat);
        setLocationLng(result.lng);
        if (!locationCity.trim()) setLocationCity(result.city);
      } else {
        setGeoError('City not found — try a more specific name.');
      }
    } catch {
      setGeoError('Geocoding failed. Coords will be saved when available.');
    } finally {
      setGeoLoading(false);
    }
  }

  function detectMyLocation() {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return; }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationLat(pos.coords.latitude);
        setLocationLng(pos.coords.longitude);
        try {
          const { reverseGeocode } = await import('@/lib/proximity');
          const place = await reverseGeocode({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationCity(place.city + (place.country ? `, ${place.country}` : ''));
        } catch { /* city will remain empty */ }
        setGeoLoading(false);
      },
      () => { setGeoError('Could not access your location.'); setGeoLoading(false); },
      { timeout: 8000 }
    );
  }

  async function generateWithAI() {
    if (!title.trim()) { setError('Enter a mission title first.'); return; }
    setError('');
    setAiLoading(true);
    try {
      const res = await fetch('/api/agents/mission-architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: `Create a mission for: "${title}". Difficulty: ${difficulty}. Provide story context (2-3 sentences).` }),
      });
      const json = await res.json();
      const text: string = json.content ?? json.message ?? '';
      if (text) {
        setStory(text.slice(0, 400));
        setSteps([
          { id: 1, type: 'action',     instruction: `Research and outline the core challenge for: ${title}`,          success_criteria: 'Clear written outline submitted' },
          { id: 2, type: 'discovery',  instruction: `Identify 3 key stakeholders or resources relevant to: ${title}`, success_criteria: 'Stakeholder list with names and roles' },
          { id: 3, type: 'reflection', instruction: `Reflect on barriers and opportunities for: ${title}`,            success_criteria: 'Reflection document with action items' },
          { id: 4, type: 'action',     instruction: `Present your solution or outcome for: ${title}`,                 success_criteria: 'Presentation or artifact shared' },
        ]);
        setTags((prev) => [...new Set([...prev, 'ai-generated', difficulty])]);
        setEst('45 min');
        setActiveTab('steps');
      }
    } catch { /* silent */ } finally {
      setAiLoading(false);
    }
  }

  async function handleSave(status: 'draft' | 'active') {
    if (!title.trim()) { setError('Mission title is required.'); setActiveTab('overview'); return; }
    if (steps.some((s) => !s.instruction.trim())) { setError('All steps must have instructions.'); setActiveTab('steps'); return; }
    setError('');
    setSaving(true);

    if (!user) { setError('Not authenticated.'); setSaving(false); return; }
    const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
    if (!profile?.tenant_id) { setError('No organization found.'); setSaving(false); return; }

    const cleanSteps = steps.map(({ aiGenerating: _ai, ...s }) => s);
    const segTags = selectedSegs.map((sid) => `seg:${sid}`);

    const { data, error: dbErr } = await supabase.from('missions').insert({
      tenant_id:      profile.tenant_id,
      created_by:     user.id,
      title:          title.trim(),
      story_context:  story.trim() || null,
      difficulty,
      estimated_time: estimatedTime || null,
      steps:          cleanSteps,
      reward:         reward.trim() || 'Mission completion badge',
      tags:           [...tags, ...segTags],
      status,
      is_public:      isPublic,
      // Proximity fields
      location_type:  locationType,
      location_city:  locationCity.trim() || null,
      lat:            locationLat,
      lng:            locationLng,
      radius_km:      locationType !== 'remote' ? locationRadius : null,
    }).select('id').single();

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    setSaved(true);
    setTimeout(() => router.push(`/workspace/missions/${data.id}`), 700);
  }

  const completeness = Math.round(
    ([!!title, !!story, steps.every((s) => !!s.instruction), steps.every((s) => !!s.success_criteria)].filter(Boolean).length / 4) * 100,
  );

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b px-8 py-4" style={{ background: `${t.bg}E6`, borderColor: t.panel }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/workspace/missions" className="p-2 rounded-xl transition-colors" style={{ color: t.txtFaint }} onMouseEnter={e => (e.currentTarget.style.background = t.card)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <ChevronLeft size={18} strokeWidth={2} />
            </Link>
            <div>
              <h1 className="text-[18px] font-bold leading-none truncate max-w-[280px]" style={{ color: t.txt }}>
                {title || 'Untitled Mission'}
              </h1>
              <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>Mission Studio · New</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 mr-1">
              <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: t.card }}>
                <div className="h-full bg-accent/60 rounded-full transition-all duration-500" style={{ width: `${completeness}%` }} />
              </div>
              <span className="text-[10px] font-medium tabular-nums" style={{ color: t.txtFaint }}>{completeness}%</span>
            </div>
            <button
              onClick={generateWithAI}
              disabled={aiLoading}
              className="flex items-center gap-2 h-9 px-4 rounded-xl font-semibold text-[13px] transition-colors disabled:opacity-50"
              style={{ background: 'rgba(109,93,253,0.15)', border: `1px solid rgba(109,93,253,0.3)`, color: t.aiLight }}
            >
              <Wand2 size={14} strokeWidth={2} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'Generating…' : 'AI Fill'}
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex items-center gap-2 h-9 px-4 rounded-xl font-medium text-[13px] transition-colors disabled:opacity-50"
              style={{ background: t.card, border: `1px solid #162440`, color: t.txt }}
            >
              <Save size={13} strokeWidth={2} />
              Draft
            </button>
            <button
              onClick={() => handleSave('active')}
              disabled={saving}
              className="flex items-center gap-2 h-9 px-4 bg-accent rounded-xl font-semibold text-[13px] shadow-[0_4px_16px_rgba(34,255,170,0.25)] disabled:opacity-50"
              style={{ color: '#060a0e' }}
            >
              {saved ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <Zap size={14} strokeWidth={2.5} />}
              {saving ? 'Publishing…' : saved ? 'Published!' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b px-8" style={{ borderColor: t.panel, background: t.bg }}>
        <div className="max-w-4xl mx-auto flex items-center gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 h-11 px-4 text-[13px] font-semibold border-b-2 transition-all',
                activeTab === id ? 'border-accent text-accent' : 'border-transparent',
              )}
              style={activeTab === id ? {} : { color: t.txtFaint }}
            >
              <Icon size={13} strokeWidth={2} />
              {label}
              {id === 'steps' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: t.panel, color: t.txtFaint }}>{steps.length}</span>
              )}
              {id === 'audience' && selectedSegs.length > 0 && (
                <span className="text-[10px] font-bold bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">{selectedSegs.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6"
              style={{ background: 'rgba(255,92,122,0.1)', border: `1px solid rgba(255,92,122,0.2)` }}>
              <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0" style={{ color: t.error }} />
              <p className="text-[13px] flex-1" style={{ color: t.error }}>{error}</p>
              <button onClick={() => setError('')} className="text-[12px]" style={{ color: `${t.error}99` }}>✕</button>
            </motion.div>
          )}

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="rounded-2xl p-6 space-y-5" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-accent" strokeWidth={2} />
                  <p className="text-[13px] font-bold" style={{ color: t.txt }}>Mission Identity</p>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: t.txtFaint }}>Title *</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Launch Product Hunt Campaign"
                    className="w-full h-11 px-4 rounded-xl text-[15px] font-semibold focus:outline-none transition-colors"
                    style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: t.txtFaint }}>Story Context</label>
                  <textarea
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    placeholder="Describe the mission background, context, and why it matters…"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl text-[13px] focus:outline-none resize-none transition-colors"
                    style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: t.txtFaint }}>Difficulty</label>
                    <div className="flex gap-1.5">
                      {(['easy', 'medium', 'hard'] as const).map((d) => (
                        <button key={d} onClick={() => setDifficulty(d)}
                          className="flex-1 h-9 rounded-xl text-[11px] font-bold border transition-all capitalize"
                          style={
                            difficulty === d
                              ? d === 'easy'
                                ? { background: 'rgba(34,255,170,0.1)', border: `1px solid rgba(34,255,170,0.3)`, color: t.accent }
                                : d === 'medium'
                                ? { background: 'rgba(255,184,77,0.1)', border: `1px solid rgba(255,184,77,0.3)`, color: t.warning }
                                : { background: 'rgba(255,92,122,0.1)', border: `1px solid rgba(255,92,122,0.3)`, color: t.error }
                              : { background: t.surface, border: `1px solid ${t.panel}`, color: t.txtFaint }
                          }>{d}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: t.txtFaint }}>Est. Time</label>
                    <div className="relative">
                      <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} style={{ color: t.txtFaint }} />
                      <input value={estimatedTime} onChange={(e) => setEst(e.target.value)} placeholder="30 min"
                        className="w-full h-9 pl-8 pr-3 rounded-xl text-[13px] focus:outline-none"
                        style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: t.txtFaint }}>Reward</label>
                    <input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Completion badge"
                      className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                      style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: t.txtFaint }}>Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full"
                        style={{ background: 'rgba(109,93,253,0.1)', border: `1px solid rgba(109,93,253,0.2)`, color: t.aiLight }}>
                        {tag}
                        <button onClick={() => setTags(tags.filter((x) => x !== tag))} style={{ color: t.ai }}>✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={12} className="absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} style={{ color: t.txtFaint }} />
                      <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Add tag and press Enter"
                        className="w-full h-9 pl-8 pr-3 rounded-xl text-[12px] focus:outline-none"
                        style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                    </div>
                    <button onClick={addTag} className="h-9 px-3 rounded-xl text-[12px] font-semibold transition-colors"
                      style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txtDim }}>
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={() => setActiveTab('steps')}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-semibold transition-colors"
                style={{ background: t.card, border: `1px solid ${t.panel}`, color: t.txtFaint }}>
                Next: Configure Steps <ArrowRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* ── STEPS TAB ── */}
          {activeTab === 'steps' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${t.panel}` }}>
                <div className="flex items-center gap-2">
                  <Layers size={14} strokeWidth={2} style={{ color: t.ai }} />
                  <p className="text-[13px] font-bold" style={{ color: t.txt }}>Mission Steps</p>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: t.panel, color: t.txtFaint }}>{steps.length}</span>
                </div>
                <button onClick={addStep}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-semibold text-accent hover:bg-accent/15 transition-colors"
                  style={{ background: 'rgba(34,255,170,0.1)', border: `1px solid rgba(34,255,170,0.2)` }}>
                  <Plus size={12} strokeWidth={2.5} /> Add Step
                </button>
              </div>

              <div className="p-4 space-y-3">
                <AnimatePresence>
                  {steps.map((step, idx) => (
                    <motion.div key={step.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl p-4 space-y-3" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ background: t.panel, border: `1px solid #162440`, color: t.txtFaint }}>
                            {idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            {STEP_TYPES.map(({ value, label, color, activeBg, activeBorder }) => (
                              <button key={value} onClick={() => updateStep(step.id, 'type', value)}
                                className="h-6 px-2 rounded-lg text-[10px] font-bold border transition-all"
                                style={
                                  step.type === value
                                    ? { color, background: activeBg, borderColor: activeBorder }
                                    : { color: t.txtFaint, borderColor: 'transparent' }
                                }>{label}</button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => generateStepWithAI(step)} disabled={!!step.aiGenerating} title="Generate with AI"
                            className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                            style={{ color: t.ai }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(109,93,253,0.1)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            {step.aiGenerating ? <Loader2 size={12} strokeWidth={2} className="animate-spin" /> : <Sparkles size={12} strokeWidth={2} />}
                          </button>
                          <button onClick={() => moveStep(step.id, 'up')} disabled={idx === 0}
                            className="p-1.5 rounded-lg transition-colors disabled:opacity-20" style={{ color: t.txtFaint }}>
                            <ArrowUp size={12} strokeWidth={2} />
                          </button>
                          <button onClick={() => moveStep(step.id, 'down')} disabled={idx === steps.length - 1}
                            className="p-1.5 rounded-lg transition-colors disabled:opacity-20" style={{ color: t.txtFaint }}>
                            <ArrowDown size={12} strokeWidth={2} />
                          </button>
                          <button onClick={() => removeStep(step.id)} disabled={steps.length === 1}
                            className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ color: t.txtFaint }}
                            onMouseEnter={e => { e.currentTarget.style.color = t.error; e.currentTarget.style.background = 'rgba(255,92,122,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = t.txtFaint; e.currentTarget.style.background = 'transparent'; }}>
                            <Trash2 size={12} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                      <input value={step.instruction} onChange={(e) => updateStep(step.id, 'instruction', e.target.value)}
                        placeholder="What should the participant do?"
                        className="w-full h-9 px-3 rounded-lg text-[13px] focus:outline-none"
                        style={{ background: t.card, border: `1px solid ${t.panel}`, color: t.txt }} />
                      <input value={step.success_criteria} onChange={(e) => updateStep(step.id, 'success_criteria', e.target.value)}
                        placeholder="How will success be measured? (optional)"
                        className="w-full h-9 px-3 rounded-lg text-[12px] focus:outline-none"
                        style={{ background: t.card, border: `1px solid ${t.panel}`, color: t.txtDim }} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ── AUDIENCE TAB ── */}
          {activeTab === 'audience' && (
            <div className="rounded-2xl p-6" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} strokeWidth={2} style={{ color: t.ai }} />
                <p className="text-[13px] font-bold" style={{ color: t.txt }}>Audience Segments</p>
              </div>
              <p className="text-[12px] mb-5" style={{ color: t.txtFaint }}>Choose which segments can participate. Leave empty to allow all users.</p>

              {segLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl" style={{ background: t.panel }} />)}
                </div>
              ) : segments.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Users size={28} strokeWidth={1.5} style={{ color: t.txtFaint }} />
                  <p className="text-[13px]" style={{ color: t.txtFaint }}>No audience segments found</p>
                  <Link href="/workspace/audience" className="text-[12px] text-accent font-semibold hover:underline">
                    Create segments in Audience Center →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {segments.map((seg) => (
                    <button key={seg.id} onClick={() => toggleSegment(seg.id)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left"
                      style={
                        selectedSegs.includes(seg.id)
                          ? { background: 'rgba(34,255,170,0.05)', border: `1px solid rgba(34,255,170,0.2)` }
                          : { background: t.surface, border: `1px solid ${t.panel}` }
                      }>
                      <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        selectedSegs.includes(seg.id) ? 'bg-accent border-accent' : '')}
                        style={!selectedSegs.includes(seg.id) ? { borderColor: t.txtFaint } : {}}>
                        {selectedSegs.includes(seg.id) && <CheckCircle2 size={10} strokeWidth={3} style={{ color: t.bg }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold" style={{ color: selectedSegs.includes(seg.id) ? t.txt : t.txtDim }}>
                          {seg.name}
                        </p>
                      </div>
                      {seg.member_count != null && (
                        <span className="text-[11px] flex-shrink-0 tabular-nums" style={{ color: t.txtFaint }}>{seg.member_count} members</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedSegs.length > 0 && (
                <p className="text-[12px] text-accent mt-4 font-medium">
                  {selectedSegs.length} segment{selectedSegs.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <div className="rounded-2xl p-6 space-y-6" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
              <div className="flex items-center gap-2">
                <Settings2 size={14} strokeWidth={2} style={{ color: t.warning }} />
                <p className="text-[13px] font-bold" style={{ color: t.txt }}>Mission Settings</p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider mb-3 block" style={{ color: t.txtFaint }}>Visibility</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: false, icon: Lock,  label: 'Private', desc: 'Only invited users can see and participate' },
                    { val: true,  icon: Globe, label: 'Public',  desc: 'Anyone in your org can discover and join' },
                  ].map(({ val, icon: Icon, label, desc }) => (
                    <button key={String(val)} onClick={() => setIsPublic(val)}
                      className="flex items-start gap-3 p-4 rounded-xl border text-left transition-all"
                      style={
                        isPublic === val
                          ? { background: 'rgba(34,255,170,0.05)', border: `1px solid rgba(34,255,170,0.25)` }
                          : { background: t.surface, border: `1px solid ${t.panel}` }
                      }>
                      <Icon size={15} strokeWidth={2} className="mt-0.5" style={{ color: isPublic === val ? t.accent : t.txtFaint }} />
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: isPublic === val ? t.accent : t.txtDim }}>{label}</p>
                        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: t.txtFaint }}>{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: t.txtFaint }}>Mission Deadline (optional)</label>
                <div className="relative">
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} style={{ color: t.txtFaint }} />
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 rounded-xl text-[13px] focus:outline-none [color-scheme:dark]"
                    style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: t.txtFaint }}>Max Participants (optional)</label>
                <input type="number" value={maxParts} onChange={(e) => setMaxParts(e.target.value)} placeholder="Unlimited" min={1}
                  className="w-full h-10 px-4 rounded-xl text-[13px] focus:outline-none"
                  style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
              </div>

              {/* Location / Proximity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={13} strokeWidth={2} style={{ color: t.accent }} />
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>Location Type</label>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {([
                    { val: 'remote', label: '🌐 Remote',  desc: 'Fully online'        },
                    { val: 'local',  label: '📍 Local',   desc: 'On-site required'    },
                    { val: 'hybrid', label: '🔀 Hybrid',  desc: 'Mix of both'         },
                  ] as const).map(({ val, label, desc }) => (
                    <button key={val} onClick={() => setLocationType(val)}
                      className="flex flex-col items-center p-3 rounded-xl border text-center transition-all"
                      style={
                        locationType === val
                          ? { background: 'rgba(34,255,170,0.05)', border: `1px solid rgba(34,255,170,0.25)` }
                          : { background: t.surface, border: `1px solid ${t.panel}` }
                      }>
                      <span className="text-[14px] mb-1">{label.split(' ')[0]}</span>
                      <span className="text-[11px] font-semibold" style={{ color: locationType === val ? t.accent : t.txtDim }}>{label.split(' ')[1]}</span>
                      <span className="text-[10px] mt-0.5" style={{ color: t.txtFaint }}>{desc}</span>
                    </button>
                  ))}
                </div>

                {locationType !== 'remote' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: t.txtFaint }}>City / Location</label>
                      <div className="flex gap-2">
                        <input
                          value={locationCity}
                          onChange={(e) => setLocationCity(e.target.value)}
                          onBlur={resolveLocationCoords}
                          placeholder="e.g. Lagos, Nigeria"
                          className="flex-1 h-10 px-4 rounded-xl text-[13px] focus:outline-none"
                          style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}
                        />
                        <button onClick={detectMyLocation} disabled={geoLoading}
                          className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-[12px] font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                          style={{ background: 'rgba(34,255,170,0.1)', border: `1px solid rgba(34,255,170,0.25)`, color: t.accent }}>
                          {geoLoading
                            ? <Loader2 size={12} strokeWidth={2} className="animate-spin" />
                            : <Navigation size={12} strokeWidth={2} />
                          }
                          My Location
                        </button>
                      </div>
                      {geoError && <p className="text-[11px] mt-1.5" style={{ color: t.error }}>{geoError}</p>}
                      {locationLat != null && (
                        <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: t.accent }}>
                          <MapPin size={10} strokeWidth={2} />
                          Pinned: {locationLat.toFixed(4)}, {locationLng?.toFixed(4)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: t.txtFaint }}>
                        Participation Radius — {locationRadius} km
                      </label>
                      <input type="range" min={1} max={200} value={locationRadius}
                        onChange={(e) => setLocationRadius(Number(e.target.value))}
                        className="w-full" style={{ accentColor: t.accent }} />
                      <div className="flex justify-between text-[10px] mt-1" style={{ color: t.txtFaint }}>
                        <span>1 km</span><span>Walking distance ({locationRadius <= 5 ? '✓' : ''})</span><span>200 km</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* ── PREVIEW TAB ── */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Eye size={13} strokeWidth={2} style={{ color: t.txtDim }} />
                <p className="text-[12px] font-medium" style={{ color: t.txtFaint }}>Participant view — how this mission appears to users</p>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
                <div className="p-6" style={{ borderBottom: `1px solid ${t.panel}` }}>
                  <h2 className="text-[20px] font-bold mb-3" style={{ color: t.txt }}>
                    {title || <span style={{ color: t.txtFaint }}>Untitled Mission</span>}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full capitalize"
                      style={
                        difficulty === 'easy'
                          ? { background: 'rgba(34,255,170,0.1)', color: t.accent }
                          : difficulty === 'medium'
                          ? { background: 'rgba(255,184,77,0.1)', color: t.warning }
                          : { background: 'rgba(255,92,122,0.1)', color: t.error }
                      }>{difficulty}</span>
                    {estimatedTime && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: t.txtDim }}>
                        <Clock size={10} strokeWidth={2} />{estimatedTime}
                      </span>
                    )}
                    {tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: t.panel, color: t.txtDim }}>{tag}</span>
                    ))}
                  </div>
                  {story && <p className="text-[13px] leading-relaxed mt-3" style={{ color: t.txtDim }}>{story}</p>}
                </div>

                <div className="p-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: t.txtFaint }}>{steps.length} Steps</p>
                  <div className="space-y-3">
                    {steps.map((step, i) => (
                      <div key={step.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                            style={
                              step.type === 'action'
                                ? { background: 'rgba(34,255,170,0.1)', color: t.accent }
                                : step.type === 'reflection'
                                ? { background: 'rgba(109,93,253,0.1)', color: t.ai }
                                : { background: 'rgba(255,184,77,0.1)', color: t.warning }
                            }>{i + 1}</div>
                          {i < steps.length - 1 && <div className="w-px flex-1 mt-1.5 min-h-[20px]" style={{ background: t.panel }} />}
                        </div>
                        <div className="flex-1 pb-3">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md capitalize inline-block mb-1.5"
                            style={
                              step.type === 'action'
                                ? { color: t.accent, background: 'rgba(34,255,170,0.1)' }
                                : step.type === 'reflection'
                                ? { color: t.ai, background: 'rgba(109,93,253,0.1)' }
                                : { color: t.warning, background: 'rgba(255,184,77,0.1)' }
                            }>{step.type}</span>
                          <p className="text-[13px] font-medium leading-snug" style={{ color: t.txt }}>
                            {step.instruction || <span className="italic" style={{ color: t.txtFaint }}>No instruction yet</span>}
                          </p>
                          {step.success_criteria && (
                            <p className="text-[11px] mt-1 flex items-start gap-1.5" style={{ color: t.txtFaint }}>
                              <CheckCircle2 size={10} className="mt-0.5 flex-shrink-0" strokeWidth={2} style={{ color: `${t.accent}99` }} />
                              {step.success_criteria}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-6 py-4 flex items-center justify-between" style={{ background: t.surface, borderTop: `1px solid ${t.panel}` }}>
                  <p className="text-[12px]" style={{ color: t.txtFaint }}>Complete all {steps.length} steps to earn:</p>
                  <span className="text-[13px] font-bold" style={{ color: t.warning }}>{reward || 'Mission completion badge'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setActiveTab('overview')}
                  className="flex-1 h-10 rounded-xl text-[13px] font-medium transition-colors"
                  style={{ background: t.card, border: `1px solid ${t.panel}`, color: t.txtDim }}>
                  Edit Overview
                </button>
                <button onClick={() => handleSave('active')} disabled={saving}
                  className="flex-1 h-10 bg-accent rounded-xl text-[13px] font-bold shadow-[0_4px_16px_rgba(34,255,170,0.25)] disabled:opacity-50"
                  style={{ color: '#060a0e' }}>
                  {saving ? 'Publishing…' : 'Publish Mission'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
