'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Search, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import type { DbTenant } from '@/lib/supabase/types';
import { cn } from '@/lib/cn';

const PLAN_BADGE: Record<string, string> = {
  enterprise: 'text-[#A99FFE] bg-[#6D5DFD]/15',
  growth:     'text-accent bg-accent/10',
  starter:    'text-[#7a8fa8] bg-[#162030]',
};

interface TenantRow extends DbTenant {
  userCount: number;
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!isLoaded || !user) return;

      const { data: rows } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      const list = rows ?? [];
      // User counts per tenant (platform-level view).
      const withCounts = await Promise.all(
        list.map(async (tn) => {
          const { count } = await supabase
            .from('user_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tn.id);
          return { ...tn, userCount: count ?? 0 } as TenantRow;
        }),
      );
      setTenants(withCounts);
      setLoading(false);
    }
    load();
  }, [supabase, user, isLoaded]);

  const filtered = tenants.filter((tn) =>
    tn.name.toLowerCase().includes(query.toLowerCase()) ||
    tn.slug.toLowerCase().includes(query.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[#7a8fa8] text-sm font-medium mb-0.5">Platform administration</p>
          <h1 className="text-[28px] font-bold text-[#e8f0fe]">Tenants</h1>
        </div>
        <div className="flex items-center gap-2 h-10 px-3 bg-[#111927] border border-[#1c2a3a] rounded-xl">
          <Search size={15} className="text-[#3d5068]" strokeWidth={2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tenants…"
            className="bg-transparent text-[13px] text-[#e8f0fe] placeholder:text-[#3d5068] outline-none w-48"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-accent/10">
            <Building2 size={20} className="text-accent" strokeWidth={2} />
          </div>
          <p className="text-[28px] font-bold text-accent">{tenants.length}</p>
          <p className="text-[#7a8fa8] text-[13px] font-medium mt-0.5">Total Tenants</p>
        </div>
        <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-[#001a22]">
            <Users size={20} className="text-[#6D5DFD]" strokeWidth={2} />
          </div>
          <p className="text-[28px] font-bold text-[#6D5DFD]">
            {tenants.reduce((sum, tn) => sum + tn.userCount, 0)}
          </p>
          <p className="text-[#7a8fa8] text-[13px] font-medium mt-0.5">Total Users</p>
        </div>
        <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-[#6D5DFD]/15">
            <Building2 size={20} className="text-[#A99FFE]" strokeWidth={2} />
          </div>
          <p className="text-[28px] font-bold text-[#A99FFE]">
            {tenants.filter((tn) => tn.plan === 'enterprise').length}
          </p>
          <p className="text-[#7a8fa8] text-[13px] font-medium mt-0.5">Enterprise Plans</p>
        </div>
      </div>

      <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1c2a3a]">
          <h2 className="text-[15px] font-bold text-[#e8f0fe]">All Tenants</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 size={32} className="text-[#3d5068] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[#7a8fa8] font-medium">No tenants match your search.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1c2a3a]">
            {filtered.map((tn, i) => (
              <motion.div
                key={tn.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="flex items-center gap-4 px-6 py-4"
              >
                <div className="w-9 h-9 rounded-lg bg-[#162030] border border-[#1c2a3a] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {tn.logo_url
                    ? <img src={tn.logo_url} alt="" className="w-full h-full object-cover" />
                    : <Building2 size={16} className="text-[#7a8fa8]" strokeWidth={1.8} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#e8f0fe] truncate">{tn.name}</p>
                  <p className="text-[12px] text-[#7a8fa8] mt-0.5 truncate">/{tn.slug}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#7a8fa8]">
                  <Users size={13} strokeWidth={2} />
                  {tn.userCount}
                </div>
                <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full capitalize', PLAN_BADGE[tn.plan] ?? PLAN_BADGE.starter)}>
                  {tn.plan}
                </span>
                <span className="text-[12px] text-[#3d5068] w-24 text-right">
                  {new Date(tn.created_at).toLocaleDateString()}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-[12px] text-[#3d5068] flex items-center gap-1.5">
        <ExternalLink size={12} strokeWidth={2} />
        Mission, outcome and economy management now lives in the tenant Workspace.
      </p>
    </div>
  );
}
