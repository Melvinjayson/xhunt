'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import type { DbTenant } from '@/lib/supabase/types';
import { cn } from '@/lib/cn';

const PLAN_BADGE: Record<string, string> = {
  enterprise: 'text-[#A99FFE] bg-[#6D5DFD]/15',
  growth:     'text-accent bg-accent/10',
  starter:    'text-[#7a8fa8] bg-[#162030]',
};

export default function AdminOverviewPage() {
  const [tenants, setTenants] = useState<DbTenant[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!isLoaded || !user) return;

      const [tenantsRes, usersRes, adminsRes] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'platform_admin'),
      ]);

      setTenants(tenantsRes.data ?? []);
      setTotalUsers(usersRes.count ?? 0);
      setAdminCount(adminsRes.count ?? 0);
      setLoading(false);
    }
    load();
  }, [supabase, user, isLoaded]);

  const stats = [
    { label: 'Tenants',         value: tenants.length, icon: Building2,   color: 'text-accent',    bg: 'bg-accent/10',  href: '/admin/tenants' },
    { label: 'Total Users',     value: totalUsers,     icon: Users,       color: 'text-[#6D5DFD]', bg: 'bg-[#001a22]',  href: '/admin/users' },
    { label: 'Platform Admins', value: adminCount,     icon: ShieldCheck, color: 'text-[#A99FFE]', bg: 'bg-[#6D5DFD]/15', href: '/admin/users' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[#7a8fa8] text-sm font-medium mb-0.5">Platform administration</p>
        <h1 className="text-[28px] font-bold text-[#e8f0fe]">Overview</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg, href }, i) => (
          <Link key={label} href={href}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5 hover:border-accent/30 transition-colors cursor-pointer"
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', bg)}>
                <Icon size={20} className={color} strokeWidth={2} />
              </div>
              <p className={cn('text-[28px] font-bold', color)}>{value}</p>
              <p className="text-[#7a8fa8] text-[13px] font-medium mt-0.5">{label}</p>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Recent tenants */}
      <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2a3a]">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-accent" strokeWidth={2} />
            <h2 className="text-[15px] font-bold text-[#e8f0fe]">Recent Tenants</h2>
          </div>
          <Link href="/admin/tenants" className="text-[13px] text-accent font-medium flex items-center gap-1 hover:text-accent-dark transition-colors">
            View all <ArrowRight size={13} strokeWidth={2.5} />
          </Link>
        </div>

        {tenants.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 size={32} className="text-[#3d5068] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[#7a8fa8] font-medium mb-1">No tenants yet</p>
            <p className="text-[#3d5068] text-sm">Tenants appear here as organizations onboard.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1c2a3a]">
            {tenants.slice(0, 6).map((tn) => (
              <Link
                key={tn.id}
                href="/admin/tenants"
                className="flex items-center gap-4 px-6 py-4 hover:bg-[#162030] transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-[#162030] border border-[#1c2a3a] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {tn.logo_url
                    ? <img src={tn.logo_url} alt="" className="w-full h-full object-cover" />
                    : <Building2 size={16} className="text-[#7a8fa8]" strokeWidth={1.8} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#e8f0fe] truncate group-hover:text-accent transition-colors">
                    {tn.name}
                  </p>
                  <p className="text-[12px] text-[#7a8fa8] mt-0.5 truncate">/{tn.slug}</p>
                </div>
                <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full capitalize', PLAN_BADGE[tn.plan] ?? PLAN_BADGE.starter)}>
                  {tn.plan}
                </span>
                <ArrowRight size={15} className="text-[#3d5068] group-hover:text-accent transition-colors flex-shrink-0" strokeWidth={2} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
