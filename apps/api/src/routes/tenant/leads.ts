import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../../db";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";
import { parseOrThrow } from "../../validation";

const ListQuery = z.object({
  site_id: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(200).default(50),
});

const LeadIdParams = z.object({
  id: z.string().uuid(),
});

const PatchBody = z.object({
  status: z.string().min(1),
  note: z.string().max(500).optional(),
});

async function requireUser(sub: string) {
  const userRes = await pool.query(`select id from users where auth0_sub = $1 limit 1`, [sub]);
  const user = userRes.rows[0];
  return user?.id ? { user_id: user.id as string } : null;
}

async function requireSiteMembership(userId: string, siteId: string) {
  const memRes = await pool.query(
    `select 1 from site_memberships where user_id = $1 and site_id = $2 limit 1`,
    [userId, siteId]
  );
  return memRes.rowCount > 0;
}

export async function registerTenantLeadsRoutes(app: FastifyInstance) {
  // List
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
      const q = parseOrThrow(ListQuery, req.query, { where: "query", route: "/tenant/leads" });

      const user = await requireUser(sub);
      if (!user) return reply.code(404).send({ message: "User not found" });

      const ok = await requireSiteMembership(user.user_id, q.site_id);
      if (!ok) return reply.code(403).send({ message: "Forbidden" });

      const limit = q.page_size;
      const offset = (q.page - 1) * limit;

      const leadsRes = await pool.query(
        `select *
         from leads
         where site_id = $1
         order by created_at desc
         limit $2 offset $3`,
        [q.site_id, limit, offset]
      );

      const totalRes = await pool.query(
        `select count(*)::int as total
         from leads
         where site_id = $1`,
        [q.site_id]
      );

      return {
        items: leadsRes.rows,
        page: q.page,
        page_size: limit,
        total: totalRes.rows?.[0]?.total ?? 0,
      };
    }
  );

  // Detail (returns {lead, history} for UI)
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
      const params = parseOrThrow(LeadIdParams, req.params, { where: "params", route: "/tenant/leads/:id" });

      const siteId = String((req.query as any)?.site_id ?? "").trim();

      const user = await requireUser(sub);
      if (!user) return reply.code(404).send({ message: "User not found" });

      // membership via join (supports if site_id omitted)
      const leadRes = await pool.query(
        `select l.*
         from leads l
         join site_memberships sm on sm.site_id = l.site_id
         where l.id = $1::uuid and sm.user_id = $2
         limit 1`,
        [params.id, user.user_id]
      );

      const lead = leadRes.rows[0];
      if (!lead) return reply.code(404).send({ message: "Lead not found" });

      // optional extra membership enforcement if site_id provided
      if (siteId && String(lead.site_id) !== siteId) {
        return reply.code(404).send({ message: "Lead not found" });
      }

      let history: any[] = [];
      try {
        const historyRes = await pool.query(
          `select *
           from lead_history
           where lead_id = $1::uuid
           order by created_at desc
           limit 200`,
          [params.id]
        );
        history = historyRes.rows;
      } catch {
        history = [];
      }

      return { lead, history };
    }
  );

  // PATCH (status + optional note) for UI
  app.patch(
    "/tenant/leads/:id",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.leads.write");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;
      const params = parseOrThrow(LeadIdParams, req.params, { where: "params", route: "/tenant/leads/:id" });
      const body = parseOrThrow(PatchBody, req.body, { where: "body", route: "/tenant/leads/:id" });

      const siteId = String((req.query as any)?.site_id ?? "").trim();
      if (!siteId) return reply.code(400).send({ message: "site_id is required" });

      const user = await requireUser(sub);
      if (!user) return reply.code(404).send({ message: "User not found" });

      const ok = await requireSiteMembership(user.user_id, siteId);
      if (!ok) return reply.code(403).send({ message: "Forbidden" });

      const existingRes = await pool.query(
        `select id, site_id, status
         from leads
         where id = $1::uuid and site_id = $2::uuid
         limit 1`,
        [params.id, siteId]
      );
      const existing = existingRes.rows[0];
      if (!existing) return reply.code(404).send({ message: "Lead not found" });

      await pool.query(
        `update leads
         set status = $1, updated_at = now()
         where id = $2::uuid and site_id = $3::uuid`,
        [body.status, params.id, siteId]
      );

      // best-effort history insert
      try {
        await pool.query(
          `insert into lead_history (lead_id, site_id, from_status, to_status, actor_sub, note, created_at)
           values ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, now())`,
          [params.id, siteId, existing.status, body.status, sub, body.note ?? null]
        );
      } catch {}

      return { ok: true };
    }
  );
}
