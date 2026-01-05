import type { FastifyInstance } from "fastify";
import { pool } from "../../db";
import { requireAuth } from "../../auth/requireAuth";

export async function registerTenantLeadsRoutes(app: FastifyInstance) {
  // List leads for a site (must be a member of that site)
  app.get("/tenant/leads", { preHandler: requireAuth }, async (req, reply) => {
    const sub = req.auth!.sub;

    const siteId = String((req.query as any)?.site_id ?? "").trim();
    if (!siteId) return reply.code(400).send({ message: "site_id is required" });

    const page = Number((req.query as any)?.page ?? 1);
    const pageSize = Number((req.query as any)?.page_size ?? (req.query as any)?.pageSize ?? 50);

    const limit = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 1), 200) : 50;
    const p = Number.isFinite(page) ? Math.max(page, 1) : 1;
    const offset = (p - 1) * limit;

    // Find user
    const userRes = await pool.query(`select id from users where auth0_sub = $1 limit 1`, [sub]);
    const user = userRes.rows[0];
    if (!user) return reply.code(404).send({ message: "User not found" });

    // Validate membership
    const memRes = await pool.query(
      `select 1 from site_memberships where user_id = $1 and site_id = $2 limit 1`,
      [user.id, siteId]
    );
    if (memRes.rowCount === 0) return reply.code(403).send({ message: "Forbidden" });

    // Query leads
    const leadsRes = await pool.query(
      `select *
       from leads
       where site_id = $1
       order by created_at desc
       limit $2 offset $3`,
      [siteId, limit, offset]
    );

    const totalRes = await pool.query(
      `select count(*)::int as total
       from leads
       where site_id = $1`,
      [siteId]
    );

    return {
      items: leadsRes.rows,
      page: p,
      page_size: limit,
      total: totalRes.rows?.[0]?.total ?? 0,
    };
  });

  // Get single lead (also membership protected)
  app.get("/tenant/leads/:id", { preHandler: requireAuth }, async (req, reply) => {
    const sub = req.auth!.sub;
    const id = (req.params as any).id;

    const userRes = await pool.query(`select id from users where auth0_sub = $1 limit 1`, [sub]);
    const user = userRes.rows[0];
    if (!user) return reply.code(404).send({ message: "User not found" });

    const leadRes = await pool.query(
      `select l.*
       from leads l
       join site_memberships sm on sm.site_id = l.site_id
       where l.id = $1 and sm.user_id = $2
       limit 1`,
      [id, user.id]
    );

    const lead = leadRes.rows[0];
    if (!lead) return reply.code(404).send({ message: "Lead not found" });

    return { lead };
  });
}
