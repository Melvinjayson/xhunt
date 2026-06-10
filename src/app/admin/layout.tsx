'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { createClient } from '@/lib/supabase/client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/login'); return; }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, tenant_id, onboarding_complete')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id || !profile?.onboarding_complete) {
        router.replace('/onboard');
        return;
      }

      const adminRoles = ['platform_admin', 'tenant_admin', 'mission_creator', 'analyst'];
      if (!adminRoles.includes(profile.role)) {
        router.replace('/home');
        return;
      }

      setAuthorized(true);
    }
    checkAccess();
  }, [router, supabase]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#050816]">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
