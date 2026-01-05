import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { query, tx } from "../../db";
import { AppError } from "../../errors/appError";
import { buildLeadsV2Sql, makeNextCursor } from "../../tenant/leadsQueryBuilder";

export async function registerTenantLeadsV2Routes(app: FastifyInstance) {
  // LIST (cursor pagination)
  app.get("/tenant/leads/v2", async (req, reply) => {
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id ?? null;
    if (!tenantId) throw new AppError(401, "auth.unauthorized", "Unauthorized");

    const q = (req.query ?? {}) as any;

    const built = buildLeadsV2Sql(tenantId, q);
    if ((built as any).error === "cursor_sort_mismatch") {
      throw new AppError(400, "leads.cursor_sort_mismatch", "Cursor does not match sort");
    }

    const totalRows = await query<{ total: number }>((built as any).countSql, (built as any).params.slice(0, 1 + 0)); // countSql uses original where without cursor; safe to recompute instead
    // NOTE: above is conservative but simplistic; if you want accurate filtered_count, compute a separate count using same filters sans cursor.
    // We'll do proper filtered_count below:

    // Proper filtered_count: rebuild without cursor by calling builder with cursor removed
    const builtNoCursor = buildLeadsV2Sql(tenantId, { ...q, cursor: undefined });
    const filteredCountRows = await query<{ total: number }>((builtNoCursor as any).countSql, (builtNoCursor as any).params.slice(0, (builtNoCursor as any).params.length - 1)); // count params exclude limit
    const filtered_count = filteredCountRows[0]?.total ?? 0;

    const items = await query((built as any).selectSql, (built as any).params);
    const next_cursor = makeNextCursor((built as any).sort, items[items.length - 1]);

    reply.send({ items, next_cursor, filtered_count });
  });

  // GET (drawer payload)
  app.get("/tenant/leads/v2/:id", async (req, reply) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) throw new AppError(401, "auth.unauthorized", "Unauthorized");

    const id = (req.params as any).id;

    const leads = await query(`select * from leads where id = $1 and tenant_id = $2`, [id, tenantId]);
    const lead = leads[0];
    if (!lead) throw new AppError(404, "lead.not_found", "Lead not found");

    const notes = await query(
      `select * from lead_notes where lead_id = $1 and tenant_id = $2 order by pinned desc, created_at desc limit 50`,
      [id, tenantId]
    );

    const events = await query(
      `select * from lead_events where lead_id = $1 and tenant_id = $2 order by occurred_at desc limit 100`,
      [id, tenantId]
    );

    reply.send({ lead, notes, events });
  });

  // PATCH status/substatus + optional next action (with optimistic concurrency)
  app.patch("/tenant/leads/v2/:id/status", async (req, reply) => {
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id ?? null;
    if (!tenantId) throw new AppError(401, "auth.unauthorized", "Unauthorized");

    const id = (req.params as any).id;
    const body = (req.body ?? {}) as any;

    const nextStatus = body.status ? String(body.status) : null;
    const nextSub = body.sub_status ? String(body.sub_status) : null;
    const reason = body.reason_code ? String(body.reason_code) : null;

    const nextActionAt = body.next_action_at ? String(body.next_action_at) : null;
    const nextActionType = body.next_action_type ? String(body.next_action_type) : null;

    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion)) throw new AppError(400, "lead.version_required", "Version is required");

    const updated = await tx(async (q) => {
      const rows = await q(`select id, status, sub_status, version from leads where id = $1 and tenant_id = $2`, [
        id,
        tenantId,
      ]);
      const lead = rows[0];
      if (!lead) throw new AppError(404, "lead.not_found", "Lead not found");

      if (Number(lead.version) !== expectedVersion) {
        throw new AppError(409, "lead.version_conflict", "Lead was updated by another action");
      }

      const fromStatus = String(lead.status);
      const fromSub = lead.sub_status ? String(lead.sub_status) : null;

      // enforce reason for lost/archived
      if (nextStatus && (nextStatus === "lost" || nextStatus === "archived") && !reason) {
        throw new AppError(422, "lead.reason_required", "Reason code required for Lost/Archived");
      }

      const newStatus = nextStatus ?? fromStatus;
      const newSub = nextSub ?? fromSub;

      await q(
        `update leads
         set status = $1,
             sub_status = $2,
             status_updated_at = now(),
             next_action_at = coalesce($3::timestamptz, next_action_at),
             next_action_type = coalesce($4, next_action_type),
             last_activity_at = now(),
             last_activity_type = 'status_change',
             version = version + 1,
             updated_at = now()
         where id = $5 and tenant_id = $6`,
        [newStatus, newSub, nextActionAt, nextActionType, id, tenantId]
      );

      // history (re-use your existing lead_status_history table if present)
      await q(
        `insert into lead_status_history (id, lead_id, tenant_id, from_status, to_status, actor_user_id, note, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, now())`,
        [crypto.randomUUID(), id, tenantId, fromStatus, newStatus, userId, reason]
      );

      // event
      await q(
        `insert into lead_events (id, tenant_id, lead_id, agent_id, event_type, channel, metadata)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          crypto.randomUUID(),
          tenantId,
          id,
          userId,
          "status_changed",
          "status_change",
          JSON.stringify({ from_status: fromStatus, to_status: newStatus, from_sub_status: fromSub, to_sub_status: newSub, reason_code: reason }),
        ]
      );

      const out = await q(`select * from leads where id = $1 and tenant_id = $2`, [id, tenantId]);
      return out[0];
    });

    reply.send({ ok: true, lead: updated });
  });

  // NOTES (fast add)
  app.post("/tenant/leads/v2/:id/notes", async (req, reply) => {
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id ?? null;
    if (!tenantId) throw new AppError(401, "auth.unauthorized", "Unauthorized");
    if (!userId) throw new AppError(401, "auth.unauthorized", "Unauthorized");

    const leadId = (req.params as any).id;
    const body = (req.body ?? {}) as any;
    const noteText = String(body.note_text ?? "").trim();
    const pinned = Boolean(body.pinned ?? false);
    if (!noteText) throw new AppError(400, "lead.note_required", "Note text is required");

    const id = crypto.randomUUID();

    await tx(async (q) => {
      await q(
        `insert into lead_notes (id, tenant_id, lead_id, agent_id, note_text, pinned)
         values ($1, $2, $3, $4, $5, $6)`,
        [id, tenantId, leadId, userId, noteText, pinned]
      );

      await q(
        `insert into lead_events (id, tenant_id, lead_id, agent_id, event_type, channel, metadata)
         values ($1, $2, $3, $4, 'note_added', 'note', $5)`,
        [crypto.randomUUID(), tenantId, leadId, userId, JSON.stringify({ pinned })]
      );

      await q(
        `update leads
         set last_activity_at = now(),
             last_activity_type = 'note',
             version = version + 1,
             updated_at = now()
         where id = $1 and tenant_id = $2`,
        [leadId, tenantId]
      );
    });

    reply.send({ ok: true, id });
  });

  // SAVED VIEWS (list + seed)
  app.get("/tenant/leads/v2/saved-views", async (req, reply) => {
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id ?? null;
    if (!tenantId || !userId) throw new AppError(401, "auth.unauthorized", "Unauthorized");

    // Seed defaults if none exist
    const existing = await query(`select count(*)::int as c from lead_saved_views where tenant_id=$1 and agent_id=$2`, [tenantId, userId]);
    if ((existing[0]?.c ?? 0) === 0) {
      const presets = [
        { name: "New (24h)", filters: { created_from: new Date(Date.now() - 24*3600*1000).toISOString() }, sort: { key: "created_at_desc" } },
        { name: "Hot (>=80)", filters: { priority_min: 80 }, sort: { key: "priority_desc" } },
        { name: "Needs follow-up", filters: { next_action_due: "overdue" }, sort: { key: "next_action_asc" } },
        { name: "High value", filters: { sort: "est_premium_desc" }, sort: { key: "est_premium_desc" } },
        { name: "Lost/Archived", filters: { status: "lost,archived", archived: "any" }, sort: { key: "created_at_desc" } },
      ];

      for (const p of presets) {
        await query(
          `insert into lead_saved_views (id, tenant_id, agent_id, name, is_preset, filters, sort, columns)
           values ($1, $2, $3, $4, true, $5::jsonb, $6::jsonb, $7::jsonb)`,
          [crypto.randomUUID(), tenantId, userId, p.name, JSON.stringify(p.filters), JSON.stringify(p.sort), JSON.stringify({})]
        );
      }
    }

    const rows = await query(
      `select id, name, is_preset, is_default, filters, sort, columns, created_at, updated_at
       from lead_saved_views
       where tenant_id=$1 and agent_id=$2
       order by is_preset desc, name asc`,
      [tenantId, userId]
    );

    reply.send({ items: rows });
  });
}
