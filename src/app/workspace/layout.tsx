'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';
import WorkspaceSidebar from '@/components/workspace/WorkspaceSidebar';

interface WorkspaceUser {
  orgName: string;
  plan: string;
  userName: string | null;
  userRole: string;
  avatarUrl: string | null;
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: clerkUser, isLoaded } = useUser();
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) { router.replace('/sign-in'); return; }

    const orgMembership = clerkUser.organizationMemberships?.[0];
    setUser({
      orgName: orgMembership?.organization.name ?? 'Your Organization',
      plan: 'starter',
      userName: clerkUser.fullName ?? clerkUser.username ?? clerkUser.primaryEmailAddress?.emailAddress ?? 'User',
      userRole: 'tenant_admin',
      avatarUrl: clerkUser.imageUrl ?? null,
    });
  }, [isLoaded, clerkUser, router]);

  if (!isLoaded || !user) {
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
    <div className="portal-shell">
      <WorkspaceSidebar
        orgName={user.orgName}
        plan={user.plan}
        userName={user.userName}
        userRole={user.userRole}
        avatarUrl={user.avatarUrl}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="portal-main flex flex-col">
        {/* Mobile top bar */}
        <header className="portal-topbar">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle navigation"
            className="p-2 rounded-lg text-[#8B9CC0] hover:text-[#F0F4FF] hover:bg-[#0A1226] transition-colors"
          >
            {sidebarOpen ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
          </button>
          <span className="text-[15px] font-bold text-[#F0F4FF] tracking-tight">Workspace</span>
        </header>
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
