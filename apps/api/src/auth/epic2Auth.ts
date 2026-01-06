import type { FastifyReply, FastifyRequest } from "fastify";
import crypto from "crypto";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { loadCoreEnv } from "../env";
import { AppError } from "../errors/appError";

export type Principal = { sub: string; permissions: string[] };

declare module "fastify" {
  interface FastifyRequest {
    principal?: Principal;
    request_id?: string;
  }
}

export function getRequestId(req: FastifyRequest): string {
  const existing = req.headers["x-request-id"];
  const id =
    (typeof existing === "string" && existing.trim()) ||
    (Array.isArray(existing) && existing[0]?.trim()) ||
    (req as any).request_id ||
    crypto.randomUUID();

  (req as any).request_id = id;
  return id;
}

export function requestId(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  const id = getRequestId(req);
  reply.header("x-request-id", id);
  done();
}

function extractPermissions(payload: any): string[] {
  const perms = payload?.permissions ?? payload?.["permissions"];
  return Array.isArray(perms) ? perms.map(String) : [];
}

export function requirePermission(req: FastifyRequest, permission: string) {
  const principal = (req as any).principal as Principal | undefined;
  if (!principal) throw new AppError(401, "auth.unauthorized", "Unauthorized");
  if (!principal.permissions.includes(permission)) {
    throw new AppError(403, "auth.missing_permission", `Missing permission: ${permission}`, {
      required: permission,
      permissions: principal.permissions,
    });
  }
}

export async function requireJwt(req: FastifyRequest): Promise<Principal> {
  const env = loadCoreEnv();
  const isProd =
    (env.NODE_ENV ?? "development") === "production" || env.APP_ENV === "production";

  const auth = req.headers.authorization;
  if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    throw new AppError(401, "auth.missing_token", "Missing Bearer token");
  }

  const token = auth.slice("Bearer ".length).trim();
  if (!token) throw new AppError(401, "auth.missing_token", "Missing Bearer token");

  // Dev-only HS256 verification
  if (!isProd) {
    try {
      const header = decodeProtectedHeader(token);
      const alg = String(header?.alg ?? "");
      if (alg.startsWith("HS")) {
        const secret = env.JWT_DEV_SECRET ?? process.env.JWT_DEV_SECRET;
        if (!secret) throw new AppError(500, "internal.error", "JWT_DEV_SECRET is not set");

        const key = new TextEncoder().encode(secret);
        const { payload } = await jwtVerify(token, key, {
          issuer: env.AUTH_ISSUER ?? "dev",
          audience: env.AUTH_AUDIENCE ?? "dev",
        });

        const principal: Principal = {
          sub: String(payload.sub ?? ""),
          permissions: extractPermissions(payload),
        };

        if (!principal.sub) throw new AppError(401, "auth.invalid_token", "Token missing sub");

        (req as any).principal = principal;
        return principal;
      }
    } catch (e: any) {
      if (e instanceof AppError) throw e;
      throw new AppError(401, "auth.invalid_token", "Invalid or expired token", { message: e?.message });
    }
  }

  // Prod/default: RS256 via JWKS
  if (!env.AUTH_JWKS_URL || !env.AUTH_ISSUER || !env.AUTH_AUDIENCE) {
    throw new AppError(500, "internal.error", "AUTH_JWKS_URL/AUTH_ISSUER/AUTH_AUDIENCE must be set in production");
  }

  const jwks = createRemoteJWKSet(new URL(env.AUTH_JWKS_URL));

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.AUTH_ISSUER,
      audience: env.AUTH_AUDIENCE,
    });

    const principal: Principal = {
      sub: String(payload.sub ?? ""),
      permissions: extractPermissions(payload),
    };

    if (!principal.sub) throw new AppError(401, "auth.invalid_token", "Token missing sub");

    (req as any).principal = principal;
    return principal;
  } catch (e: any) {
    throw new AppError(401, "auth.invalid_token", "Invalid or expired token", { message: e?.message });
  }
}
