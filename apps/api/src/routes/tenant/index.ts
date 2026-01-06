import type { FastifyInstance } from "fastify";

import { registerTenantLeadsRoutes } from "./leads";
import { registerTenantLeadExportRoutes } from "./leadExport";
import { registerTenantSettingsRoutes } from "./settings";
import { registerTenantProvisioningRoutes } from "./provisioning";
import { registerTenantLeadsV2Routes } from "./leads.v2";

export async function registerTenantRoutes(app: FastifyInstance) {
  await registerTenantLeadsRoutes(app);
  await registerTenantLeadExportRoutes(app);
  await registerTenantSettingsRoutes(app);
  await registerTenantProvisioningRoutes(app);
  await registerTenantLeadsV2Routes(app);
}
