import type { FastifyInstance, FastifyRequest } from "fastify";
import { pool } from "../db";

type ListQuery = {
  site_id?: string;
  sort?: string;
  order?: string;
  status?: string;
  type?: string;
  q?: string;
  limit?: string | number;
  offset?: string | number;
};

type DetailParams = { id: string };
type DetailQuery = { site_id?: string };

const SORT_COLUMNS: Record<string, string> = {
  created_at: "created_at",
  updated_at: "updated_at",
  status: "status",
  type: "type",
};

function toInt(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function registerTenantLeadsRoutes(app: FastifyInstance) {
  // LIST
  app.get(
    "/tenant/leads",
    async (req: FastifyRequest<{ Querystring: ListQuery }>, reply) => {
      try {
        const site_id = String(req.query.site_id ?? "").trim();
        if (!site_id) {
          return reply.code(400).send({ error: "missing_site_id", message: "site_id is required" });
        }

        const sort = String(req.query.sort ?? "created_at");
        const order = String(req.query.order ?? "desc").toLowerCase();
        const status = req.query.status ? String(req.query.status) : null;
        const type = req.query.type ? String(req.query.type) : null;
        const q = req.query.q ? String(req.query.q) : null;

        const limit = Math.min(Math.max(toInt(req.query.limit, 25), 1), 100);
        const offset = Math.max(toInt(req.query.offset, 0), 0);

        const sortColumn = SORT_COLUMNS[sort] ?? "created_at";
        const orderSql = order === "asc" ? "asc" : "desc";

        let p = 1;
        const params: any[] = [];
        let whereSql = `where site_id = $${p++}`;
        params.push(site_id);

        if (status) {
          whereSql += ` and status = $${p++}`;
          params.push(status);
        }

        if (type) {
          whereSql += ` and type = $${p++}`;
          params.push(type);
        }

        if (q) {
          whereSql += ` and (lower(full_name) like $${p} or lower(email) like $${p} or lower(phone) like $${p})`;
          params.push(`%${q.toLowerCase()}%`);
          p++;
        }

        const countRes = await pool.query(
          `select count(*)::int as total from leads ${whereSql}`,
          params
        );
        const total = countRes.rows?.[0]?.total ?? 0;

        const sql = `
          select
            id, site_id, created_at, updated_at,
            type, status,
            full_name, phone, email,
            source_page,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer,
            last_activity_at
          from leads
          ${whereSql}
          order by ${sortColumn} ${orderSql}
          limit $${p++} offset $${p++}
        `;

        const listRes = await pool.query(sql, [...params, limit, offset]);

        return reply.code(200).send({
          items: listRes.rows ?? [],
          total,
          limit,
          offset,
        });
      } catch (e: any) {
        return reply.code(500).send({
          error: "internal_error",
          message: e?.message ?? "Failed to load leads",
        });
      }
    }
  );

  // DETAIL
  app.get(
    "/tenant/leads/:id",
    async (
      req: FastifyRequest<{ Params: DetailParams; Querystring: DetailQuery }>,
      reply
    ) => {
      try {
        const site_id = String(req.query.site_id ?? "").trim();
        if (!site_id) {
          return reply.code(400).send({ error: "missing_site_id", message: "site_id is required" });
        }

        const id = String(req.params.id ?? "").trim();
        if (!id) {
          return reply.code(400).send({ error: "missing_id", message: "id is required" });
        }

        const leadRes = await pool.query(`select * from leads where id = $1 and site_id = $2`, [
          id,
          site_id,
        ]);

        const lead = leadRes.rows?.[0] ?? null;
        if (!lead) {
          return reply.code(404).send({ error: "not_found", message: "Lead not found" });
        }

        let history: any[] = [];
        try {
          const histRes = await pool.query(
            `select * from lead_status_history where lead_id = $1 and site_id = $2 order by created_at desc`,
            [id, site_id]
          );
          history = histRes.rows ?? [];
        } catch {
          // ignore if table doesn't exist yet
        }

        return reply.code(200).send({ lead, history });
      } catch (e: any) {
        return reply.code(500).send({
          error: "internal_error",
          message: e?.message ?? "Failed to load lead",
        });
      }
    }
  );
}
