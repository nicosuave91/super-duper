import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { pool } from "../db";
import { loadCoreEnv } from "../env";

type LoginBody = { email: string; password: string };

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post<{ Body: LoginBody }>("/auth/login", async (req, reply) => {
    const env = loadCoreEnv();
    const isProd =
      (env.NODE_ENV ?? "development") === "production" || env.APP_ENV === "production";
    if (isProd) return reply.code(404).send({ message: "Not Found" });

    const email = (req.body?.email ?? "").trim().toLowerCase();
    const password = req.body?.password ?? "";
    if (!email || !password) return reply.code(400).send({ message: "email and password are required" });

    const userRes = await pool.query(
      `select id, email, password_hash, auth0_sub
       from users
       where email = $1
       limit 1`,
      [email]
    );
    const user = userRes.rows[0];
    if (!user) return reply.code(401).send({ message: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return reply.code(401).send({ message: "Invalid email or password" });

    const secret = env.JWT_DEV_SECRET ?? process.env.JWT_DEV_SECRET;
    if (!secret) return reply.code(500).send({ message: "JWT_DEV_SECRET is not set" });

    const issuer = env.AUTH_ISSUER ?? "dev";
    const audience = env.AUTH_AUDIENCE ?? "dev";

    // Dev-only token that matches requireJwt() principal extraction logic
    const token = jwt.sign(
      { permissions: ["tenant.read", "tenant.leads.read", "tenant.settings.read", "tenant.settings.write"] },
      secret,
      { subject: user.auth0_sub, issuer, audience, expiresIn: "8h" }
    );

    return {
      token,
      user: { id: user.id, sub: user.auth0_sub, email: user.email },
    };
  });
}
