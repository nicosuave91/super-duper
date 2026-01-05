import type { FastifyInstance } from "fastify";
import { registerTenantLeadsRoutes } from "./leads";

export async function registerTenantRoutes(app: FastifyInstance) {
  await registerTenantLeadsRoutes(app);
}
