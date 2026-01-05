export type SubscriptionStatus = 'trialing'|'active'|'past_due'|'unpaid'|'canceled'|'incomplete';
export type ProvisioningState = 'pending'|'in_progress'|'failed'|'complete';

export function resolveGates(sub: SubscriptionStatus, prov: ProvisioningState) {
  const billingActionRequired = sub === 'past_due' || sub === 'unpaid' || sub === 'incomplete';
  const canManageWebsite = sub === 'active' && prov === 'complete';
  const showProvisioningTimeline = sub === 'active' && prov !== 'complete';
  return { billingActionRequired, canManageWebsite, showProvisioningTimeline };
}
