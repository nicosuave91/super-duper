import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";

type DevTokenBody = {
  sub: string;
  permissions?: string[];
};

export async function registerDevAuthRoutes(app: FastifyInstance) {
  app.post<{ Body: DevTokenBody }>("/dev/token", async (req, reply) => {
    // Only allow in non-production
    const isProd = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
    if (isProd) {
      return reply.code(404).send({ message: "Not Found" });
    }

    const secret = process.env.JWT_DEV_SECRET;
    if (!secret) {
      return reply.code(500).send({ message: "JWT_DEV_SECRET is not set" });
    }

    const { sub, permissions = [] } = req.body ?? ({} as DevTokenBody);
    if (!sub) return reply.code(400).send({ message: "sub is required" });

    const issuer = process.env.AUTH_ISSUER ?? "dev";
    const audience = process.env.AUTH_AUDIENCE ?? "dev";

    const token = jwt.sign(
      { permissions },
      secret,
      { subject: sub, issuer, audience, expiresIn: "8h" }
    );

    return { token };
  });
}
