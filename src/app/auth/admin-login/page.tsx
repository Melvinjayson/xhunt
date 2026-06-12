'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff, Cpu, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data.user) {
        setError(authError?.message ?? 'Invalid credentials');
        return;
      }
      // Verify admin role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, tenant_id, onboarding_complete')
        .eq('id', data.user.id)
        .single();

      const adminRoles = ['platform_admin', 'tenant_admin', 'mission_creator', 'analyst'];
      if (!profile || !adminRoles.includes(profile.role)) {
        await supabase.auth.signOut();
        setError('You do not have admin access. Use the workspace login instead.');
        return;
      }
      if (!profile.onboarding_complete) {
        router.replace('/onboard');
        return;
      }
      router.replace('/admin');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #020510 0%, #050816 40%, #0a0b1e 100%)' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[420px] flex-col justify-between p-12"
        style={{ background: 'linear-gradient(180deg, rgba(109,93,253,0.08) 0%, transparent 100%)', borderRight: '1px solid rgba(109,93,253,0.12)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(109,93,253,0.15)', border: '1px solid rgba(109,93,253,0.25)' }}>
            <Cpu size={18} className="text-[#A99FFE]" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#F0F4FF] tracking-tight">X-hunt</p>
            <p className="text-[10px] text-[#4A5578]">Admin Console</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-[32px] font-extrabold text-[#F0F4FF] leading-tight tracking-tight">
              Mission Control<br />
              <span style={{ color: '#A99FFE' }}>Administration</span>
            </h1>
            <p className="text-[14px] text-[#4A5578] mt-3 leading-relaxed">
              Secure access to platform management, analytics, and constitutional AI governance.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Platform Analytics', desc: 'Full-spectrum intelligence dashboard' },
              { label: 'Agent Management',   desc: 'XIL orchestration and agent registry' },
              { label: 'Economy Protocol',   desc: 'Trust scores, contributions, governance' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(109,93,253,0.06)', border: '1px solid rgba(109,93,253,0.1)' }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#A99FFE' }} />
                <div>
                  <p className="text-[12px] font-semibold text-[#F0F4FF]">{label}</p>
                  <p className="text-[11px] text-[#4A5578]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-[#4A5578]">X-hunt Admin Console · Restricted Access</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(109,93,253,0.15)', border: '1px solid rgba(109,93,253,0.25)' }}>
              <Cpu size={18} className="text-[#A99FFE]" strokeWidth={1.8} />
            </div>
            <p className="text-[15px] font-bold text-[#F0F4FF]">X-hunt Admin</p>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-[#6D5DFD]" strokeWidth={2} />
              <h2 className="text-[22px] font-extrabold text-[#F0F4FF] tracking-tight">Admin Sign In</h2>
            </div>
            <p className="text-[13px] text-[#4A5578]">Restricted to platform and tenant administrators only.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e: { target: { value: string } }) => setEmail(e.target.value)}
                placeholder="admin@yourorganization.com"
                required
                autoComplete="email"
                className="w-full h-11 px-4 rounded-xl text-[14px] text-[#F0F4FF] placeholder:text-[#4A5578] focus:outline-none"
                style={{ background: 'rgba(109,93,253,0.06)', border: '1px solid rgba(109,93,253,0.15)' }}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e: { target: { value: string } }) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full h-11 px-4 pr-11 rounded-xl text-[14px] text-[#F0F4FF] placeholder:text-[#4A5578] focus:outline-none"
                  style={{ background: 'rgba(109,93,253,0.06)', border: '1px solid rgba(109,93,253,0.15)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5578] hover:text-[#8B9CC0] transition-colors"
                >
                  {showPw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(255,92,122,0.08)', border: '1px solid rgba(255,92,122,0.2)' }}>
                <AlertCircle size={13} className="text-[#FF5C7A] mt-0.5 flex-shrink-0" strokeWidth={2} />
                <p className="text-[12px] text-[#FF5C7A]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-11 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6D5DFD, #5448D9)', color: '#FFFFFF' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock size={14} strokeWidth={2.5} />
                  Sign in to Admin Console
                  <ArrowRight size={14} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t flex items-center justify-between" style={{ borderColor: 'rgba(109,93,253,0.1)' }}>
            <a href="/auth/login" className="text-[12px] text-[#4A5578] hover:text-[#8B9CC0] transition-colors">
              ← Workspace login
            </a>
            <a href="/auth/login?reset=1" className="text-[12px] text-[#6D5DFD] hover:text-[#A99FFE] transition-colors">
              Forgot password?
            </a>
          </div>

          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(109,93,253,0.04)', border: '1px solid rgba(109,93,253,0.08)' }}>
            <ShieldCheck size={11} className="text-[#4A5578] flex-shrink-0" strokeWidth={2} />
            <p className="text-[10px] text-[#4A5578]">All admin sessions are logged and audited for security compliance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
