import { query } from './db';

import { AppError } from './errors/appError';

export type TenantMembership = {
  tenant_id: string;
  tenant_role: string;
};

export async function getTenantMembershipBySub(sub: string): Promise<TenantMembership> {
  const rows = await query<{ tenant_id: string; tenant_role: string | null }>(
    `select tenant_id, tenant_role
     from tenant_users
     where sub = $1
     limit 1`,
    [sub]
  );

  if (rows.length === 0) {
    throw new AppError(404, 'auth.tenant_membership_not_found', 'Tenant membership not found', { sub });
  }

  return {
    tenant_id: String(rows[0].tenant_id),
    tenant_role: String(rows[0].tenant_role ?? '')
  };
}
