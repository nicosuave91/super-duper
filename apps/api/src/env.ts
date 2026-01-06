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

    AUTH_JWKS_URL: z.string().url().optional(),
    AUTH_ISSUER: z.string().optional(),
    AUTH_AUDIENCE: z.string().optional(),

    // Dev-only HS256 signing secret (dev tokens + dev login)
    JWT_DEV_SECRET: z.string().optional(),

    TENANT_PORTAL_BASE_URL: z.string().default("http://localhost:5174"),
    ADMIN_PORTAL_BASE_URL: z.string().optional(),
    MARKETING_SITE_BASE_URL: z.string().optional(),

    LOG_LEVEL: z.string().default("info"),
  })
  .superRefine((env, ctx) => {
    const isProd =
      (env.NODE_ENV ?? "development") === "production" || env.APP_ENV === "production";

    if (isProd) {
      if (!env.AUTH_JWKS_URL) ctx.addIssue({ code: "custom", path: ["AUTH_JWKS_URL"], message: "Required in production" });
      if (!env.AUTH_ISSUER) ctx.addIssue({ code: "custom", path: ["AUTH_ISSUER"], message: "Required in production" });
      if (!env.AUTH_AUDIENCE) ctx.addIssue({ code: "custom", path: ["AUTH_AUDIENCE"], message: "Required in production" });
    }
  });

const StripeEnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID: z.string().min(1),
});

export type CoreEnv = z.infer<typeof CoreEnvSchema>;
export type StripeEnv = z.infer<typeof StripeEnvSchema>;

function formatIssues(e: z.ZodError) {
  return e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
}

export function loadCoreEnv(): CoreEnv {
  const parsed = CoreEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Environment validation failed:\n${formatIssues(parsed.error)}`);
  }
  return parsed.data;
}

export function loadStripeEnv(): StripeEnv {
  const parsed = StripeEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Stripe environment validation failed:\n${formatIssues(parsed.error)}`);
  }
  return parsed.data;
}
