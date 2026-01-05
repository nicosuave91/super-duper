export type ErrorCode =
  // auth
  | 'auth.unauthorized'
  | 'auth.missing_token'
  | 'auth.invalid_token'
  | 'auth.missing_permission'
  | 'auth.tenant_membership_not_found'
  | 'auth.forbidden'

  // validation
  | 'validation.invalid'

  // billing
  | 'billing.invalid_request'
  | 'billing.missing_signature'
  | 'billing.missing_raw_body'
  | 'billing.invalid_signature'
  | 'billing.no_customer'
  | 'billing.subscription_required'
  | 'billing.failed'

  // provider / provisioning
  | 'provider.unavailable'
  | 'provisioning.failed'

  // internal
  | 'internal.error';
