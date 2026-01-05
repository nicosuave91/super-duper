import type { Request, Response } from "express";

type Db = {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
};

export function registerTenantProvisioningRoutes(app: any, db: Db) {
  app.get("/tenant/provisioning/status", async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) return res.status(401).json({ request_id: (req as any).request_id, error_code: "auth.unauthorized", message: "Unauthorized", details: null });

    const events = await db.query(
      `select id, created_at, title, message, stage, correlation_id
       from provisioning_events
       where tenant_id = $1
       order by created_at desc
       limit 50`,
      [tenantId]
    );

    const summary = await db.query(
      `select site_stage, domain_stage, dns_stage, updated_at
       from tenant_provisioning_status
       where tenant_id = $1`,
      [tenantId]
    );

    const row = summary.rows[0] ?? {
      site_stage: "queued",
      domain_stage: "queued",
      dns_stage: "queued",
      updated_at: new Date().toISOString(),
    };

    res.json({
      tenant_id: tenantId,
      site_stage: row.site_stage,
      domain_stage: row.domain_stage,
      dns_stage: row.dns_stage,
      events: events.rows,
      last_updated_at: row.updated_at,
    });
  });

  app.post("/tenant/provisioning/retry", async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) return res.status(401).json({ request_id: (req as any).request_id, error_code: "auth.unauthorized", message: "Unauthorized", details: null });

    await db.query(
      `insert into provisioning_commands (id, tenant_id, command, created_at)
       values ($1, $2, $3, now())`,
      [(globalThis.crypto as any)?.randomUUID?.() ?? require("crypto").randomUUID(), tenantId, "retry_provisioning"]
    );

    res.json({ ok: true });
  });
}
