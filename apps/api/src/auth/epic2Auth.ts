import type { FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import crypto from "crypto";

import { loadCoreEnv } from "../env";
import { AppError } from "../errors/appError";

export type Principal = {
  sub: string;
  permissions: string[];
};

export function getRequestId(req: FastifyRequest): string {
  const header = req.headers["x-request-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  return (req as any).request_id ?? "unknown";
}

export async function requestId(req: FastifyRequest, reply: FastifyReply) {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming.trim()
      ? incoming.trim()
      : crypto.randomUUID();

  (req as any).request_id = id;
  reply.header("x-request-id", id);
}

function extractPermissions(payload: any): string[] {
  const p = payload?.permissions;
  if (Array.isArray(p)) return p.map(String);
  return [];
}

export function requirePermission(req: FastifyRequest, permission: string) {
  const principal = (req as any).principal as Principal | undefined;
  if (!principal) throw new AppError(401, "auth.unauthorized", "Unauthorized");
  if (!principal.permissions.includes(permission)) {
    throw new AppError(403, "auth.forbidden", "Forbidden", { permission });
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

  // Dev-only HS256 support (so /dev/token works without JWKS)
  if (!isProd) {
    try {
      const header = decodeProtectedHeader(token);
      const alg = String(header?.alg ?? "");
      if (alg.startsWith("HS")) {
        const secret = env.JWT_DEV_SECRET ?? process.env.JWT_DEV_SECRET;
        if (!secret) {
          throw new AppError(
            500,
            "env.missing",
            "JWT_DEV_SECRET is required to verify HS* tokens in development"
          );
        }

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
      throw new AppError(401, "auth.invalid_token", "Invalid or expired token", {
        message: e?.message,
      });
    }
  }

  // Production/default path: RS256 via Auth0 JWKS
  if (!env.AUTH_JWKS_URL || !env.AUTH_ISSUER || !env.AUTH_AUDIENCE) {
    throw new AppError(
      500,
      "env.missing",
      "AUTH_JWKS_URL/AUTH_ISSUER/AUTH_AUDIENCE must be set for JWKS verification"
    );
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
    if (e instanceof AppError) throw e;
    throw new AppError(401, "auth.invalid_token", "Invalid or expired token", {
      message: e?.message,
    });
  }
}
