'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Wand2, Plus, Trash2, ChevronLeft, Zap, Save, Target,
  Clock, Tag, CheckCircle2, AlertCircle, Layers, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/cn';

interface Step {
  id: number;
  type: 'action' | 'reflection' | 'discovery';
  instruction: string;
  success_criteria: string;
}

type StepType = 'action' | 'reflection' | 'discovery';

const STEP_TYPES: { value: StepType; label: string; desc: string; color: string }[] = [
  { value: 'action',     label: 'Action',     desc: 'Do something',  color: 'text-[#22FFAA]' },
  { value: 'reflection', label: 'Reflection', desc: 'Think deeply',  color: 'text-[#6D5DFD]' },
  { value: 'discovery',  label: 'Discovery',  desc: 'Find & explore',color: 'text-[#FFB84D]' },
];

export default function NewMissionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [estimatedTime, setEstimatedTime] = useState('30 min');
  const [reward, setReward] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, type: 'action', instruction: '', success_criteria: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { id: Date.now(), type: 'action', instruction: '', success_criteria: '' },
    ]);
  }

  function removeStep(id: number) {
    if (steps.length === 1) return;
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function updateStep(id: number, field: keyof Step, value: string) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  }

  async function generateWithAI() {
    if (!title.trim()) { setError('Enter a mission title to generate with AI.'); return; }
    setError('');
    setAiLoading(true);
    try {
      const res = await fetch('/api/agents/mission-architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: `Create a detailed mission for: "${title}". Difficulty: ${difficulty}.` }),
      });
      const json = await res.json();
      const text: string = json.content ?? json.message ?? '';
      if (text) {
        setStory(text.slice(0, 400));
        setSteps([
          { id: 1, type: 'action',     instruction: `Research and outline the core challenge for: ${title}`,           success_criteria: 'Clear written outline submitted' },
          { id: 2, type: 'discovery',  instruction: `Identify 3 key stakeholders or resources relevant to: ${title}`,  success_criteria: 'Stakeholder list with names and roles' },
          { id: 3, type: 'reflection', instruction: `Reflect on barriers and opportunities for: ${title}`,             success_criteria: 'Reflection document with action items' },
          { id: 4, type: 'action',     instruction: `Present your solution or outcome for: ${title}`,                  success_criteria: 'Presentation or artifact shared' },
        ]);
        setTags(['ai-generated', difficulty]);
        setEstimatedTime('45 min');
      }
    } catch {
      // fallback silently
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave(status: 'draft' | 'active') {
    if (!title.trim()) { setError('Mission title is required.'); return; }
    if (steps.some((s) => !s.instruction.trim())) { setError('All steps must have instructions.'); return; }
    setError('');
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated.'); setSaving(false); return; }

    const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
    if (!profile?.tenant_id) { setError('No organization found.'); setSaving(false); return; }

    const { data, error: dbErr } = await supabase.from('missions').insert({
      tenant_id: profile.tenant_id,
      created_by: user.id,
      title: title.trim(),
      story_context: story.trim() || null,
      difficulty,
      estimated_time: estimatedTime || null,
      steps,
      reward: reward.trim() || 'Mission completion badge',
      tags,
      status,
      is_public: false,
    }).select('id').single();

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    setSaved(true);
    setTimeout(() => router.push(`/workspace/missions/${data.id}`), 800);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/workspace/missions" className="p-2 rounded-xl hover:bg-[#0A1226] text-[#4A5578] hover:text-[#8B9CC0] transition-colors">
            <ChevronLeft size={18} strokeWidth={2} />
          </Link>
          <div>
            <h1 className="text-[22px] font-bold text-[#F0F4FF]">Create Mission</h1>
            <p className="text-[#4A5578] text-[12px]">Mission Studio · New</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateWithAI}
            disabled={aiLoading}
            className="flex items-center gap-2 h-9 px-4 bg-[#6D5DFD]/15 border border-[#6D5DFD]/30 text-[#A99FFE] rounded-xl font-semibold text-[13px] hover:bg-[#6D5DFD]/25 transition-colors disabled:opacity-50"
          >
            <Wand2 size={14} strokeWidth={2} className={aiLoading ? 'animate-spin' : ''} />
            {aiLoading ? 'Generating…' : 'AI Generate'}
          </button>
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="flex items-center gap-2 h-9 px-4 bg-[#0A1226] border border-[#162440] text-[#F0F4FF] rounded-xl font-medium text-[13px] hover:border-[#6D5DFD]/40 transition-colors disabled:opacity-50"
          >
            <Save size={13} strokeWidth={2} />
            Save Draft
          </button>
          <button
            onClick={() => handleSave('active')}
            disabled={saving}
            className="flex items-center gap-2 h-9 px-4 bg-accent text-[#060a0e] rounded-xl font-semibold text-[13px] shadow-[0_4px_16px_rgba(34,255,170,0.25)] disabled:opacity-50"
          >
            {saved ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <Zap size={14} strokeWidth={2.5} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[#FF5C7A]/10 border border-[#FF5C7A]/20 rounded-xl mb-6">
          <AlertCircle size={14} className="text-[#FF5C7A]" strokeWidth={2} />
          <p className="text-[13px] text-[#FF5C7A]">{error}</p>
        </div>
      )}

      <div className="space-y-5">

        {/* Core Info */}
        <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-accent" strokeWidth={2} />
            <p className="text-[13px] font-bold text-[#F0F4FF]">Mission Identity</p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider mb-2 block">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Launch Product Hunt Campaign"
              className="w-full h-11 px-4 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[15px] font-semibold text-[#F0F4FF] placeholder:text-[#4A5578] placeholder:font-normal focus:outline-none focus:border-[#162440] transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider mb-2 block">Story Context</label>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Describe the mission background, context, and why it matters…"
              rows={3}
              className="w-full px-4 py-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] placeholder:text-[#4A5578] focus:outline-none focus:border-[#162440] resize-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider mb-2 block">Difficulty</label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'flex-1 h-9 rounded-xl text-[12px] font-bold border transition-all capitalize',
                      difficulty === d
                        ? d === 'easy' ? 'bg-[#22FFAA]/10 border-[#22FFAA]/30 text-[#22FFAA]'
                          : d === 'medium' ? 'bg-[#FFB84D]/10 border-[#FFB84D]/30 text-[#FFB84D]'
                          : 'bg-[#FF5C7A]/10 border-[#FF5C7A]/30 text-[#FF5C7A]'
                        : 'bg-[#07101F] border-[#0F1D35] text-[#4A5578] hover:text-[#8B9CC0]'
                    )}
                  >{d}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider mb-2 block">Est. Time</label>
              <div className="relative">
                <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5578]" strokeWidth={2} />
                <input
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  placeholder="30 min"
                  className="w-full h-9 pl-8 pr-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] placeholder:text-[#4A5578] focus:outline-none focus:border-[#162440]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider mb-2 block">Reward</label>
              <input
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="Completion badge"
                className="w-full h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] placeholder:text-[#4A5578] focus:outline-none focus:border-[#162440]"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider mb-2 block">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#6D5DFD]/10 border border-[#6D5DFD]/20 text-[#A99FFE] text-[11px] font-semibold rounded-full">
                  {t}
                  <button onClick={() => setTags(tags.filter((x) => x !== t))} className="text-[#6D5DFD] hover:text-[#FF5C7A]">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5578]" strokeWidth={2} />
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag and press Enter"
                  className="w-full h-9 pl-8 pr-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[12px] text-[#F0F4FF] placeholder:text-[#4A5578] focus:outline-none focus:border-[#162440]"
                />
              </div>
              <button onClick={addTag} className="h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[12px] font-semibold text-[#8B9CC0] hover:text-[#F0F4FF] hover:border-[#162440] transition-colors">
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Mission Steps */}
        <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#0F1D35]">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-[#6D5DFD]" strokeWidth={2} />
              <p className="text-[13px] font-bold text-[#F0F4FF]">Mission Steps</p>
              <span className="text-[11px] font-bold text-[#4A5578] bg-[#0D1530] px-2 py-0.5 rounded-full">{steps.length}</span>
            </div>
            <button
              onClick={addStep}
              className="flex items-center gap-1.5 h-8 px-3 bg-accent/10 border border-accent/20 text-accent rounded-xl text-[12px] font-semibold hover:bg-accent/15 transition-colors"
            >
              <Plus size={12} strokeWidth={2.5} />
              Add Step
            </button>
          </div>

          <div className="p-4 space-y-3">
            <AnimatePresence>
              {steps.map((step, idx) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#07101F] border border-[#0F1D35] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#0D1530] border border-[#162440] flex items-center justify-center text-[10px] font-bold text-[#4A5578] flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        {STEP_TYPES.map(({ value, label, color }) => (
                          <button
                            key={value}
                            onClick={() => updateStep(step.id, 'type', value)}
                            className={cn(
                              'h-6 px-2 rounded-lg text-[10px] font-bold border transition-all',
                              step.type === value
                                ? `${color} border-current bg-current/10`
                                : 'text-[#4A5578] border-transparent hover:text-[#8B9CC0]'
                            )}
                          >{label}</button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => removeStep(step.id)}
                      disabled={steps.length === 1}
                      className="p-1 rounded-lg text-[#4A5578] hover:text-[#FF5C7A] hover:bg-[#FF5C7A]/10 transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </div>

                  <input
                    value={step.instruction}
                    onChange={(e) => updateStep(step.id, 'instruction', e.target.value)}
                    placeholder="What should the participant do?"
                    className="w-full h-9 px-3 bg-[#0A1226] border border-[#0F1D35] rounded-lg text-[13px] text-[#F0F4FF] placeholder:text-[#4A5578] focus:outline-none focus:border-[#162440]"
                  />
                  <input
                    value={step.success_criteria}
                    onChange={(e) => updateStep(step.id, 'success_criteria', e.target.value)}
                    placeholder="How will success be measured?"
                    className="w-full h-9 px-3 bg-[#0A1226] border border-[#0F1D35] rounded-lg text-[12px] text-[#8B9CC0] placeholder:text-[#4A5578] focus:outline-none focus:border-[#162440]"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Save Footer */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[12px] text-[#4A5578]">{steps.length} steps configured</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex items-center gap-2 h-9 px-4 bg-[#0A1226] border border-[#162440] text-[#F0F4FF] rounded-xl font-medium text-[13px] disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave('active')}
              disabled={saving}
              className="flex items-center gap-2 h-9 px-4 bg-accent text-[#060a0e] rounded-xl font-semibold text-[13px] shadow-[0_4px_16px_rgba(34,255,170,0.25)] disabled:opacity-50"
            >
              <Zap size={14} strokeWidth={2.5} />
              Publish Mission
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
