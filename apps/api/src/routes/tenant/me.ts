import type { FastifyInstance } from "fastify";
import { pool } from "../../db";
import { requireAuth } from "../../auth/requireAuth";

export async function registerTenantMeRoutes(app: FastifyInstance) {
  app.get("/tenant/me", { preHandler: requireAuth }, async (req, reply) => {
    const sub = req.auth!.sub;

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
  });
}
