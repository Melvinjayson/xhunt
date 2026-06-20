'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Menu, X } from 'lucide-react';
import WorkspaceSidebar from '@/components/workspace/WorkspaceSidebar';
import WorkspaceTour from '@/components/workspace/WorkspaceTour';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/theme/colors';

interface WorkspaceUser {
  orgName: string;
  plan: string;
  userName: string | null;
  userRole: string;
  avatarUrl: string | null;
}

const ADMIN_ROLES = ['platform_admin', 'tenant_admin', 'mission_creator', 'analyst'];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useAuth();
  const [workspaceUser, setWorkspaceUser] = useState<WorkspaceUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wsTourDone, setWsTourDone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !!localStorage.getItem('xhunt_workspace_tour_done');
  });

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.replace('/sign-in?redirect_url=/workspace'); return; }

    // Gate 1: requires tenant + completed onboarding (read from JWT via auth context)
    if (!user.tenantId || !user.onboardingComplete) {
      router.replace('/get-started');
      return;
    }

    // Gate 2: workspace roles only
    if (!ADMIN_ROLES.includes(user.role)) {
      router.replace('/home');
      return;
    }

    // All gates passed — fetch display info from Supabase (best-effort, falls back to defaults)
    async function fetchDisplayInfo() {
      const supabase = createClient();

      const [profileRes, tenantRes] = await Promise.all([
        supabase.from('user_profiles').select('display_name, avatar_url').eq('id', user!.id).single(),
        supabase.from('tenants').select('name, plan').eq('id', user!.tenantId!).single(),
      ]);

      setWorkspaceUser({
        orgName:   tenantRes.data?.name  ?? 'Demo Organization',
        plan:      tenantRes.data?.plan  ?? 'starter',
        userName:  profileRes.data?.display_name ?? user!.displayName,
        userRole:  user!.role,
        avatarUrl: profileRes.data?.avatar_url   ?? user!.avatarUrl,
      });
    }
    fetchDisplayInfo();
  }, [isLoaded, user, router]);

  if (!workspaceUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium" style={{ color: t.txtFaint }}>Loading workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-shell">
      <WorkspaceSidebar
        orgName={workspaceUser.orgName}
        plan={workspaceUser.plan}
        userName={workspaceUser.userName}
        userRole={workspaceUser.userRole}
        avatarUrl={workspaceUser.avatarUrl}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="portal-main flex flex-col">
        <header className="portal-topbar">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle navigation"
            className="p-2 rounded-lg transition-colors"
            style={{ color: t.txtDim }}
          >
            {sidebarOpen ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
          </button>
          <span className="text-[15px] font-bold tracking-tight" style={{ color: t.txt }}>Workspace</span>
        </header>
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
        {!wsTourDone && (
          <WorkspaceTour onDone={() => {
            localStorage.setItem('xhunt_workspace_tour_done', '1');
            setWsTourDone(true);
          }} />
        )}
      </div>
    </div>
  );
}
