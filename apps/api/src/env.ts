import { z } from 'zod';
import 'dotenv/config'

console.log('TENANT_PORTAL_BASE_URL:', process.env.TENANT_PORTAL_BASE_URL)

const EnvSchema = z.object({
  APP_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  AUTH_JWKS_URL: z.string().url('AUTH_JWKS_URL must be a valid URL'),
  AUTH_ISSUER: z.string().min(1, 'AUTH_ISSUER is required'),
  AUTH_AUDIENCE: z.string().min(1, 'AUTH_AUDIENCE is required'),

  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_PRICE_ID: z.string().min(1, 'STRIPE_PRICE_ID is required'),
  TENANT_PORTAL_BASE_URL: z.string().default('http://localhost:5174'),

  LOG_LEVEL: z.string().default('info')
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${issues}`);
  }
  return parsed.data;
}
