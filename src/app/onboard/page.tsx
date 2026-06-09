'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ArrowRight, Loader2, Users, Briefcase, GraduationCap, Zap, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/cn';

const ORG_TYPES = [
  { id: 'brand', label: 'Brand / Marketing', icon: Zap, desc: 'Customer engagement campaigns' },
  { id: 'enterprise', label: 'Enterprise', icon: Briefcase, desc: 'Workforce & training missions' },
  { id: 'education', label: 'Education', icon: GraduationCap, desc: 'Learning & assessment flows' },
  { id: 'community', label: 'Community / Creator', icon: Users, desc: 'Experiences for your audience' },
];

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      // Check if already onboarded
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id, onboarding_complete')
        .eq('id', user.id)
        .single();

      if (profile?.tenant_id && profile?.onboarding_complete) {
        router.replace('/admin');
        return;
      }
      setMounted(true);
    }
    checkAuth();
  }, [router, supabase]);

  if (!mounted) return null;

  function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function handleCreate() {
    if (!orgName || !orgType) return;
    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create tenant
      const slug = `${slugify(orgName)}-${Math.random().toString(36).slice(2, 7)}`;
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: orgName, slug, settings: { org_type: orgType } })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          tenant_id: tenant.id,
          role: 'tenant_admin',
          onboarding_complete: true,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center px-5">
      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(0,230,118,0.4)]">
            <span className="text-[#060a0e] font-black text-lg">X</span>
          </div>
          <span className="text-xl font-bold text-[#e8f0fe]">hunt</span>
          <span className="ml-2 text-[11px] font-semibold text-[#3d5068] bg-[#111927] border border-[#1c2a3a] rounded-full px-2.5 py-1 uppercase tracking-wider">
            Workspace setup
          </span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={pageVariants} initial="hidden" animate="visible" exit="exit">
              <h1 className="text-[26px] font-bold text-[#e8f0fe] mb-1">Name your organization</h1>
              <p className="text-[#7a8fa8] text-sm mb-8">This is your team&apos;s workspace on X-hunt.</p>

              <div className="relative mb-6">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3d5068]" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="e.g. Acme Corp, Nike Africa, Oxford University"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  autoFocus
                  className="w-full h-13 bg-[#111927] border border-[#1c2a3a] rounded-xl pl-11 pr-4 py-3.5 text-[#e8f0fe] placeholder-[#3d5068] text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={orgName.trim().length < 2}
                onClick={() => setStep(2)}
                className="w-full h-12 bg-accent text-[#060a0e] rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(0,230,118,0.35)] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight size={16} strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={pageVariants} initial="hidden" animate="visible" exit="exit">
              <button onClick={() => setStep(1)} className="text-[#7a8fa8] text-sm mb-6 flex items-center gap-1 hover:text-[#e8f0fe] transition-colors">
                ← Back
              </button>

              <h1 className="text-[26px] font-bold text-[#e8f0fe] mb-1">What best describes you?</h1>
              <p className="text-[#7a8fa8] text-sm mb-6">We&apos;ll set up the right templates for your team.</p>

              {error && (
                <div className="flex items-center gap-2 bg-[#2a0a0a] border border-[#ff5252]/30 rounded-xl px-4 py-3 mb-5">
                  <AlertCircle size={15} className="text-[#ff5252] flex-shrink-0" strokeWidth={2} />
                  <p className="text-[13px] text-[#ff5252]">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                {ORG_TYPES.map(({ id, label, icon: Icon, desc }) => {
                  const active = orgType === id;
                  return (
                    <motion.button
                      key={id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setOrgType(id)}
                      className={cn(
                        'flex flex-col items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200',
                        active ? 'border-accent bg-accent-light' : 'border-[#1c2a3a] bg-[#111927]'
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', active ? 'bg-accent/20' : 'bg-[#162030]')}>
                        <Icon size={18} className={active ? 'text-accent' : 'text-[#7a8fa8]'} strokeWidth={2} />
                      </div>
                      <div>
                        <p className={cn('text-[13px] font-semibold mb-0.5', active ? 'text-accent' : 'text-[#e8f0fe]')}>{label}</p>
                        <p className="text-[11px] text-[#7a8fa8] leading-relaxed">{desc}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={!orgType || saving}
                onClick={handleCreate}
                className="w-full h-12 bg-accent text-[#060a0e] rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(0,230,118,0.35)] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 size={18} strokeWidth={2} className="animate-spin" />
                ) : (
                  <>Launch workspace <ArrowRight size={16} strokeWidth={2.5} /></>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
