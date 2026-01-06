import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { z } from "zod";

import { pool } from "../../db";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";
import { getTenantMembershipBySub } from "../../membership";
import { parseOrThrow } from "../../validation";

const CreateExportBody = z.object({
  query: z.record(z.unknown()).optional(),
});

const JobParams = z.object({
  jobId: z.string().min(1),
});

export async function registerTenantLeadExportRoutes(app: FastifyInstance) {
  app.post(
    "/tenant/leads/export",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.leads.read");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;
      const membership = await getTenantMembershipBySub(sub);

      const body = parseOrThrow(CreateExportBody, req.body, { where: "body", route: "/tenant/leads/export" });

      const jobId = crypto.randomUUID();
      const payload = { query: body.query ?? {} };

      await pool.query(
        `insert into jobs (id, tenant_id, type, state, payload)
         values ($1, $2, 'lead_export', 'queued', $3::jsonb)`,
        [jobId, membership.tenant_id, JSON.stringify(payload)]
      );

      return reply.send({ ok: true, job_id: jobId });
    }
  );

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
      const membership = await getTenantMembershipBySub(sub);

      const params = parseOrThrow(JobParams, req.params, { where: "params", route: "/tenant/leads/export/:jobId" });

      const jobRes = await pool.query(
        `select id, state, result
         from jobs
         where id = $1 and tenant_id = $2 and type = 'lead_export'
         limit 1`,
        [params.jobId, membership.tenant_id]
      );

      const job = jobRes.rows[0];
      if (!job) return reply.code(404).send({ message: "Job not found" });

      const url = job.result?.url ?? null;
      return reply.send({ ok: true, state: job.state, url });
    }
  );
}
