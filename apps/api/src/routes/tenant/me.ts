import type { FastifyInstance } from "fastify";
import { pool } from "../../db";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";

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
        `select s.id, s.name
         from sites s
         join site_members sm on sm.site_id = s.id
         where sm.user_id = $1`,
        [user.id]
      );

      return {
        user: { id: user.id, sub: user.auth0_sub, email: user.email },
        sites: sitesRes.rows,
      };
    }
  );
}
