'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkspaceSidebar from '@/components/workspace/WorkspaceSidebar';
import { createClient } from '@/lib/supabase/client';

interface WorkspaceUser {
  orgName: string;
  plan: string;
  userName: string | null;
  userRole: string;
  avatarUrl: string | null;
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<WorkspaceUser | null>(null);

  useEffect(() => {
    async function boot() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.replace('/auth/login?next=/workspace'); return; }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, tenant_id, display_name, avatar_url, onboarding_complete')
        .eq('id', authUser.id)
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

      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, plan')
        .eq('id', profile.tenant_id)
        .single();

      setUser({
        orgName: tenant?.name ?? 'Your Organization',
        plan: tenant?.plan ?? 'starter',
        userName: profile.display_name,
        userRole: profile.role,
        avatarUrl: profile.avatar_url,
      });
    }
    boot();
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-[#4A5578] text-sm font-medium">Loading workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#050816]">
      <WorkspaceSidebar
        orgName={user.orgName}
        plan={user.plan}
        userName={user.userName}
        userRole={user.userRole}
        avatarUrl={user.avatarUrl}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
