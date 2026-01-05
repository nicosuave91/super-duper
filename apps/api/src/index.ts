import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";

import { registerDevAuthRoutes } from "./devAuth";
import { registerAuthRoutes } from "./routes/auth";
import { registerTenantMeRoutes } from "./routes/tenant/me";
import { registerTenantLeadsRoutes } from "./routes/tenant/leads";
import { registerTenantSettingsRoutes } from "./routes/tenant/settings";

import { requestId } from "./auth/epic2Auth";
import { appErrorHandler } from "./middleware/appErrorHandler";

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, {
    origin: true,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
    exposedHeaders: ["x-request-id"],
  });

  // Request ID for every request/response + consistent error shape
  app.addHook("onRequest", requestId);
  app.setErrorHandler(appErrorHandler);

  app.get("/health", async () => ({ ok: true }));

  // Routes
  await registerDevAuthRoutes(app); // /dev/token (HS256 dev JWT; non-prod only)
  await registerAuthRoutes(app); // /auth/login (dev-only)
  await registerTenantMeRoutes(app); // /tenant/me
  await registerTenantLeadsRoutes(app); // /tenant/leads
  await registerTenantSettingsRoutes(app); // /tenant/settings

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3002);
  const host = String(process.env.API_HOST ?? process.env.HOST ?? "0.0.0.0");

  await app.listen({ port, host });
  app.log.info(`API listening on http://${host}:${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
