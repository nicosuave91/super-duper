import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { loadCoreEnv } from "./env";

type DevTokenBody = {
  sub: string;
  permissions?: string[];
};

export async function registerDevAuthRoutes(app: FastifyInstance) {
  app.post<{ Body: DevTokenBody }>("/dev/token", async (req, reply) => {
    const env = loadCoreEnv();

    const isProd =
      (env.NODE_ENV ?? "development") === "production" || env.APP_ENV === "production";
    if (isProd) {
      return reply.code(404).send({ message: "Not Found" });
    }

    const secret = env.JWT_DEV_SECRET ?? process.env.JWT_DEV_SECRET;
    if (!secret) {
      return reply.code(500).send({ message: "JWT_DEV_SECRET is not set" });
    }

    const sub = String(req.body?.sub ?? "").trim();
    if (!sub) return reply.code(400).send({ message: "sub is required" });

    const permissions = Array.isArray(req.body?.permissions) ? req.body!.permissions! : [];

    const issuer = env.AUTH_ISSUER ?? "dev";
    const audience = env.AUTH_AUDIENCE ?? "dev";

    const token = jwt.sign(
      { permissions },
      secret,
      { subject: sub, issuer, audience, expiresIn: "8h" }
    );

    return { token };
  });
}
