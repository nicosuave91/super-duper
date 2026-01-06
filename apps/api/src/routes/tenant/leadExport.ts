import type { FastifyInstance } from "fastify";
import crypto from "crypto";

import { pool } from "../../db";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";
import { getTenantMembershipBySub } from "../../membership";

type CreateExportBody = {
  // optional future expansion
  site_id?: string;
  query?: Record<string, unknown>;
};

export async function registerTenantLeadExportRoutes(app: FastifyInstance) {
  /**
   * Create export job
   * POST /tenant/leads/export
   * Body: { site_id?: uuid, query?: {...} }
   */
  app.post<{ Body: CreateExportBody }>(
    "/tenant/leads/export",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        // keep simple: exporting is a leads read concern
        requirePermission(req, "tenant.leads.read");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;
      const { tenant_id } = await getTenantMembershipBySub(sub);

      const jobId = crypto.randomUUID();
      const payload = {
        site_id: req.body?.site_id ?? null,
        query: req.body?.query ?? {},
      };

      await pool.query(
        `insert into jobs (id, tenant_id, type, state, payload)
         values ($1, $2, 'lead_export', 'queued', $3::jsonb)`,
        [jobId, tenant_id, JSON.stringify(payload)]
      );

      return reply.send({ ok: true, job_id: jobId });
    }
  );

  /**
   * Poll export job status
   * GET /tenant/leads/export/:jobId
   */
  app.get(
    "/tenant/leads/export/:jobId",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.leads.read");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;
      const { tenant_id } = await getTenantMembershipBySub(sub);

      const jobId = String((req.params as any)?.jobId ?? "").trim();
      if (!jobId) return reply.code(400).send({ message: "jobId is required" });

      const jobRes = await pool.query(
        `select id, state, result
         from jobs
         where id = $1 and tenant_id = $2 and type = 'lead_export'
         limit 1`,
        [jobId, tenant_id]
      );

      const job = jobRes.rows[0];
      if (!job) return reply.code(404).send({ message: "Job not found" });

      const url = job.result?.url ?? null;
      return reply.send({ ok: true, state: job.state, url });
    }
  );
}
