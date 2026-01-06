import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../../db";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";
import { parseOrThrow } from "../../validation";

function splitCsv(v: string | undefined) {
  if (!v) return null;
  const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : null;
}

function encodeCursor(obj: any) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}
function decodeCursor(cursor: string) {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

async function requireUserAndMembership(sub: string, siteId: string) {
  const userRes = await pool.query(`select id from users where auth0_sub = $1 limit 1`, [sub]);
  const user = userRes.rows[0];
  if (!user) return { error: { code: 404, message: "User not found" } } as const;

  const memRes = await pool.query(
    `select 1 from site_memberships where user_id = $1 and site_id = $2 limit 1`,
    [user.id, siteId]
  );
  if (memRes.rowCount === 0) return { error: { code: 403, message: "Forbidden" } } as const;

  return { user_id: user.id as string } as const;
}

const SavedViewsQuery = z.object({
  site_id: z.string().uuid(),
});

const ListQuery = z.object({
  site_id: z.string().uuid(),

  q: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  state: z.string().optional(),
  source_page: z.string().optional(),

  priority_min: z.coerce.number().optional(),
  priority_max: z.coerce.number().optional(),
  created_since_hours: z.coerce.number().optional(),
  next_action_due: z.enum(["now"]).optional(),
  est_premium_min: z.coerce.number().optional(),

  archived: z.enum(["false", "true", "any"]).optional(),
  sort: z.enum(["created_at_desc", "priority_desc", "last_activity_desc", "next_action_asc", "est_premium_desc"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().optional(),
});

const LeadParams = z.object({ id: z.string().uuid() });

const UpdateStatusBody = z.object({
  status: z.string().min(1),
  sub_status: z.string().optional(),
  reason_code: z.string().optional(),
  version: z.number().int(),
});

const AddNoteBody = z.object({
  note_text: z.string().min(1).max(2000),
  pinned: z.boolean().optional(),
});

export async function registerTenantLeadsV2Routes(app: FastifyInstance) {
  // Saved views
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
      const q = parseOrThrow(SavedViewsQuery, req.query, { where: "query", route: "/tenant/leads/v2/saved-views" });

      const membership = await requireUserAndMembership(sub, q.site_id);
      if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

      return reply.send({
        items: [
          {
            id: "new_last_24h",
            name: "New (last 24h)",
            sort: { key: "created_at_desc" },
            filters: { status: "new", created_since_hours: 24, archived: "false" },
          },
          {
            id: "hot_priority_80",
            name: "Hot (priority >= 80)",
            sort: { key: "priority_desc" },
            filters: { priority_min: 80, archived: "false" },
          },
          {
            id: "needs_follow_up",
            name: "Needs follow-up",
            sort: { key: "next_action_asc" },
            filters: { next_action_due: "now", archived: "false" },
          },
          {
            id: "high_value",
            name: "High value",
            sort: { key: "est_premium_desc" },
            filters: { est_premium_min: 100, archived: "false" },
          },
          {
            id: "lost_archived",
            name: "Lost / Archived",
            sort: { key: "last_activity_desc" },
            filters: { status: "lost,archived", archived: "any" },
          },
        ],
      });
    }
  );

  // List (cursor based)
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
      const q = parseOrThrow(ListQuery, req.query, { where: "query", route: "/tenant/leads/v2" });

      const membership = await requireUserAndMembership(sub, q.site_id);
      if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

      const limit = Math.max(1, Math.min(200, q.limit ?? 50));
      const sort = q.sort ?? "created_at_desc";
      const cursor = q.cursor ? decodeCursor(q.cursor) : null;

      const where: string[] = ["l.site_id = $1::uuid"];
      const params: any[] = [q.site_id];
      let p = 2;

      // archived filter
      if (q.archived === "false" || !q.archived) where.push("l.archived_at is null");
      if (q.archived === "true") where.push("l.archived_at is not null");

      // text search
      if (q.q) {
        where.push(`(coalesce(l.full_name,'') || ' ' || coalesce(l.email,'') || ' ' || coalesce(l.phone,'')) ilike $${p++}`);
        params.push(`%${q.q}%`);
      }

      // csv filters
      const statuses = splitCsv(q.status);
      if (statuses) {
        where.push(`l.status = any($${p++}::text[])`);
        params.push(statuses);
      }
      const types = splitCsv(q.type);
      if (types) {
        where.push(`l.type = any($${p++}::text[])`);
        params.push(types);
      }
      const states = splitCsv(q.state);
      if (states) {
        where.push(`l.state = any($${p++}::text[])`);
        params.push(states);
      }
      if (q.source_page) {
        where.push(`l.source_page = $${p++}::text`);
        params.push(q.source_page);
      }

      if (q.priority_min != null) {
        where.push(`l.priority_score >= $${p++}::int`);
        params.push(Math.floor(q.priority_min));
      }
      if (q.priority_max != null) {
        where.push(`l.priority_score <= $${p++}::int`);
        params.push(Math.floor(q.priority_max));
      }

      if (q.created_since_hours != null && Number.isFinite(q.created_since_hours) && q.created_since_hours > 0) {
        where.push(`l.created_at >= (now() - ($${p++}::int * interval '1 hour'))`);
        params.push(Math.floor(q.created_since_hours));
      }

      if (q.next_action_due === "now") {
        where.push(`l.next_action_at is not null and l.next_action_at <= now()`);
      }

      if (q.est_premium_min != null && Number.isFinite(q.est_premium_min)) {
        where.push(`l.estimated_monthly_premium >= $${p++}::numeric`);
        params.push(q.est_premium_min);
      }

      // cursor seek
      if (cursor && cursor.sort === sort) {
        if (sort === "created_at_desc") {
          where.push(`(l.created_at, l.id) < ($${p++}::timestamptz, $${p++}::uuid)`);
          params.push(cursor.created_at, cursor.id);
        } else if (sort === "priority_desc") {
          where.push(`(l.priority_score, l.created_at, l.id) < ($${p++}::int, $${p++}::timestamptz, $${p++}::uuid)`);
          params.push(cursor.priority_score, cursor.created_at, cursor.id);
        } else if (sort === "last_activity_desc") {
          where.push(`(l.last_activity_at, l.created_at, l.id) < ($${p++}::timestamptz, $${p++}::timestamptz, $${p++}::uuid)`);
          params.push(cursor.last_activity_at, cursor.created_at, cursor.id);
        } else if (sort === "next_action_asc") {
          where.push(`(l.next_action_at, l.id) > ($${p++}::timestamptz, $${p++}::uuid)`);
          params.push(cursor.next_action_at, cursor.id);
        } else if (sort === "est_premium_desc") {
          where.push(`(l.estimated_monthly_premium, l.created_at, l.id) < ($${p++}::numeric, $${p++}::timestamptz, $${p++}::uuid)`);
          params.push(cursor.estimated_monthly_premium, cursor.created_at, cursor.id);
        }
      }

      const whereSql = `where ${where.join(" and ")}`;

      const orderBy =
        sort === "priority_desc"
          ? `order by l.priority_score desc, l.created_at desc, l.id desc`
          : sort === "last_activity_desc"
          ? `order by l.last_activity_at desc nulls last, l.created_at desc, l.id desc`
          : sort === "next_action_asc"
          ? `order by l.next_action_at asc nulls last, l.id asc`
          : sort === "est_premium_desc"
          ? `order by l.estimated_monthly_premium desc nulls last, l.created_at desc, l.id desc`
          : `order by l.created_at desc, l.id desc`;

      // Count (without cursor seek)
      const whereCount = where.filter(
        (w) =>
          !w.includes("(l.created_at, l.id)") &&
          !w.includes("(l.priority_score, l.created_at, l.id)") &&
          !w.includes("(l.last_activity_at, l.created_at, l.id)") &&
          !w.includes("(l.next_action_at, l.id)") &&
          !w.includes("(l.estimated_monthly_premium, l.created_at, l.id)")
      );
      const whereCountSql = `where ${whereCount.join(" and ")}`;

      const cursorParamCount =
        cursor ? (sort === "created_at_desc" || sort === "next_action_asc" ? 2 : 3) : 0;
      const countParams = cursorParamCount ? params.slice(0, params.length - cursorParamCount) : params;

      const countRes = await pool.query(
        `select count(*)::int as total from leads l ${whereCountSql}`,
        countParams
      );

      const listRes = await pool.query(
        `
        select
          l.id,
          l.created_at,
          l.type,
          l.status,
          l.sub_status,
          l.full_name,
          l.phone,
          l.email,
          l.state,
          l.priority_score,
          l.priority_reason,
          l.estimated_monthly_premium,
          l.estimated_commission,
          l.source_page,
          l.last_activity_at,
          l.last_activity_type,
          l.next_action_at,
          l.next_action_type,
          l.consent_status,
          l.version
        from leads l
        ${whereSql}
        ${orderBy}
        limit $${p++}
        `,
        [...params, limit]
      );

      const items = listRes.rows;
      const last = items[items.length - 1];

      const next_cursor = (() => {
        if (!last) return null;
        if (sort === "created_at_desc") return encodeCursor({ sort, created_at: last.created_at, id: last.id });
        if (sort === "priority_desc")
          return encodeCursor({ sort, priority_score: Number(last.priority_score ?? 0), created_at: last.created_at, id: last.id });
        if (sort === "last_activity_desc") {
          if (!last.last_activity_at) return null;
          return encodeCursor({ sort, last_activity_at: last.last_activity_at, created_at: last.created_at, id: last.id });
        }
        if (sort === "next_action_asc") {
          if (!last.next_action_at) return null;
          return encodeCursor({ sort, next_action_at: last.next_action_at, id: last.id });
        }
        if (sort === "est_premium_desc")
          return encodeCursor({
            sort,
            estimated_monthly_premium: String(last.estimated_monthly_premium ?? "0"),
            created_at: last.created_at,
            id: last.id,
          });
        return null;
      })();

      return reply.send({
        items,
        next_cursor,
        filtered_count: countRes.rows?.[0]?.total ?? 0,
      });
    }
  );

  // Update status (optimistic lock)
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
      const params = parseOrThrow(LeadParams, req.params, { where: "params", route: "/tenant/leads/v2/:id/status" });

      const siteId = String((req.query as any)?.site_id ?? "").trim();
      if (!siteId) return reply.code(400).send({ message: "site_id is required" });

      const membership = await requireUserAndMembership(sub, siteId);
      if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

      const body = parseOrThrow(UpdateStatusBody, req.body, { where: "body", route: "/tenant/leads/v2/:id/status" });

      const existingRes = await pool.query(
        `select id, status, sub_status, version
         from leads
         where id = $1::uuid and site_id = $2::uuid
         limit 1`,
        [params.id, siteId]
      );
      const existing = existingRes.rows[0];
      if (!existing) return reply.code(404).send({ message: "Lead not found" });

      if (Number(existing.version) !== Number(body.version)) {
        return reply.code(409).send({ message: "Lead was updated by someone else. Please refresh." });
      }

      const archivedAtSql = body.status === "archived" ? "now()" : "null";

      await pool.query(
        `
        update leads
        set
          status = $1::text,
          sub_status = $2::text,
          reason_code = $3::text,
          archived_at = ${archivedAtSql},
          version = version + 1,
          updated_at = now(),
          last_activity_at = now(),
          last_activity_type = 'status_change'
        where id = $4::uuid and site_id = $5::uuid
        `,
        [body.status, body.sub_status ?? null, body.reason_code ?? null, params.id, siteId]
      );

      // Best-effort event
      try {
        await pool.query(
          `insert into lead_events (lead_id, agent_id, event_type, channel, occurred_at, metadata)
           values ($1::uuid, $2::uuid, $3::text, $4::text, now(), $5::jsonb)`,
          [params.id, membership.user_id, "status_change", "system", JSON.stringify({ from: existing.status, to: body.status })]
        );
      } catch {}

      return reply.send({ ok: true, version: Number(body.version) + 1 });
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
      const params = parseOrThrow(LeadParams, req.params, { where: "params", route: "/tenant/leads/v2/:id/notes" });

      const siteId = String((req.query as any)?.site_id ?? "").trim();
      if (!siteId) return reply.code(400).send({ message: "site_id is required" });

      const membership = await requireUserAndMembership(sub, siteId);
      if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

      const body = parseOrThrow(AddNoteBody, req.body, { where: "body", route: "/tenant/leads/v2/:id/notes" });

      // Ensure lead exists in this site
      const leadRes = await pool.query(
        `select 1 from leads where id = $1::uuid and site_id = $2::uuid limit 1`,
        [params.id, siteId]
      );
      if (leadRes.rowCount === 0) return reply.code(404).send({ message: "Lead not found" });

      await pool.query(
        `insert into lead_notes (lead_id, agent_id, note_text, pinned, created_at)
         values ($1::uuid, $2::uuid, $3::text, $4::boolean, now())`,
        [params.id, membership.user_id, body.note_text, body.pinned ?? false]
      );

      // Best-effort event
      try {
        await pool.query(
          `insert into lead_events (lead_id, agent_id, event_type, channel, occurred_at, metadata)
           values ($1::uuid, $2::uuid, 'note', 'internal', now(), $3::jsonb)`,
          [params.id, membership.user_id, JSON.stringify({ pinned: body.pinned ?? false })]
        );
      } catch {}

      return reply.send({ ok: true });
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
      const params = parseOrThrow(LeadParams, req.params, { where: "params", route: "/tenant/leads/v2/:id" });

      const siteId = String((req.query as any)?.site_id ?? "").trim();
      if (!siteId) return reply.code(400).send({ message: "site_id is required" });

      const membership = await requireUserAndMembership(sub, siteId);
      if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

      const leadRes = await pool.query(
        `select *
         from leads
         where id = $1::uuid and site_id = $2::uuid
         limit 1`,
        [params.id, siteId]
      );
      const lead = leadRes.rows[0];
      if (!lead) return reply.code(404).send({ message: "Lead not found" });

      let notes: any[] = [];
      let events: any[] = [];
      try {
        const notesRes = await pool.query(
          `select * from lead_notes where lead_id = $1::uuid order by pinned desc, created_at desc limit 50`,
          [params.id]
        );
        notes = notesRes.rows;
      } catch {}
      try {
        const eventsRes = await pool.query(
          `select * from lead_events where lead_id = $1::uuid order by occurred_at desc limit 100`,
          [params.id]
        );
        events = eventsRes.rows;
      } catch {}

      return reply.send({ lead, notes, events });
    }
  );
}
