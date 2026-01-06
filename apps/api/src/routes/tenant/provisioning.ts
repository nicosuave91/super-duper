import type { FastifyInstance } from "fastify";
import crypto from "crypto";

import { pool } from "../../db";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";
import { getTenantMembershipBySub } from "../../membership";

export async function registerTenantProvisioningRoutes(app: FastifyInstance) {
  /**
   * Provisioning status feed for tenant
   * GET /tenant/provisioning/status
   */
  app.get(
    "/tenant/provisioning/status",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        // status read is a basic tenant read concern
        requirePermission(req, "tenant.read");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;
      const { tenant_id } = await getTenantMembershipBySub(sub);

      const eventsRes = await pool.query(
        `select id, created_at, title, message, stage, correlation_id
         from provisioning_events
         where tenant_id = $1
         order by created_at desc
         limit 200`,
        [tenant_id]
      );

      return reply.send({ ok: true, events: eventsRes.rows });
    }
  );

  /**
   * Retry provisioning
   * POST /tenant/provisioning/retry
   */
  app.post(
    "/tenant/provisioning/retry",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        // retry is effectively a tenant setting/change operation
        requirePermission(req, "tenant.settings.write");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;
      const { tenant_id } = await getTenantMembershipBySub(sub);

      await pool.query(
        `insert into provisioning_commands (id, tenant_id, command, created_at)
         values ($1, $2, $3, now())`,
        [crypto.randomUUID(), tenant_id, "retry_provisioning"]
      );

      return reply.send({ ok: true });
    }
  );
}
