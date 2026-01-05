import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyTokenAnyEnv } from "./jwt";

declare module "fastify" {
  interface FastifyRequest {
    auth?: { sub: string; permissions: string[] };
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) return reply.code(401).send({ message: "Missing Bearer token" });

  try {
    const claims = verifyTokenAnyEnv(token);
    req.auth = { sub: claims.sub, permissions: claims.permissions ?? [] };
  } catch (e: any) {
    return reply.code(401).send({ message: e?.message ?? "Invalid token" });
  }
}
