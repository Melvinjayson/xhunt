'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Tag, Globe, X, Save, Loader2, Trash2, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DbAudienceSegment, AudienceFilters } from '@/lib/supabase/types';
import { cn } from '@/lib/cn';

const INTEREST_SUGGESTIONS = ['Technology', 'Sustainability', 'Finance', 'Health', 'Education', 'Travel', 'Food', 'Sports'];
const GEO_SUGGESTIONS = ['Global', 'EMEA', 'North America', 'APAC', 'Ireland', 'United Kingdom', 'United States'];

function TagInput({
  values,
  onChange,
  placeholder,
  suggestions,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');

  function add(val: string) {
    const v = val.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 px-2.5 py-1 bg-accent-light border border-accent/30 rounded-full text-[11px] font-semibold text-accent">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-[#ff5252] transition-colors">
              <X size={10} strokeWidth={3} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(draft); } }}
          placeholder={placeholder}
          className="flex-1 h-9 bg-[#0f1824] border border-[#1c2a3a] rounded-lg px-3 text-[#e8f0fe] placeholder-[#3d5068] text-[13px] focus:outline-none focus:border-accent transition-colors"
        />
        <button
          onClick={() => add(draft)}
          className="px-3 h-9 bg-[#162030] border border-[#1c2a3a] rounded-lg text-[#7a8fa8] hover:text-accent hover:border-accent/30 text-[13px] transition-colors"
        >
          Add
        </button>
      </div>
      {suggestions && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.filter((s) => !values.includes(s)).map((s) => (
            <button
              key={s}
              onClick={() => onChange([...values, s])}
              className="px-2 py-0.5 bg-[#162030] border border-[#1c2a3a] rounded-full text-[10px] text-[#7a8fa8] hover:text-accent hover:border-accent/30 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SegmentForm {
  name: string;
  description: string;
  filters: AudienceFilters;
}

const EMPTY_FORM: SegmentForm = {
  name: '',
  description: '',
  filters: { interests: [], geography: [], tags: [] },
};

export default function AdminAudiencePage() {
  const [segments, setSegments] = useState<DbAudienceSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<SegmentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { loadSegments(); }, []);

  async function loadSegments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
    if (!profile?.tenant_id) return;
    const { data } = await supabase
      .from('audience_segments')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });
    setSegments(data ?? []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(seg: DbAudienceSegment) {
    setEditing(seg.id);
    setForm({ name: seg.name, description: seg.description ?? '', filters: seg.filters });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
    if (!profile?.tenant_id) { setSaving(false); return; }

    if (editing) {
      const { data } = await supabase
        .from('audience_segments')
        .update({ name: form.name, description: form.description || null, filters: form.filters })
        .eq('id', editing)
        .select()
        .single();
      if (data) setSegments((prev) => prev.map((s) => s.id === editing ? data : s));
    } else {
      const { data } = await supabase
        .from('audience_segments')
        .insert({ tenant_id: profile.tenant_id, name: form.name, description: form.description || null, filters: form.filters, created_by: user.id })
        .select()
        .single();
      if (data) setSegments((prev) => [data, ...prev]);
    }

    setSaving(false);
    setShowForm(false);
  }

  async function deleteSegment(id: string) {
    if (!confirm('Delete this segment?')) return;
    setDeleting(id);
    await supabase.from('audience_segments').delete().eq('id', id);
    setSegments((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  }

  function updateFilter<K extends keyof AudienceFilters>(key: K, val: AudienceFilters[K]) {
    setForm((prev) => ({ ...prev, filters: { ...prev.filters, [key]: val } }));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[#e8f0fe]">Audience</h1>
          <p className="text-[#7a8fa8] text-sm mt-0.5">Segment your users to target missions precisely</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={openCreate}
          className="flex items-center gap-2 h-10 px-5 bg-accent text-[#060a0e] rounded-xl font-semibold text-sm shadow-[0_4px_16px_rgba(0,230,118,0.35)]"
        >
          <Plus size={16} strokeWidth={2.5} /> New Segment
        </motion.button>
      </div>

      {/* Segment list */}
      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : segments.length === 0 && !showForm ? (
        <div className="py-24 text-center bg-[#111927] border border-[#1c2a3a] rounded-2xl">
          <Users size={36} className="text-[#3d5068] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[#7a8fa8] font-medium mb-1">No audience segments yet</p>
          <p className="text-[#3d5068] text-sm mb-5">Create segments to target missions at specific user groups.</p>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 h-10 bg-accent text-[#060a0e] rounded-xl font-semibold text-sm">
            <Plus size={15} strokeWidth={2.5} /> Create Segment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {segments.map((seg) => (
            <div key={seg.id} className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5 hover:border-[#2a3f58] transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-[15px] font-bold text-[#e8f0fe]">{seg.name}</h3>
                  {seg.description && <p className="text-[13px] text-[#7a8fa8] mt-0.5">{seg.description}</p>}
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(seg)} className="w-8 h-8 rounded-lg bg-[#162030] flex items-center justify-center text-[#7a8fa8] hover:text-accent transition-colors">
                    <Tag size={13} strokeWidth={2} />
                  </button>
                  <button onClick={() => deleteSegment(seg.id)} disabled={deleting === seg.id} className="w-8 h-8 rounded-lg bg-[#162030] flex items-center justify-center text-[#7a8fa8] hover:text-[#ff5252] transition-colors disabled:opacity-40">
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(seg.filters.interests ?? []).map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 bg-accent-light text-accent rounded-full">{t}</span>
                ))}
                {(seg.filters.geography ?? []).map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 bg-[#001a22] text-[#22d3ee] rounded-full">{t}</span>
                ))}
                {(seg.filters.tags ?? []).map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 bg-[#162030] text-[#7a8fa8] rounded-full">{t}</span>
                ))}
                {(seg.filters.interests ?? []).length === 0 && (seg.filters.geography ?? []).length === 0 && (seg.filters.tags ?? []).length === 0 && (
                  <span className="text-[10px] text-[#3d5068]">No filters — matches all users</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-6"
          >
            <h2 className="text-[16px] font-bold text-[#e8f0fe] mb-5">
              {editing ? 'Edit Segment' : 'New Segment'}
            </h2>

            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-1.5 block">Segment Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. New Customers"
                    className="w-full h-11 bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 text-[#e8f0fe] placeholder-[#3d5068] text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-1.5 block">Description</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Optional description"
                    className="w-full h-11 bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 text-[#e8f0fe] placeholder-[#3d5068] text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-2 block">Interests</label>
                <TagInput
                  values={form.filters.interests ?? []}
                  onChange={(v) => updateFilter('interests', v)}
                  placeholder="Add interest and press Enter"
                  suggestions={INTEREST_SUGGESTIONS}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-2 block">Geography</label>
                <TagInput
                  values={form.filters.geography ?? []}
                  onChange={(v) => updateFilter('geography', v)}
                  placeholder="Add region and press Enter"
                  suggestions={GEO_SUGGESTIONS}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-2 block">Custom Tags</label>
                <TagInput
                  values={form.filters.tags ?? []}
                  onChange={(v) => updateFilter('tags', v)}
                  placeholder="Add tag and press Enter"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="flex items-center gap-2 h-10 px-5 bg-accent text-[#060a0e] rounded-xl font-semibold text-sm shadow-[0_4px_16px_rgba(0,230,118,0.35)] disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} strokeWidth={2} className="animate-spin" /> : <Save size={15} strokeWidth={2} />}
                  {editing ? 'Update Segment' : 'Create Segment'}
                </motion.button>
                <button
                  onClick={() => setShowForm(false)}
                  className="h-10 px-5 bg-[#162030] border border-[#1c2a3a] rounded-xl text-[#7a8fa8] hover:text-[#e8f0fe] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
