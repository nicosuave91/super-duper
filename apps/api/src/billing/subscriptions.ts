import { pool } from '../db';
import { AppError } from '../errors/appError';

export function isActiveStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

export async function ensureTenantForSub(sub: string, email?: string) {
  // 1) Find membership
  const membership = await pool.query(
    `select tenant_id from tenant_users where sub = $1 limit 1`,
    [sub]
  );

  if (membership.rowCount) {
    return { tenant_id: String(membership.rows[0].tenant_id) };
  }

  // 2) Create tenant + membership
  const created = await pool.query(
    `insert into tenants (tenant_name, created_at)
     values ($1, now())
     returning id`,
    [email ?? sub]
  );

  const tenant_id = String(created.rows[0].id);

  await pool.query(
    `insert into tenant_users (tenant_id, sub, tenant_role)
     values ($1, $2, 'owner')`,
    [tenant_id, sub]
  );

  // Ensure there is a subscriptions row too (so other queries don't fail)
  await pool.query(
    `insert into subscriptions (tenant_id, status)
     values ($1, 'inactive')
     on conflict (tenant_id) do nothing`,
    [tenant_id]
  );

  return { tenant_id };
}

export async function upsertStripeCustomer(tenant_id: string, stripe_customer_id: string) {
  await pool.query(
    `update subscriptions
     set stripe_customer_id = $2, updated_at = now()
     where tenant_id = $1`,
    [tenant_id, stripe_customer_id]
  );
}

export async function upsertCheckoutSession(tenant_id: string, stripe_checkout_session_id: string) {
  await pool.query(
    `update subscriptions
     set stripe_checkout_session_id = $2, updated_at = now()
     where tenant_id = $1`,
    [tenant_id, stripe_checkout_session_id]
  );
}

export async function markSubscriptionFromStripe(args: {
  customer_id: string | null;
  subscription_id: string | null;
  status: string;
  current_period_end: number | null;
}) {
  // We locate by customer_id when possible
  if (!args.customer_id) {
    throw new AppError(400, 'billing.failed', 'Stripe event missing customer_id');
  }

  await pool.query(
    `update subscriptions
     set stripe_subscription_id = coalesce($2, stripe_subscription_id),
         status = $3,
         current_period_end = $4,
         updated_at = now()
     where stripe_customer_id = $1`,
    [args.customer_id, args.subscription_id, args.status, args.current_period_end]
  );
}

export async function getSubscriptionStatusByTenant(tenant_id: string): Promise<{ status: string | null }> {
  const r = await pool.query(
    `select status from subscriptions where tenant_id = $1 limit 1`,
    [tenant_id]
  );

  if (!r.rowCount) return { status: null };
  return { status: r.rows[0].status ?? null };
}
