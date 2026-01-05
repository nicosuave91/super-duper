import type { FastifyInstance } from "fastify";
import { registerTenantLeadsRoutes } from "./leads";
import { registerTenantLeadExportRoutes } from "./leadsExport";
import { registerTenantSettingsRoutes } from "./settings";
import { registerTenantProvisioningRoutes } from "./provisioning";
import { registerTenantLeadsV2Routes } from "./leads.v2";


export function registerTenantRoutes(app: FastifyInstance) {
  registerTenantLeadsRoutes(app);
  registerTenantLeadExportRoutes(app);
  registerTenantSettingsRoutes(app);
  registerTenantProvisioningRoutes(app);
  registerTenantLeadsV2Routes(app);
}
