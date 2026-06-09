'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Network, ArrowRight, Loader2, X, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DbKgNode, DbKgEdge, KgNodeType, KgRelationship } from '@/lib/supabase/types';
import { cn } from '@/lib/cn';

const NODE_TYPE_COLORS: Record<string, string> = {
  mission:      'text-accent bg-accent/10 border-accent/20',
  skill:        'text-[#818cf8] bg-[#818cf8]/10 border-[#818cf8]/20',
  outcome:      'text-[#2dd4bf] bg-[#2dd4bf]/10 border-[#2dd4bf]/20',
  user:         'text-[#f472b6] bg-[#f472b6]/10 border-[#f472b6]/20',
  reward:       'text-[#fbbf24] bg-[#fbbf24]/10 border-[#fbbf24]/20',
  organization: 'text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/20',
  industry:     'text-[#a78bfa] bg-[#a78bfa]/10 border-[#a78bfa]/20',
};

const NODE_TYPES: KgNodeType[] = ['mission', 'skill', 'outcome', 'user', 'reward', 'organization', 'industry'];
const RELATIONSHIPS: KgRelationship[] = ['completes', 'requires', 'develops', 'unlocks', 'leads_to', 'similar_to'];

interface NodeWithEdges extends DbKgNode {
  edges: (DbKgEdge & { other: DbKgNode | null })[];
}

export default function KnowledgeGraphPage() {
  const [nodes, setNodes] = useState<DbKgNode[]>([]);
  const [selected, setSelected] = useState<NodeWithEdges | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add node form
  const [showAdd, setShowAdd] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addType, setAddType] = useState<KgNodeType>('skill');
  const [addSaving, setAddSaving] = useState(false);

  // Add edge form
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [edgeTargetId, setEdgeTargetId] = useState('');
  const [edgeRel, setEdgeRel] = useState<KgRelationship>('requires');
  const [edgeWeight, setEdgeWeight] = useState('1');
  const [edgeSaving, setEdgeSaving] = useState(false);

  const supabase = createClient();

  const loadNodes = useCallback(async () => {
    const { data } = await supabase.from('kg_nodes').select('*').order('label');
    setNodes((data as DbKgNode[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadNodes(); }, [loadNodes]);

  const selectNode = useCallback(async (node: DbKgNode) => {
    setDetailLoading(true);
    setSelected(null);
    setShowAddEdge(false);

    const { data: edges } = await supabase
      .from('kg_edges')
      .select('*')
      .or(`from_node_id.eq.${node.id},to_node_id.eq.${node.id}`);

    const allEdges = (edges as DbKgEdge[]) ?? [];

    const otherIds = allEdges.map((e) => e.from_node_id === node.id ? e.to_node_id : e.from_node_id);
    const { data: otherNodes } = otherIds.length > 0
      ? await supabase.from('kg_nodes').select('*').in('id', [...new Set(otherIds)])
      : { data: [] };

    const nodeMap = new Map(((otherNodes as DbKgNode[]) ?? []).map((n) => [n.id, n]));

    setSelected({
      ...node,
      edges: allEdges.map((e) => ({
        ...e,
        other: nodeMap.get(e.from_node_id === node.id ? e.to_node_id : e.from_node_id) ?? null,
      })),
    });
    setDetailLoading(false);
  }, [supabase]);

  async function addNode() {
    if (!addLabel.trim()) return;
    setAddSaving(true);
    await supabase.from('kg_nodes').insert({ label: addLabel.trim(), node_type: addType, properties: {} });
    setAddLabel('');
    setShowAdd(false);
    setAddSaving(false);
    loadNodes();
  }

  async function addEdge() {
    if (!selected || !edgeTargetId) return;
    setEdgeSaving(true);
    await supabase.from('kg_edges').insert({
      from_node_id: selected.id,
      to_node_id: edgeTargetId,
      relationship: edgeRel,
      weight: parseFloat(edgeWeight) || 1,
    });
    setEdgeTargetId('');
    setShowAddEdge(false);
    setEdgeSaving(false);
    selectNode(selected);
  }

  async function deleteEdge(edgeId: string) {
    await supabase.from('kg_edges').delete().eq('id', edgeId);
    if (selected) selectNode(selected);
  }

  const filtered = nodes.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase()) ||
    n.node_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#e8f0fe] flex items-center gap-2">
            <Network size={20} className="text-ai" strokeWidth={2} /> Knowledge Graph
          </h1>
          <p className="text-[#7a8fa8] text-sm mt-0.5">{nodes.length} nodes · Powers mission recommendations</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-9 px-4 bg-accent text-[#060a0e] rounded-xl font-semibold text-sm shadow-[0_2px_12px_rgba(0,230,118,0.3)]">
          <Plus size={15} strokeWidth={2.5} /> Add node
        </button>
      </div>

      {/* Add node panel */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-[#111927] border border-accent/30 rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-bold text-[#e8f0fe]">New node</p>
              <button onClick={() => setShowAdd(false)} className="text-[#3d5068] hover:text-[#e8f0fe]"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input value={addLabel} onChange={(e) => setAddLabel(e.target.value)} placeholder="Label"
                className="col-span-2 h-10 bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-3 text-[#e8f0fe] text-sm focus:outline-none focus:border-accent" />
              <div className="relative">
                <select value={addType} onChange={(e) => setAddType(e.target.value as KgNodeType)}
                  className="w-full h-10 bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-3 text-[#e8f0fe] text-sm focus:outline-none focus:border-accent appearance-none">
                  {NODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3d5068] pointer-events-none" />
              </div>
            </div>
            <button onClick={addNode} disabled={addSaving || !addLabel.trim()}
              className="flex items-center gap-2 h-9 px-5 bg-accent text-[#060a0e] rounded-xl font-bold text-sm disabled:opacity-60">
              {addSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />} Save node
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-[320px_1fr] gap-5">
        {/* Node list */}
        <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-[#1c2a3a]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d5068]" strokeWidth={2} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search nodes…"
                className="w-full h-9 bg-[#0f1824] border border-[#1c2a3a] rounded-xl pl-8 pr-3 text-[#e8f0fe] text-[13px] focus:outline-none focus:border-accent" />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[540px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="text-accent animate-spin" strokeWidth={2} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center px-4">
                <Network size={28} className="text-[#1c2a3a] mb-3" strokeWidth={1.5} />
                <p className="text-[#3d5068] text-sm">{search ? 'No nodes match.' : 'No nodes yet — add one to get started.'}</p>
              </div>
            ) : (
              filtered.map((node) => (
                <button key={node.id} onClick={() => selectNode(node)}
                  className={cn('w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0f1824] transition-colors border-b border-[#1c2a3a] last:border-0 text-left',
                    selected?.id === node.id && 'bg-[#0f1824]')}>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex-shrink-0', NODE_TYPE_COLORS[node.node_type])}>
                    {node.node_type}
                  </span>
                  <p className="text-[13px] font-semibold text-[#e8f0fe] truncate flex-1">{node.label}</p>
                  {selected?.id === node.id && <ArrowRight size={14} className="text-accent flex-shrink-0" strokeWidth={2} />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5">
          {detailLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={20} className="text-accent animate-spin" strokeWidth={2} />
            </div>
          ) : selected === null ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Network size={32} className="text-[#1c2a3a] mb-3" strokeWidth={1.5} />
              <p className="text-[#3d5068] text-sm">Select a node to explore its connections.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border mb-2', NODE_TYPE_COLORS[selected.node_type])}>
                    {selected.node_type}
                  </span>
                  <h2 className="text-[18px] font-bold text-[#e8f0fe]">{selected.label}</h2>
                </div>
                <span className="text-[11px] text-[#3d5068] font-mono mt-1">{selected.edges.length} edges</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-bold text-[#7a8fa8] uppercase tracking-wider">Connections</p>
                  <button onClick={() => setShowAddEdge((v) => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-ai hover:text-ai/80 transition-colors">
                    <Plus size={12} strokeWidth={2.5} /> Add edge
                  </button>
                </div>

                <AnimatePresence>
                  {showAddEdge && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-3">
                      <div className="bg-[#0f1824] border border-ai/20 rounded-xl p-3 flex flex-col gap-2">
                        <div className="relative">
                          <select value={edgeTargetId} onChange={(e) => setEdgeTargetId(e.target.value)}
                            className="w-full h-9 bg-[#111927] border border-[#1c2a3a] rounded-lg px-3 text-[#e8f0fe] text-[13px] focus:outline-none focus:border-accent appearance-none">
                            <option value="">Select target node…</option>
                            {nodes.filter((n) => n.id !== selected.id).map((n) => (
                              <option key={n.id} value={n.id}>{n.label} ({n.node_type})</option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3d5068] pointer-events-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <select value={edgeRel} onChange={(e) => setEdgeRel(e.target.value as KgRelationship)}
                              className="w-full h-9 bg-[#111927] border border-[#1c2a3a] rounded-lg px-3 text-[#e8f0fe] text-[13px] focus:outline-none focus:border-accent appearance-none">
                              {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3d5068] pointer-events-none" />
                          </div>
                          <input type="number" value={edgeWeight} onChange={(e) => setEdgeWeight(e.target.value)}
                            placeholder="Weight (1)" min="0" max="1" step="0.1"
                            className="h-9 bg-[#111927] border border-[#1c2a3a] rounded-lg px-3 text-[#e8f0fe] text-[13px] focus:outline-none focus:border-accent" />
                        </div>
                        <button onClick={addEdge} disabled={edgeSaving || !edgeTargetId}
                          className="flex items-center gap-2 h-8 px-4 bg-ai/10 border border-ai/20 rounded-lg text-ai text-[13px] font-semibold disabled:opacity-60 w-fit">
                          {edgeSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selected.edges.length === 0 ? (
                  <p className="text-[12px] text-[#3d5068]">No connections yet.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {selected.edges.map((edge) => {
                      const isSource = edge.from_node_id === selected.id;
                      return (
                        <div key={edge.id} className="flex items-center gap-3 bg-[#0f1824] rounded-xl px-3 py-2.5 group">
                          <span className="text-[11px] text-[#3d5068]">{isSource ? '→' : '←'}</span>
                          <span className="text-[11px] font-semibold text-ai uppercase tracking-wide">{edge.relationship}</span>
                          <div className="flex-1 min-w-0">
                            {edge.other ? (
                              <>
                                <span className={cn('text-[10px] font-bold uppercase mr-1.5 px-1.5 py-0.5 rounded border', NODE_TYPE_COLORS[edge.other.node_type])}>
                                  {edge.other.node_type}
                                </span>
                                <span className="text-[13px] text-[#e8f0fe]">{edge.other.label}</span>
                              </>
                            ) : (
                              <span className="text-[12px] text-[#3d5068] font-mono">
                                {isSource ? edge.to_node_id : edge.from_node_id}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#3d5068]">w={edge.weight}</span>
                          <button onClick={() => deleteEdge(edge.id)}
                            className="opacity-0 group-hover:opacity-100 text-[#3d5068] hover:text-[#ff5252] transition-all">
                            <X size={13} strokeWidth={2} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
