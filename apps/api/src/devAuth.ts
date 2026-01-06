import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { parseOrThrow } from "./validation";
import { loadCoreEnv } from "./env";

const DevTokenBody = z.object({
  sub: z.string().min(1),
  permissions: z.array(z.string()).optional(),
});

export async function registerDevAuthRoutes(app: FastifyInstance) {
  app.post(
    "/dev/token",
    {
      config: {
        rateLimit: { max: 60, timeWindow: "1 minute" },
      },
    },
    async (req, reply) => {
      const env = loadCoreEnv();
      const isProd = (env.NODE_ENV ?? "development") === "production" || env.APP_ENV === "production";
      if (isProd) return reply.code(404).send({ message: "Not Found" });

      const body = parseOrThrow(DevTokenBody, req.body, { where: "body", route: "/dev/token" });

      const secret = env.JWT_DEV_SECRET ?? process.env.JWT_DEV_SECRET;
      if (!secret) return reply.code(500).send({ message: "JWT_DEV_SECRET is not set" });

      const issuer = env.AUTH_ISSUER ?? "dev";
      const audience = env.AUTH_AUDIENCE ?? "dev";

      const token = jwt.sign(
        { permissions: body.permissions ?? [] },
        secret,
        { subject: body.sub, issuer, audience, expiresIn: "8h" }
      );

      return { token };
    }
  );
}
