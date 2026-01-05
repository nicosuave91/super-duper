import type { FastifyInstance } from 'fastify';
import { AppError } from './errors/appError';
import { getRequestId, requireJwt, requirePermission } from './auth/epic2Auth';
import { stripe } from './billing/stripe';
import {
  ensureTenantForSub,
  upsertCheckoutSession,
  upsertStripeCustomer,
  markSubscriptionFromStripe,
} from './billing/subscriptions';

export async function registerBillingRoutes(app: FastifyInstance): Promise<void> {
  // Create checkout session
  app.post('/billing/checkout', async (req) => {
    const principal = await requireJwt(req);
    requirePermission(req, 'billing:write');

    // Ensure tenant exists for this principal
    const { tenant_id } = await ensureTenantForSub(principal.sub);

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) throw new AppError(500, 'billing.failed', 'STRIPE_PRICE_ID missing');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.TENANT_PORTAL_BASE_URL ?? 'http://localhost:5174'}/billing/success`,
      cancel_url: `${process.env.TENANT_PORTAL_BASE_URL ?? 'http://localhost:5174'}/billing/cancel`,
    });

    if (session.id) await upsertCheckoutSession(tenant_id, session.id);
    if (session.customer) await upsertStripeCustomer(tenant_id, String(session.customer));

    return { url: session.url, request_id: getRequestId(req) };
  });

  // Stripe webhook (placeholder that compiles — you can add signature verification later)
  app.post('/billing/webhook', async (req) => {
    // NOTE: Real Stripe webhook verification requires raw body.
    // This stub is just to keep build green while the rest of the app is stabilized.
    void req;

    return { ok: true, request_id: (req as any).request_id ?? getRequestId(req) };
  });
}
