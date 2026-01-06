import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../../db";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";
import { parseOrThrow } from "../../validation";

const Query = z.object({}).passthrough();

export async function registerTenantMeRoutes(app: FastifyInstance) {
  app.get(
    "/tenant/me",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.read");
      },
    },
    async (req, reply) => {
      parseOrThrow(Query, req.query, { where: "query", route: "/tenant/me" });

      const sub = req.principal!.sub;

      const userRes = await pool.query(
        `select id, auth0_sub, email
         from users
         where auth0_sub = $1
         limit 1`,
        [sub]
      );

      const user = userRes.rows[0];
      if (!user) return reply.code(404).send({ message: "User not found" });

      const sitesRes = await pool.query(
        `select s.id, s.name, s.slug, sm.role
         from site_memberships sm
         join sites s on s.id = sm.site_id
         where sm.user_id = $1
         order by s.created_at asc`,
        [user.id]
      );

      return {
        user: { id: user.id, sub: user.auth0_sub, email: user.email },
        sites: sitesRes.rows,
      };
    }
  );
}
