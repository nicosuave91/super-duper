// apps/api/src/tenant/leadsQueryBuilder.ts
type SortKey =
  | "created_at_desc"
  | "priority_desc"
  | "last_activity_desc"
  | "next_action_asc"
  | "est_premium_desc";

export type LeadsV2Query = {
  q?: string;

  status?: string;      // csv
  sub_status?: string;  // csv
  type?: string;        // csv

  priority_min?: string;
  priority_max?: string;

  created_from?: string;
  created_to?: string;

  next_action_due?: "overdue" | "today" | "next_7_days" | "any";

  state?: string;       // csv
  archived?: "true" | "false" | "any";

  source_page?: string; // quick win using existing column

  sort?: SortKey;
  limit?: string;
  cursor?: string;
};

type Cursor =
  | { sort: "created_at_desc"; created_at: string; id: string }
  | { sort: "priority_desc"; priority_score: number; created_at: string; id: string }
  | { sort: "next_action_asc"; next_action_at: string; id: string }
  | { sort: "est_premium_desc"; estimated_monthly_premium: string; created_at: string; id: string }
  | { sort: "last_activity_desc"; last_activity_at: string; created_at: string; id: string };

function b64urlDecode(input: string) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
}

function b64urlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function encodeCursor(c: Cursor) {
  return b64urlEncode(JSON.stringify(c));
}

export function decodeCursor(raw?: string): Cursor | null {
  if (!raw) return null;
  try {
    const json = b64urlDecode(raw);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function csvToArray(v?: string) {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function clampLimit(raw?: string) {
  const n = Number(raw ?? 50);
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(200, Math.floor(n)));
}

export function buildLeadsV2Sql(tenantId: string, q: LeadsV2Query) {
  const where: string[] = ["tenant_id = $1"];
  const params: any[] = [tenantId];
  let p = 2;

  // archived
  const archived = q.archived ?? "false";
  if (archived === "false") where.push("archived_at is null");
  if (archived === "true") where.push("archived_at is not null");

  // status/type filters
  const statuses = csvToArray(q.status);
  if (statuses.length) {
    where.push(`status = any($${p++}::text[])`);
    params.push(statuses);
  }

  const subStatuses = csvToArray(q.sub_status);
  if (subStatuses.length) {
    where.push(`sub_status = any($${p++}::text[])`);
    params.push(subStatuses);
  }

  const types = csvToArray(q.type);
  if (types.length) {
    where.push(`type = any($${p++}::text[])`);
    params.push(types);
  }

  // priority range
  if (q.priority_min) {
    where.push(`priority_score >= $${p++}::int`);
    params.push(Number(q.priority_min));
  }
  if (q.priority_max) {
    where.push(`priority_score <= $${p++}::int`);
    params.push(Number(q.priority_max));
  }

  // created range
  if (q.created_from) {
    where.push(`created_at >= $${p++}::timestamptz`);
    params.push(q.created_from);
  }
  if (q.created_to) {
    where.push(`created_at < $${p++}::timestamptz`);
    params.push(q.created_to);
  }

  // next_action_due
  if (q.next_action_due) {
    if (q.next_action_due === "any") {
      where.push(`next_action_at is not null`);
    } else if (q.next_action_due === "overdue") {
      where.push(`next_action_at is not null and next_action_at < now()`);
    } else if (q.next_action_due === "today") {
      where.push(`next_action_at >= date_trunc('day', now()) and next_action_at < date_trunc('day', now()) + interval '1 day'`);
    } else if (q.next_action_due === "next_7_days") {
      where.push(`next_action_at >= now() and next_action_at < now() + interval '7 days'`);
    }
  }

  // state
  const states = csvToArray(q.state);
  if (states.length) {
    where.push(`state = any($${p++}::text[])`);
    params.push(states);
  }

  // source quick filter (v1 column)
  if (q.source_page) {
    where.push(`source_page = $${p++}`);
    params.push(q.source_page);
  }

  // search
  const search = String(q.q ?? "").trim();
  if (search) {
    const looksEmail = search.includes("@");
    const looksPhone = /^[0-9+()\-\s]+$/.test(search) && search.replace(/\D/g, "").length >= 7;

    if (looksEmail) {
      where.push(`email_normalized = $${p++}::citext`);
      params.push(search.toLowerCase());
    } else if (looksPhone) {
      // quick matching both v1 + v2 phone fields
      const digits = search.replace(/\D/g, "");
      where.push(`(phone ilike $${p} or phone_e164 = $${p})`);
      params.push(`%${digits}%`);
      p++;
    } else {
      const norm = search.toLowerCase();
      where.push(`(full_name_normalized ilike $${p} or full_name ilike $${p})`);
      params.push(`%${norm}%`);
      p++;
    }
  }

  const whereSql = `where ${where.join(" and ")}`;

  const sort: SortKey = (q.sort as SortKey) || "created_at_desc";

  // cursor seek
  const cursor = decodeCursor(q.cursor);
  if (cursor && cursor.sort !== sort) {
    // caller should 400; we return marker
    return { error: "cursor_sort_mismatch" as const };
  }

  const orderBy =
    sort === "priority_desc"
      ? "order by priority_score desc, created_at desc, id desc"
      : sort === "last_activity_desc"
      ? "order by last_activity_at desc nulls last, created_at desc, id desc"
      : sort === "next_action_asc"
      ? "order by next_action_at asc nulls last, id asc"
      : sort === "est_premium_desc"
      ? "order by estimated_monthly_premium desc nulls last, created_at desc, id desc"
      : "order by created_at desc, id desc";

  // Seek predicates per sort
  if (cursor) {
    if (cursor.sort === "created_at_desc") {
      where.push(`(created_at, id) < ($${p++}::timestamptz, $${p++})`);
      params.push(cursor.created_at, cursor.id);
    } else if (cursor.sort === "priority_desc") {
      where.push(`(priority_score, created_at, id) < ($${p++}::int, $${p++}::timestamptz, $${p++})`);
      params.push(cursor.priority_score, cursor.created_at, cursor.id);
    } else if (cursor.sort === "next_action_asc") {
      // if next_action_at is null, it won't paginate well; views using this sort should filter next_action_due=any
      where.push(`(next_action_at, id) > ($${p++}::timestamptz, $${p++})`);
      params.push(cursor.next_action_at, cursor.id);
    } else if (cursor.sort === "est_premium_desc") {
      where.push(`(estimated_monthly_premium, created_at, id) < ($${p++}::numeric, $${p++}::timestamptz, $${p++})`);
      params.push(cursor.estimated_monthly_premium, cursor.created_at, cursor.id);
    } else if (cursor.sort === "last_activity_desc") {
      where.push(`(last_activity_at, created_at, id) < ($${p++}::timestamptz, $${p++}::timestamptz, $${p++})`);
      params.push(cursor.last_activity_at, cursor.created_at, cursor.id);
    }
  }

  const limit = clampLimit(q.limit);
  const limitSql = `limit $${p++}`;
  params.push(limit);

  // re-build whereSql after cursor clause
  const whereSql2 = `where ${where.join(" and ")}`;

  const selectSql = `
    select
      id, tenant_id, created_at, updated_at,
      type, status, sub_status,
      full_name, phone, email,
      state,
      priority_score, priority_reason,
      estimated_monthly_premium, estimated_commission,
      source_page,
      last_activity_at, last_activity_type,
      next_action_at, next_action_type,
      consent_status,
      version
    from leads
    ${whereSql2}
    ${orderBy}
    ${limitSql}
  `;

  const countSql = `select count(*)::int as total from leads ${whereSql}`;

  return {
    sort,
    whereSql: whereSql2,
    params,
    selectSql,
    countSql,
  };
}

export function makeNextCursor(sort: string, lastRow: any) {
  if (!lastRow) return null;

  if (sort === "created_at_desc") {
    return encodeCursor({ sort: "created_at_desc", created_at: lastRow.created_at, id: lastRow.id });
  }
  if (sort === "priority_desc") {
    return encodeCursor({
      sort: "priority_desc",
      priority_score: Number(lastRow.priority_score ?? 0),
      created_at: lastRow.created_at,
      id: lastRow.id,
    });
  }
  if (sort === "next_action_asc") {
    if (!lastRow.next_action_at) return null;
    return encodeCursor({ sort: "next_action_asc", next_action_at: lastRow.next_action_at, id: lastRow.id });
  }
  if (sort === "est_premium_desc") {
    return encodeCursor({
      sort: "est_premium_desc",
      estimated_monthly_premium: String(lastRow.estimated_monthly_premium ?? "0"),
      created_at: lastRow.created_at,
      id: lastRow.id,
    });
  }
  if (sort === "last_activity_desc") {
    if (!lastRow.last_activity_at) return null;
    return encodeCursor({
      sort: "last_activity_desc",
      last_activity_at: lastRow.last_activity_at,
      created_at: lastRow.created_at,
      id: lastRow.id,
    });
  }

  return null;
}
