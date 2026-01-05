import type { FastifyInstance } from "fastify";
import { pool } from "../../db";
import { requireAuth } from "../../auth/requireAuth";

type SortKey =
  | "created_at_desc"
  | "priority_desc"
  | "last_activity_desc"
  | "next_action_asc"
  | "est_premium_desc";

type Cursor =
  | { sort: "created_at_desc"; created_at: string; id: string }
  | { sort: "priority_desc"; priority_score: number; created_at: string; id: string }
  | { sort: "last_activity_desc"; last_activity_at: string; created_at: string; id: string }
  | { sort: "next_action_asc"; next_action_at: string; id: string }
  | { sort: "est_premium_desc"; estimated_monthly_premium: string; created_at: string; id: string };

function b64urlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function b64urlDecode(input: string) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
}
function encodeCursor(c: Cursor) {
  return b64urlEncode(JSON.stringify(c));
}
function decodeCursor(raw?: string): Cursor | null {
  if (!raw) return null;
  try {
    return JSON.parse(b64urlDecode(raw));
  } catch {
    return null;
  }
}
function csvToArray(v?: string) {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
function clampLimit(raw?: any) {
  const n = Number(raw ?? 50);
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(200, Math.floor(n)));
}

async function requireUserAndMembership(auth0Sub: string, siteId: string) {
  // Find user
  const userRes = await pool.query(`select id from users where auth0_sub = $1 limit 1`, [auth0Sub]);
  const user = userRes.rows[0];
  if (!user) return { error: { code: 404, message: "User not found" } as const };
type SavedView = {
  id: string;
  name: string;
  filters: Record<string, any>;
  sort: { key: SortKey };
  columns?: string[];
  column_order?: string[];
};

function buildDefaultSavedViews(): SavedView[] {
  // IDs are stable strings (no DB yet) so the UI can reliably select them.
  return [
    {
      id: "new_last_24h",
      name: "New (last 24h)",
      filters: { created_since_hours: 24, status: "new", archived: "false" },
      sort: { key: "created_at_desc" },
    },
    {
      id: "hot_priority_80",
      name: "Hot (priority >= 80)",
      filters: { priority_min: 80, archived: "false" },
      sort: { key: "priority_desc" },
    },
    {
      id: "needs_follow_up",
      name: "Needs follow-up",
      filters: { next_action_due: "now", archived: "false" },
      sort: { key: "next_action_asc" },
    },
    {
      id: "high_value",
      name: "High value",
      filters: { est_premium_min: 150, archived: "false" },
      sort: { key: "est_premium_desc" },
    },
    {
      id: "lost_archived",
      name: "Lost / Archived",
      filters: { status: "lost,archived", archived: "any" },
      sort: { key: "created_at_desc" },
    },
  ];
}

  // Validate membership (site-scoped access)
  const memRes = await pool.query(
    `select 1 from site_memberships where user_id = $1 and site_id = $2 limit 1`,
    [user.id, siteId]
  );
  if (memRes.rowCount === 0) return { error: { code: 403, message: "Forbidden" } as const };

  return { user };
}
  /**
   * SAVED VIEWS (V2)
   * GET /tenant/leads/v2/saved-views?site_id=...
   *
   * For now: return 5 defaults (no DB persistence yet).
   */
  app.get("/tenant/leads/v2/saved-views", { preHandler: requireAuth }, async (req, reply) => {
    const sub = req.auth!.sub;

    const siteId = String((req.query as any)?.site_id ?? "").trim();
    if (!siteId) return reply.code(400).send({ message: "site_id is required" });

    const membership = await requireUserAndMembership(sub, siteId);
    if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

    return reply.send({ items: buildDefaultSavedViews() });
  });

export async function registerTenantLeadsV2Routes(app: FastifyInstance) {
  /**
   * LIST (cursor pagination)
   * GET /tenant/leads/v2?site_id=...&limit=...&sort=...&cursor=...
   * Filters: q, status, type, state, priority_min/max, archived
   */
  /**
   * SAVED VIEWS (defaults for now)
   * GET /tenant/leads/v2/saved-views?site_id=...
   */
  app.get("/tenant/leads/v2/saved-views", { preHandler: requireAuth }, async (req, reply) => {
    const sub = req.auth!.sub;

    const siteId = String((req.query as any)?.site_id ?? "").trim();
    if (!siteId) return reply.code(400).send({ message: "site_id is required" });

    const membership = await requireUserAndMembership(sub, siteId);
    if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

    // The UI expects: { items: SavedView[] }
    // SavedView shape used by LeadsListPage.vue:
    // { id, name, sort: { key }, filters: { ... } }
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
  });


  app.get("/tenant/leads/v2", { preHandler: requireAuth }, async (req, reply) => {
    const sub = req.auth!.sub;

    const siteId = String((req.query as any)?.site_id ?? "").trim();
    if (!siteId) return reply.code(400).send({ message: "site_id is required" });

    const membership = await requireUserAndMembership(sub, siteId);
    if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

    const q = String((req.query as any)?.q ?? "").trim();
    const status = String((req.query as any)?.status ?? "").trim(); // csv
    const type = String((req.query as any)?.type ?? "").trim();     // csv
    const state = String((req.query as any)?.state ?? "").trim();   // csv
    const sourcePage = String((req.query as any)?.source_page ?? "").trim();
    const createdSinceHoursRaw = (req.query as any)?.created_since_hours;
    const nextActionDue = String((req.query as any)?.next_action_due ?? "").trim(); // "now"
    const estPremiumMinRaw = (req.query as any)?.est_premium_min;

    const priorityMin = (req.query as any)?.priority_min;
    const priorityMax = (req.query as any)?.priority_max;
    const sourcePage = String((req.query as any)?.source_page ?? "").trim();
    const createdSinceHoursRaw = (req.query as any)?.created_since_hours;
    const nextActionDue = String((req.query as any)?.next_action_due ?? "").trim(); // "now"
    const estPremiumMinRaw = (req.query as any)?.est_premium_min;

    const archived = String((req.query as any)?.archived ?? "false").trim(); // false|true|any
    const sort: SortKey = (String((req.query as any)?.sort ?? "created_at_desc") as SortKey) || "created_at_desc";
    const limit = clampLimit((req.query as any)?.limit);
    const cursor = decodeCursor(String((req.query as any)?.cursor ?? "").trim());

    if (cursor && cursor.sort !== sort) return reply.code(400).send({ message: "Cursor does not match sort" });

    const where: string[] = ["l.site_id = $1"];
    const params: any[] = [siteId];
    let p = 2;

    if (archived === "false") where.push("l.archived_at is null");
    if (archived === "true") where.push("l.archived_at is not null");

    const statuses = csvToArray(status);
    if (statuses.length) {
      where.push(`l.status = any($${p++}::text[])`);
      params.push(statuses);
    }

    const types = csvToArray(type);
    if (types.length) {
      where.push(`l.type = any($${p++}::text[])`);
      params.push(types);
    }

    const states = csvToArray(state);
    if (states.length) {
      where.push(`l.state = any($${p++}::text[])`);
      params.push(states);
    }

    if (priorityMin != null && priorityMin !== "") {
      where.push(`l.priority_score >= $${p++}::int`);
      params.push(Number(priorityMin));
    }
    if (priorityMax != null && priorityMax !== "") {
      where.push(`l.priority_score <= $${p++}::int`);
      params.push(Number(priorityMax));
    }
    if (sourcePage) {
      where.push(`l.source_page = $${p++}::text`);
      params.push(sourcePage);
    }

    const createdSinceHours = Number(createdSinceHoursRaw);
    if (Number.isFinite(createdSinceHours) && createdSinceHours > 0) {
      where.push(`l.created_at >= now() - ($${p++}::int * interval '1 hour')`);
      params.push(Math.floor(createdSinceHours));
    }

    if (nextActionDue === "now") {
      where.push(`l.next_action_at is not null and l.next_action_at <= now()`);
    }

    if (estPremiumMinRaw != null && estPremiumMinRaw !== "") {
      where.push(`l.estimated_monthly_premium >= $${p++}::numeric`);
      params.push(Number(estPremiumMinRaw));
    }

    // Search: email/phone/name
    if (q) {
      const looksEmail = q.includes("@");
      const looksPhone = /^[0-9+()\-\s]+$/.test(q) && q.replace(/\D/g, "").length >= 7;

      if (looksEmail) {
        where.push(`l.email_normalized = $${p++}::citext`);
        params.push(q.toLowerCase());
      } else if (looksPhone) {
        const digits = q.replace(/\D/g, "");
        where.push(`(l.phone ilike $${p} or l.phone_e164 = $${p})`);
        params.push(`%${digits}%`);
        p++;
      } else {
        const norm = q.toLowerCase();
        where.push(`(l.full_name_normalized ilike $${p} or l.full_name ilike $${p})`);
        params.push(`%${norm}%`);
        p++;
      }
    }

    // Cursor seek (stable ordering)
    if (cursor) {
      if (cursor.sort === "created_at_desc") {
        where.push(`(l.created_at, l.id) < ($${p++}::timestamptz, $${p++}::uuid)`);
        params.push(cursor.created_at, cursor.id);
      } else if (cursor.sort === "priority_desc") {
        where.push(`(l.priority_score, l.created_at, l.id) < ($${p++}::int, $${p++}::timestamptz, $${p++}::uuid)`);
        params.push(cursor.priority_score, cursor.created_at, cursor.id);
      } else if (cursor.sort === "last_activity_desc") {
        where.push(`(l.last_activity_at, l.created_at, l.id) < ($${p++}::timestamptz, $${p++}::timestamptz, $${p++}::uuid)`);
        params.push(cursor.last_activity_at, cursor.created_at, cursor.id);
      } else if (cursor.sort === "next_action_asc") {
        where.push(`(l.next_action_at, l.id) > ($${p++}::timestamptz, $${p++}::uuid)`);
        params.push(cursor.next_action_at, cursor.id);
      } else if (cursor.sort === "est_premium_desc") {
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

    // Count excludes cursor seek clause
    const whereCount = where.filter(
      (w) =>
        !w.includes("(l.created_at, l.id)") &&
        !w.includes("(l.priority_score, l.created_at, l.id)") &&
        !w.includes("(l.last_activity_at, l.created_at, l.id)") &&
        !w.includes("(l.next_action_at, l.id)") &&
        !w.includes("(l.estimated_monthly_premium, l.created_at, l.id)")
    );
    const whereCountSql = `where ${whereCount.join(" and ")}`;

    // Count params: safest approach is to re-run count with cursor removed (same params but without the last seek params)
    // We'll compute how many params the cursor contributed.
    const cursorParamCount =
      cursor ? (cursor.sort === "created_at_desc" || cursor.sort === "next_action_asc" ? 2 : 3) : 0;
    const countParams = cursorParamCount ? params.slice(0, params.length - cursorParamCount) : params;

    const countRes = await pool.query(`select count(*)::int as total from leads l ${whereCountSql}`, countParams);

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
  });
  // Saved Views (v2) — defaults only for now
  app.get("/tenant/leads/v2/saved-views", { preHandler: requireAuth }, async (req, reply) => {
    const sub = req.auth!.sub;

    const siteId = String((req.query as any)?.site_id ?? "").trim();
    if (!siteId) return reply.code(400).send({ message: "site_id is required" });

    const membership = await requireUserAndMembership(sub, siteId);
    if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

    // Matches UI expectations: items[], each has id, name, sort, filters
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
  });
    if (sourcePage) {
      where.push(`l.source_page = $${p++}::text`);
      params.push(sourcePage);
    }

    if (createdSinceHoursRaw != null && createdSinceHoursRaw !== "") {
      const hours = Number(createdSinceHoursRaw);
      if (Number.isFinite(hours) && hours > 0) {
        where.push(`l.created_at >= (now() - ($${p++}::int * interval '1 hour'))`);
        params.push(Math.floor(hours));
      }
    }

    if (nextActionDue === "now") {
      where.push(`l.next_action_at is not null and l.next_action_at <= now()`);
    }

    if (estPremiumMinRaw != null && estPremiumMinRaw !== "") {
      const n = Number(estPremiumMinRaw);
      if (Number.isFinite(n)) {
        where.push(`l.estimated_monthly_premium >= $${p++}::numeric`);
        params.push(n);
      }
    }
  /**
   * UPDATE STATUS (V2)
   * PATCH /tenant/leads/v2/:id/status?site_id=...
   */
  app.patch("/tenant/leads/v2/:id/status", { preHandler: requireAuth }, async (req, reply) => {
    const sub = req.auth!.sub;
    const id = String((req.params as any).id);

    const siteId = String((req.query as any)?.site_id ?? "").trim();
    if (!siteId) return reply.code(400).send({ message: "site_id is required" });

    const membership = await requireUserAndMembership(sub, siteId);
    if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

    const body = (req.body ?? {}) as any;

    const status = String(body.status ?? "").trim();
    const sub_status = body.sub_status != null ? String(body.sub_status).trim() : null;
    const reason_code = body.reason_code != null ? String(body.reason_code).trim() : null;
    const version = Number(body.version);

    if (!status) return reply.code(400).send({ message: "status is required" });
    if (!Number.isFinite(version)) return reply.code(400).send({ message: "version is required" });

    // Load existing
    const existingRes = await pool.query(
      `select id, status, sub_status, version
       from leads
       where id = $1::uuid and site_id = $2::uuid
       limit 1`,
      [id, siteId]
    );
    const existing = existingRes.rows[0];
    if (!existing) return reply.code(404).send({ message: "Lead not found" });

    // optimistic lock
    if (Number(existing.version) !== version) {
      return reply.code(409).send({ message: "Lead was updated by someone else. Please refresh." });
    }

    const archivedAtSql = status === "archived" ? "now()" : "null";

    // Update lead row
    const updRes = await pool.query(
      `
      update leads
      set
        status = $3::text,
        sub_status = $4::text,
        status_updated_at = now(),
        archived_at = ${archivedAtSql},
        last_activity_at = now(),
        last_activity_type = 'status_changed',
        version = version + 1,
        updated_at = now()
      where id = $1::uuid
        and site_id = $2::uuid
        and version = $5::int
      returning *
      `,
      [id, siteId, status, sub_status, version]
    );

    const lead = updRes.rows[0];
    if (!lead) return reply.code(409).send({ message: "Conflict updating lead. Please retry." });
  /**
   * ADD NOTE (V2)
   * POST /tenant/leads/v2/:id/notes?site_id=...
   */
  app.post("/tenant/leads/v2/:id/notes", { preHandler: requireAuth }, async (req, reply) => {
    const sub = req.auth!.sub;
    const id = String((req.params as any).id);

    const siteId = String((req.query as any)?.site_id ?? "").trim();
    if (!siteId) return reply.code(400).send({ message: "site_id is required" });

    const membership = await requireUserAndMembership(sub, siteId);
    if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

    const body = (req.body ?? {}) as any;
    const note_text = String(body.note_text ?? "").trim();
    const pinned = Boolean(body.pinned ?? false);

    if (!note_text) return reply.code(400).send({ message: "note_text is required" });

    // Ensure lead exists and belongs to site
    const leadRes = await pool.query(`select 1 from leads where id = $1::uuid and site_id = $2::uuid limit 1`, [id, siteId]);
    if (leadRes.rowCount === 0) return reply.code(404).send({ message: "Lead not found" });

    const noteRes = await pool.query(
      `
      insert into lead_notes (lead_id, agent_id, note_text, pinned, created_at)
      values ($1::uuid, $2::uuid, $3::text, $4::bool, now())
      returning *
      `,
      [id, membership.user.id, note_text, pinned]
    );

    await pool.query(
      `
      insert into lead_events (lead_id, agent_id, event_type, channel, occurred_at, metadata)
      values ($1::uuid, $2::uuid, 'note_added', 'system', now(), $3::jsonb)
      `,
      [id, membership.user.id, JSON.stringify({ pinned })]
    );

    // rollup
    await pool.query(
      `
      update leads
      set last_activity_at = now(),
          last_activity_type = 'note_added',
          updated_at = now()
      where id = $1::uuid and site_id = $2::uuid
      `,
      [id, siteId]
    );

    return reply.send({ note: noteRes.rows[0] });
  });

    // Audit tables
    await pool.query(
      `
      insert into lead_status_history_v2
        (lead_id, agent_id, from_status, to_status, from_sub_status, to_sub_status, changed_at, reason_code, metadata)
      values
        ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, now(), $7::text, $8::jsonb)
      `,
      [
        id,
        membership.user.id,
        existing.status,
        status,
        existing.sub_status,
        sub_status,
        reason_code,
        JSON.stringify({ version_before: version, version_after: lead.version }),
      ]
    );

    await pool.query(
      `
      insert into lead_events
        (lead_id, agent_id, event_type, channel, occurred_at, metadata)
      values
        ($1::uuid, $2::uuid, 'status_changed', 'system', now(), $3::jsonb)
      `,
      [
        id,
        membership.user.id,
        JSON.stringify({
          from_status: existing.status,
          to_status: status,
          from_sub_status: existing.sub_status,
          to_sub_status: sub_status,
          reason_code,
        }),
      ]
    );

    return reply.send({ lead });
  });

  /**
   * DRAWER payload
   * GET /tenant/leads/v2/:id?site_id=...
   */
  app.get("/tenant/leads/v2/:id", { preHandler: requireAuth }, async (req, reply) => {
    const sub = req.auth!.sub;
    const id = String((req.params as any).id);

    const siteId = String((req.query as any)?.site_id ?? "").trim();
    if (!siteId) return reply.code(400).send({ message: "site_id is required" });

    const membership = await requireUserAndMembership(sub, siteId);
    if ("error" in membership) return reply.code(membership.error.code).send({ message: membership.error.message });

    const leadRes = await pool.query(`select * from leads where id = $1::uuid and site_id = $2::uuid limit 1`, [id, siteId]);
    const lead = leadRes.rows[0];
    if (!lead) return reply.code(404).send({ message: "Lead not found" });

    const notesRes = await pool.query(
      `select * from lead_notes where lead_id = $1::uuid order by pinned desc, created_at desc limit 50`,
      [id]
    );
    const eventsRes = await pool.query(
      `select * from lead_events where lead_id = $1::uuid order by occurred_at desc limit 100`,
      [id]
    );

    return reply.send({ lead, notes: notesRes.rows, events: eventsRes.rows });
  });
}
