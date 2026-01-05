import type { FastifyInstance } from 'fastify';
import { requireJwt, requirePermission, getRequestId } from './auth/epic2Auth';
import { getTenantMembershipBySub } from './membership';
import { getSubscriptionStatusByTenant, isActiveStatus } from './billing/subscriptions';
import { stripe } from './billing/stripe';
import { query } from './db';
import { AppError } from './errors/appError';
import { loadEnv } from './env';

export async function registerTenantRoutes(app: FastifyInstance) {
  // Source of truth for tenant portal access (permission + active subscription)
  app.get('/tenant/me', async (req) => {
    const principal = await requireJwt(req);
    requirePermission(req, 'tenant.read');

    const membership = await getTenantMembershipBySub(principal.sub);
    const tenant_id = membership.tenant_id;

    const { status } = await getSubscriptionStatusByTenant(tenant_id);
    if (!isActiveStatus(status)) {
      throw new AppError(
        402,
        'billing.subscription_required',
        'An active subscription is required to access the tenant portal.',
        { status }
      );
    }

    // DEV STUB: replace with DB query later
    return {
      sites: [
        {
          site_id: 'dev-site-1',
          role: membership.tenant_role ?? 'owner',
          slug: 'dev-site',
          site_name: 'Dev Site',
          status: 'active',
        },
      ],
      request_id: getRequestId(req),
    };
  });

  // Used by Billing page to display current subscription state
  app.get('/tenant/subscription', async (req) => {
    const principal = await requireJwt(req);
    requirePermission(req, 'tenant.read');

    const membership = await getTenantMembershipBySub(principal.sub);
    const tenant_id = membership.tenant_id;

    const rows = await query<{
      status: string | null;
      current_period_end: string | null;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      stripe_checkout_session_id: string | null;
    }>(
      `SELECT status,
              current_period_end,
              stripe_customer_id,
              stripe_subscription_id,
              stripe_checkout_session_id
       FROM subscriptions
       WHERE tenant_id = $1
       LIMIT 1`,
      [tenant_id]
    );

    const row = rows[0];
    return {
      status: row?.status ?? null,
      current_period_end: row?.current_period_end ?? null,
      stripe_customer_id: row?.stripe_customer_id ?? null,
      stripe_subscription_id: row?.stripe_subscription_id ?? null,
      stripe_checkout_session_id: row?.stripe_checkout_session_id ?? null,
    };
  });

  // Stripe customer portal (manage subscription)
  app.post('/tenant/billing/portal-session', async (req, reply) => {
    const principal = await requireJwt(req);
    requirePermission(req, 'tenant.read');

    const membership = await getTenantMembershipBySub(principal.sub);
    const tenant_id = membership.tenant_id;

    const rows = await query<{ stripe_customer_id: string | null }>(
      `SELECT stripe_customer_id
       FROM subscriptions
       WHERE tenant_id = $1
       LIMIT 1`,
      [tenant_id]
    );

    const customer_id = rows[0]?.stripe_customer_id ?? null;
    if (!customer_id) {
      throw new AppError(400, 'billing.no_customer', 'No Stripe customer found for this tenant.');
    }

    const env = loadEnv();
    const session = await stripe.billingPortal.sessions.create({
      customer: String(customer_id),
      return_url: `${env.TENANT_PORTAL_BASE_URL}/billing`,
    });

    return reply.send({ url: session.url });
  });
}
