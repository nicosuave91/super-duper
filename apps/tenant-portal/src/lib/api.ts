// apps/tenant-portal/src/lib/api.ts

export class ApiError extends Error {
  status: number;
  statusText: string;

  constructor(message: string, opts: { status: number; statusText: string }) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status;
    this.statusText = opts.statusText;
  }
}

export function setDevToken(token: string | null) {
  if (!token) {
    localStorage.removeItem("dev_jwt");
    return;
  }
  localStorage.setItem("dev_jwt", token);
}

function getDevToken(): string | null {
  // Support both keys:
  // - `dev_jwt` (older/dev tooling)
  // - `auth_token` (Pinia auth store)
  const t =
    localStorage.getItem("dev_jwt") ??
    localStorage.getItem("auth_token");

  return t && t.trim() ? t.trim() : null;
}

function resolveUrl(input: string) {
  // Allow configuring API base (recommended), otherwise relative to current origin
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  if (!base) return input;

  // If input is already absolute, use it
  if (/^https?:\/\//i.test(input)) return input;

  return `${base.replace(/\/+$/, "")}/${input.replace(/^\/+/, "")}`;
}

export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const fullUrl = resolveUrl(url);

  const headers = new Headers(init?.headers ?? {});
  headers.set("content-type", headers.get("content-type") ?? "application/json");

  // Attach token if present (works with dev token flow + auth store)
  const token = getDevToken();
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch (e: any) {
    throw new ApiError(
      `Network error calling ${fullUrl}: ${e?.message ?? "Failed to fetch"}`,
      { status: 0, statusText: "NETWORK_ERROR" }
    );
  }

  const text = await res.text();
  const maybeJson = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  })();

  if (!res.ok) {
    const message =
      (maybeJson && (maybeJson.message || maybeJson.error)) ||
      `Request failed (${res.status})`;

    throw new ApiError(message, {
      status: res.status,
      statusText: res.statusText,
    });
  }

  return (maybeJson ?? (text as any)) as T;
}
