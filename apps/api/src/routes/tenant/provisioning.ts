import type { FastifyInstance } from "fastify";
import crypto from "crypto";

import { pool } from "../../db";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";
import { getTenantMembershipBySub } from "../../membership";

export async function registerTenantProvisioningRoutes(app: FastifyInstance) {
  app.get(
    "/tenant/provisioning/status",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.read");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;
      const membership = await getTenantMembershipBySub(sub);

      const tenantId = membership.tenant_id;

      const events = await pool.query(
        `select id, created_at, title, message, stage, correlation_id
         from provisioning_events
         where tenant_id = $1
         order by created_at desc
         limit 50`,
        [tenantId]
      );

      const summary = await pool.query(
        `select site_stage, domain_stage, dns_stage, updated_at
         from tenant_provisioning_status
         where tenant_id = $1
         limit 1`,
        [tenantId]
      );

      const row = summary.rows[0] ?? {
        site_stage: "queued",
        domain_stage: "queued",
        dns_stage: "queued",
        updated_at: new Date().toISOString(),
      };

      return reply.send({
        tenant_id: tenantId,
        site_stage: row.site_stage,
        domain_stage: row.domain_stage,
        dns_stage: row.dns_stage,
        events: events.rows,
        last_updated_at: row.updated_at,
      });
    }
  );

  app.post(
    "/tenant/provisioning/retry",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.settings.write");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;
      const membership = await getTenantMembershipBySub(sub);

      await pool.query(
        `insert into provisioning_commands (id, tenant_id, command, created_at)
         values ($1, $2, $3, now())`,
        [crypto.randomUUID(), membership.tenant_id, "retry_provisioning"]
      );

      return reply.send({ ok: true });
    }
  );
}
