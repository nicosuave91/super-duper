import type { FastifyInstance } from "fastify";
import { pool } from "../../db";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";

export async function registerTenantLeadsRoutes(app: FastifyInstance) {
  // List leads for a site (must be a member of that site)
  app.get(
    "/tenant/leads",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.leads.read");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;

      const siteId = String((req.query as any)?.site_id ?? "").trim();
      if (!siteId) return reply.code(400).send({ message: "site_id is required" });

      const userRes = await pool.query(`select id from users where auth0_sub = $1 limit 1`, [sub]);
      const user = userRes.rows[0];
      if (!user) return reply.code(404).send({ message: "User not found" });

      const memberRes = await pool.query(
        `select 1
         from site_members
         where site_id = $1 and user_id = $2
         limit 1`,
        [siteId, user.id]
      );
      if (!memberRes.rows[0]) return reply.code(403).send({ message: "Forbidden" });

      const leadsRes = await pool.query(
        `select *
         from leads
         where site_id = $1
         order by created_at desc
         limit 200`,
        [siteId]
      );

      return { leads: leadsRes.rows };
    }
  );

  // Get single lead (also membership protected)
  app.get(
    "/tenant/leads/:id",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.leads.read");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;
      const id = (req.params as any).id;

      const userRes = await pool.query(`select id from users where auth0_sub = $1 limit 1`, [sub]);
      const user = userRes.rows[0];
      if (!user) return reply.code(404).send({ message: "User not found" });

      const leadRes = await pool.query(`select * from leads where id = $1 limit 1`, [id]);
      const lead = leadRes.rows[0];
      if (!lead) return reply.code(404).send({ message: "Lead not found" });

      const memberRes = await pool.query(
        `select 1
         from site_members
         where site_id = $1 and user_id = $2
         limit 1`,
        [lead.site_id, user.id]
      );
      if (!memberRes.rows[0]) return reply.code(403).send({ message: "Forbidden" });

      return { lead };
    }
  );
}
