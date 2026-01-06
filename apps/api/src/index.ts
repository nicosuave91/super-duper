import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { requestId, getRequestId } from "./auth/epic2Auth";
import { AppError } from "./errors/appError";

import { registerDevAuthRoutes } from "./devAuth";
import { registerAuthRoutes } from "./routes/auth";
import { registerTenantMeRoutes } from "./routes/tenant/me";
import { registerTenantRoutes } from "./routes/tenant";

const app = Fastify({ logger: true });

const isProd = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
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

  // Security headers (API-safe defaults)
  await app.register(helmet, {
    contentSecurityPolicy: false, // API does not serve HTML
  });

  // Global rate limiting: very high in dev, sane in prod.
  await app.register(rateLimit, {
    global: true,
    max: isProd ? 1000 : 100000,
    timeWindow: "1 minute",
    ban: isProd ? 5 : 0,
    allowList: () => false,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      if (!isProd) {
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        return cb(null, isLocalhost);
      }

      return cb(null, allowedOrigins.has(normalize(origin)));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-request-id"],
    exposedHeaders: ["x-request-id"],
  });

  // Request-id on every request/response
  app.addHook("onRequest", requestId);

  // Consistent error envelope + Zod/AppError support
  app.setErrorHandler((err: any, req, reply) => {
    const request_id = getRequestId(req);

    if (err instanceof AppError) {
      return reply.code(err.status).send({
        request_id,
        error_code: err.error_code,
        message: err.message,
        details: err.details ?? null,
      });
    }

    const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
    const message = status >= 500 ? "Unexpected server error" : (err?.message ?? "Request failed");

    req.log.error({ err, request_id }, "Unhandled error");

    return reply.code(status).send({
      request_id,
      error_code: "internal.error",
      message,
      details: null,
    });
  });

  app.get("/health", async () => ({ ok: true }));

  // Routes
  await registerDevAuthRoutes(app);
  await registerAuthRoutes(app);
  await registerTenantMeRoutes(app);
  await registerTenantRoutes(app);

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
