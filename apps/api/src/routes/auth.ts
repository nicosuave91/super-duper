import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../db";
import { signAppToken } from "../auth/jwt";

type LoginBody = { email: string; password: string };

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post<{ Body: LoginBody }>("/auth/login", async (req, reply) => {
    const email = (req.body?.email ?? "").trim().toLowerCase();
    const password = req.body?.password ?? "";

    if (!email || !password) {
      return reply.code(400).send({ message: "email and password are required" });
    }

    const { rows } = await pool.query(
      `select id, auth0_sub, email, password_hash
       from users
       where lower(email) = lower($1)
       limit 1`,
      [email]
    );

    const user = rows[0];
    if (!user?.password_hash) {
      return reply.code(401).send({ message: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return reply.code(401).send({ message: "Invalid email or password" });

    const token = signAppToken({
      sub: user.auth0_sub,
      permissions: ["tenant.read", "tenant.leads.read"],
    });

    return {
      token,
      user: { id: user.id, sub: user.auth0_sub, email: user.email },
    };
  });
}
