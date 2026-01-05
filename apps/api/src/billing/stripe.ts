import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Do not set apiVersion here; your installed Stripe SDK pins this type to a newer value.
});
