import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultConfig, mergeFeatureConfig } from '@/lib/features';
import type { TenantFeatureConfig } from '@/lib/features';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    // Use tenantId from JWT headers first; fall back to DB lookup
    const tenantId = user.tenantId ?? (await admin
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => data?.tenant_id ?? null));

    if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const { data: tenant } = await admin
      .from('tenants')
      .select('plan, settings')
      .eq('id', tenantId)
      .single();

    const base = getDefaultConfig(tenant?.plan ?? 'starter');
    const overrides = ((tenant?.settings as Record<string, unknown>)?.featureConfig ?? {}) as Partial<TenantFeatureConfig>;
    const config = mergeFeatureConfig(base, overrides);

    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    const tenantId = user.tenantId ?? (await admin
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => data?.tenant_id ?? null));

    if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    // Verify role via admin client
    const { data: profile } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const adminRoles = ['platform_admin', 'tenant_admin'];
    if (!adminRoles.includes(profile?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json() as Partial<TenantFeatureConfig>;

    const { data: tenant } = await admin
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    const currentSettings = ((tenant?.settings as Record<string, unknown>) ?? {});
    const currentOverrides = (currentSettings.featureConfig ?? {}) as Partial<TenantFeatureConfig>;

    const merged = mergeFeatureConfig(
      currentOverrides as TenantFeatureConfig,
      body
    );

    await admin
      .from('tenants')
      .update({ settings: { ...currentSettings, featureConfig: merged } })
      .eq('id', tenantId);

    return NextResponse.json({ ok: true, config: merged });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
