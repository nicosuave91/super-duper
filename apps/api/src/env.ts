import { z } from "zod";
import "dotenv/config";

const CoreEnvSchema = z
  .object({
    APP_ENV: z.string().default("development"),
    NODE_ENV: z.string().optional(),

    API_PORT: z.coerce.number().optional(),
    PORT: z.coerce.number().default(3002),

    API_HOST: z.string().optional(),
    HOST: z.string().optional(),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    // Auth0/JWKS are required in production, optional in dev if you use HS256 dev tokens.
    AUTH_JWKS_URL: z.string().url("AUTH_JWKS_URL must be a valid URL").optional(),
    AUTH_ISSUER: z.string().min(1, "AUTH_ISSUER is required").optional(),
    AUTH_AUDIENCE: z.string().min(1, "AUTH_AUDIENCE is required").optional(),

    // Dev-only secret for HS256 tokens (used by /dev/token and dev-only /auth/login)
    JWT_DEV_SECRET: z.string().optional(),

    // Absolute URLs for redirects (billing portal, etc.)
    TENANT_PORTAL_BASE_URL: z.string().default("http://localhost:5174"),
    ADMIN_PORTAL_BASE_URL: z.string().optional(),
    MARKETING_SITE_BASE_URL: z.string().optional(),

    LOG_LEVEL: z.string().default("info"),
  })
  .superRefine((env, ctx) => {
    const isProd =
      (env.NODE_ENV ?? "development") === "production" || env.APP_ENV === "production";

    if (isProd) {
      if (!env.AUTH_JWKS_URL) {
        ctx.addIssue({
          code: "custom",
          path: ["AUTH_JWKS_URL"],
          message: "AUTH_JWKS_URL is required in production",
        });
      }
      if (!env.AUTH_ISSUER) {
        ctx.addIssue({
          code: "custom",
          path: ["AUTH_ISSUER"],
          message: "AUTH_ISSUER is required in production",
        });
      }
      if (!env.AUTH_AUDIENCE) {
        ctx.addIssue({
          code: "custom",
          path: ["AUTH_AUDIENCE"],
          message: "AUTH_AUDIENCE is required in production",
        });
      }
    }
  });

const StripeEnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  STRIPE_PRICE_ID: z.string().min(1, "STRIPE_PRICE_ID is required"),
});

export type CoreEnv = z.infer<typeof CoreEnvSchema>;
export type StripeEnv = z.infer<typeof StripeEnvSchema>;

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
}

export function loadCoreEnv(): CoreEnv {
  const parsed = CoreEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Environment validation failed:\n${formatZodIssues(parsed.error)}`);
  }
  return parsed.data;
}

export function loadStripeEnv(): StripeEnv {
  const parsed = StripeEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Stripe environment validation failed:\n${formatZodIssues(parsed.error)}`);
  }
  return parsed.data;
}
