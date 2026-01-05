import jwt from "jsonwebtoken";

export type Claims = {
  sub: string;
  permissions: string[];
};

function meta() {
  return {
    issuer: process.env.AUTH_ISSUER ?? "superapp",
    audience: process.env.AUTH_AUDIENCE ?? "tenant-portal",
  };
}

export function signAppToken(params: { sub: string; permissions?: string[] }) {
  const secret = process.env.JWT_APP_SECRET;
  if (!secret) throw new Error("JWT_APP_SECRET is not set");

  const { issuer, audience } = meta();

  return jwt.sign(
    { permissions: params.permissions ?? [] },
    secret,
    { subject: params.sub, issuer, audience, expiresIn: "8h" }
  );
}

export function verifyTokenAnyEnv(token: string): Claims {
  const { issuer, audience } = meta();

  const isProd = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
  const appSecret = process.env.JWT_APP_SECRET;

  const tryVerify = (secret?: string) => {
    if (!secret) return null;
    try {
      const decoded = jwt.verify(token, secret, { issuer, audience }) as any;
      const sub = decoded?.sub;
      const permissions = Array.isArray(decoded?.permissions) ? decoded.permissions : [];
      return { sub, permissions } as Claims;
    } catch {
      return null;
    }
  };

  // Prefer app secret
  const appClaims = tryVerify(appSecret);
  if (appClaims?.sub) return appClaims;

  // Dev secret allowed in non-prod (so /dev/token works)
  if (!isProd) {
    const devSecret = process.env.JWT_DEV_SECRET;
    const devClaims = tryVerify(devSecret);
    if (devClaims?.sub) return devClaims;
  }

  throw new Error("Invalid token");
}
