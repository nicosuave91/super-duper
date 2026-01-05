import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";

import { registerDevAuthRoutes } from "./devAuth";
import { registerAuthRoutes } from "./routes/auth";
import { registerTenantMeRoutes } from "./routes/tenant/me";
import { registerTenantLeadsRoutes } from "./routes/tenant/leads";

const app = Fastify({ logger: true });

const isDev = (process.env.NODE_ENV ?? "development") !== "production";
const normalize = (u: string) => u.replace(/\/$/, "");

function buildAllowedOrigins() {
  const raw = [
    process.env.TENANT_PORTAL_BASE_URL,
    process.env.ADMIN_PORTAL_BASE_URL,
    process.env.MARKETING_SITE_BASE_URL,
  ].filter(Boolean) as string[];

  return new Set(raw.map(normalize));
}

async function main() {
  const allowedOrigins = buildAllowedOrigins();

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      if (isDev) {
        const isLocalhost =
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        return cb(null, isLocalhost);
      }

      return cb(null, allowedOrigins.has(normalize(origin)));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-request-id"],
  });

  app.get("/health", async () => ({ ok: true }));

  // ✅ Routes
  await registerDevAuthRoutes(app);     // /dev/token (HS256 dev JWT; non-prod only)
  await registerAuthRoutes(app);        // /auth/login (email/password)
  await registerTenantMeRoutes(app);    // /tenant/me
  await registerTenantLeadsRoutes(app); // /tenant/leads

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3002);
  const host = process.env.API_HOST ?? process.env.HOST ?? "0.0.0.0";

  const shutdown = async (signal: string) => {
    try {
      app.log.info({ signal }, "Shutting down...");
      await app.close();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port, host });
  app.log.info(`API listening on http://${host}:${port}`);
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
