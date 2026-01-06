import type { FastifyInstance } from "fastify";

import { pool } from "../../db";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";

/**
 * Leads V2 endpoints (clean baseline)
 * - Requires membership in the site (site_members table)
 * - Uses req.principal.sub (Auth0 subject)
 */

async function requireUserAndSiteMembership(auth0Sub: string, siteId: string) {
  const userRes = await pool.query(
    `select id from users where auth0_sub = $1 limit 1`,
    [auth0Sub]
  );
  const user = userRes.rows[0];
  if (!user) return { error: { code: 404, message: "User not found" } } as const;

  const memRes = await pool.query(
    `select 1
     from site_members
     where site_id = $1 and user_id = $2
     limit 1`,
    [siteId, user.id]
  );
  if (!memRes.rows[0]) return { error: { code: 403, message: "Forbidden" } } as const;

  return { user_id: user.id } as const;
}

function buildDefaultSavedViews() {
  return [
    { id: "new_24h", name: "New (last 24h)", filters: { status: "new", created_since_hours: 24 } },
    { id: "hot_priority", name: "Hot", filters: { priority_min: 80 } },
    { id: "needs_follow_up", name: "Needs follow-up", filters: { next_action_due: "now" } },
    { id: "uncontacted", name: "Uncontacted", filters: { has_activity: "false" } },
    { id: "archived", name: "Archived", filters: { archived: "true" } },
  ];
}

export async function registerTenantLeadsV2Routes(app: FastifyInstance) {
  // Saved views (defaults)
  app.get(
    "/tenant/leads/v2/saved-views",
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

      const membership = await requireUserAndSiteMembership(sub, siteId);
      if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

      return reply.send({ items: buildDefaultSavedViews() });
    }
  );

  // List (basic filters)
  app.get(
    "/tenant/leads/v2",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.leads.read");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;

      const q = (req.query as any) ?? {};
      const siteId = String(q.site_id ?? "").trim();
      if (!siteId) return reply.code(400).send({ message: "site_id is required" });

      const membership = await requireUserAndSiteMembership(sub, siteId);
      if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

      const limit = Math.max(1, Math.min(200, Number(q.limit ?? 50)));
      const offset = Math.max(0, Number(q.offset ?? 0));

      const filters: string[] = ["l.site_id = $1"];
      const params: any[] = [siteId];
      let p = 2;

      // Optional filters (safe + simple)
      if (q.status) {
        filters.push(`l.status = $${p++}`);
        params.push(String(q.status));
      }
      if (q.archived === "true") {
        filters.push(`coalesce(l.archived,false) = true`);
      } else if (q.archived === "false") {
        filters.push(`coalesce(l.archived,false) = false`);
      }
      if (q.q) {
        // best-effort text search across common fields
        filters.push(`(
          coalesce(l.first_name,'') || ' ' || coalesce(l.last_name,'') || ' ' || coalesce(l.email,'') || ' ' || coalesce(l.phone,'')
        ) ilike $${p++}`);
        params.push(`%${String(q.q)}%`);
      }

      const whereSql = filters.length ? `where ${filters.join(" and ")}` : "";

      const countRes = await pool.query(
        `select count(*)::int as total
         from leads l
         ${whereSql}`,
        params
      );
      const total = countRes.rows[0]?.total ?? 0;

      const listRes = await pool.query(
        `select *
         from leads l
         ${whereSql}
         order by l.created_at desc
         limit $${p++} offset $${p++}`,
        [...params, limit, offset]
      );

      return reply.send({
        ok: true,
        total,
        limit,
        offset,
        items: listRes.rows,
      });
    }
  );

  // Detail
  app.get(
    "/tenant/leads/v2/:id",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.leads.read");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;

      const id = String((req.params as any)?.id ?? "").trim();
      const siteId = String((req.query as any)?.site_id ?? "").trim();

      if (!id) return reply.code(400).send({ message: "id is required" });
      if (!siteId) return reply.code(400).send({ message: "site_id is required" });

      const membership = await requireUserAndSiteMembership(sub, siteId);
      if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

      const leadRes = await pool.query(
        `select *
         from leads
         where id = $1::uuid and site_id = $2::uuid
         limit 1`,
        [id, siteId]
      );
      const lead = leadRes.rows[0];
      if (!lead) return reply.code(404).send({ message: "Lead not found" });

      // Notes/events are optional; if tables don’t exist yet, return just lead.
      let notes: any[] = [];
      let events: any[] = [];
      try {
        const notesRes = await pool.query(
          `select *
           from lead_notes
           where lead_id = $1::uuid
           order by pinned desc, created_at desc
           limit 50`,
          [id]
        );
        notes = notesRes.rows;
      } catch {}

      try {
        const eventsRes = await pool.query(
          `select *
           from lead_events
           where lead_id = $1::uuid
           order by occurred_at desc
           limit 100`,
          [id]
        );
        events = eventsRes.rows;
      } catch {}

      return reply.send({ ok: true, lead, notes, events });
    }
  );

  // Update status
  app.patch(
    "/tenant/leads/v2/:id/status",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.leads.write");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;

      const id = String((req.params as any)?.id ?? "").trim();
      const siteId = String((req.body as any)?.site_id ?? (req.query as any)?.site_id ?? "").trim();
      const status = String((req.body as any)?.status ?? "").trim();

      if (!id) return reply.code(400).send({ message: "id is required" });
      if (!siteId) return reply.code(400).send({ message: "site_id is required" });
      if (!status) return reply.code(400).send({ message: "status is required" });

      const membership = await requireUserAndSiteMembership(sub, siteId);
      if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

      await pool.query(
        `update leads
         set status = $1, updated_at = now()
         where id = $2::uuid and site_id = $3::uuid`,
        [status, id, siteId]
      );

      return reply.send({ ok: true });
    }
  );

  // Add note
  app.post(
    "/tenant/leads/v2/:id/notes",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.leads.write");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;

      const id = String((req.params as any)?.id ?? "").trim();
      const siteId = String((req.body as any)?.site_id ?? "").trim();
      const body = String((req.body as any)?.body ?? "").trim();

      if (!id) return reply.code(400).send({ message: "id is required" });
      if (!siteId) return reply.code(400).send({ message: "site_id is required" });
      if (!body) return reply.code(400).send({ message: "body is required" });

      const membership = await requireUserAndSiteMembership(sub, siteId);
      if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

      // best-effort insert
      const noteIdRes = await pool.query(
        `insert into lead_notes (id, lead_id, body, created_at)
         values (gen_random_uuid(), $1::uuid, $2, now())
         returning id`,
        [id, body]
      );

      return reply.send({ ok: true, id: noteIdRes.rows[0]?.id ?? null });
    }
  );
}
