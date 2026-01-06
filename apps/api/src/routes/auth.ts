import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { pool } from "../db";
import { parseOrThrow } from "../validation";
import { loadCoreEnv } from "../env";

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post(
    "/auth/login",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const env = loadCoreEnv();
      const isProd = (env.NODE_ENV ?? "development") === "production" || env.APP_ENV === "production";
      if (isProd) return reply.code(404).send({ message: "Not Found" });

      const body = parseOrThrow(LoginBody, req.body, { where: "body", route: "/auth/login" });

      const email = body.email.trim().toLowerCase();
      const password = body.password;

      const { rows } = await pool.query(
        `select id, auth0_sub, email, password_hash
         from users
         where lower(email) = lower($1)
         limit 1`,
        [email]
      );

      const user = rows[0];
      if (!user?.password_hash) return reply.code(401).send({ message: "Invalid email or password" });

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return reply.code(401).send({ message: "Invalid email or password" });

      const secret = env.JWT_DEV_SECRET ?? process.env.JWT_DEV_SECRET;
      if (!secret) return reply.code(500).send({ message: "JWT_DEV_SECRET is not set" });

      const issuer = env.AUTH_ISSUER ?? "dev";
      const audience = env.AUTH_AUDIENCE ?? "dev";

      const token = jwt.sign(
        { permissions: ["tenant.read", "tenant.leads.read", "tenant.leads.write", "tenant.settings.read", "tenant.settings.write"] },
        secret,
        { subject: user.auth0_sub, issuer, audience, expiresIn: "8h" }
      );

      return { token, user: { id: user.id, sub: user.auth0_sub, email: user.email } };
    }
  );
}
