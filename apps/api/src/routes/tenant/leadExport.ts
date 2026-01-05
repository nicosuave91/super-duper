import crypto from "crypto";
import type { Request, Response } from "express";

type Db = {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
};

export function registerTenantLeadExportRoutes(app: any, db: Db) {
  app.post("/tenant/leads/export", async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) return res.status(401).json({ request_id: (req as any).request_id, error_code: "auth.unauthorized", message: "Unauthorized", details: null });

    const jobId = crypto.randomUUID();
    const payload = { query: req.body?.query ?? {} };

    await db.query(
      `insert into jobs (id, tenant_id, type, state, payload) values ($1, $2, 'lead_export', 'queued', $3::jsonb)`,
      [jobId, tenantId, JSON.stringify(payload)]
    );

    res.json({ ok: true, job_id: jobId });
  });

  app.get("/tenant/leads/export/:jobId", async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) return res.status(401).json({ request_id: (req as any).request_id, error_code: "auth.unauthorized", message: "Unauthorized", details: null });

    const jobId = req.params.jobId;

    const jobRes = await db.query(
      `select id, state, result from jobs where id = $1 and tenant_id = $2 and type = 'lead_export'`,
      [jobId, tenantId]
    );
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ request_id: (req as any).request_id, error_code: "job.not_found", message: "Job not found", details: null });

    const url = job.result?.url ?? null;

    res.json({ ok: true, state: job.state, url });
  });
}
