import { defineStore } from "pinia";
import { apiFetch } from "@/lib/api";

const LS_TOKEN_KEY = "auth_token";
const LS_DEV_TOKEN_KEY = "dev_jwt";

type DevTokenResponse =
  | { token: string }
  | { access_token: string }
  | { jwt: string };

function extractToken(r: DevTokenResponse): string {
  const t = (r as any)?.token ?? (r as any)?.access_token ?? (r as any)?.jwt;
  if (typeof t === "string" && t.trim()) return t.trim();
  throw new Error("Invalid token response");
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: (localStorage.getItem(LS_TOKEN_KEY) ?? "").trim() || (null as string | null),
    loading: false,
    lastError: null as string | null,
    permissions: [] as string[],
  }),

  getters: {
    isAuthed: (s) => Boolean(s.token),
    authed(): boolean {
      return this.isAuthed;
    },
  },

  actions: {
    /* -----------------------------
       Token handling
    ------------------------------ */
    setToken(token: string | null) {
      const clean = (token ?? "").trim();
      this.token = clean || null;

      if (this.token) {
        localStorage.setItem(LS_TOKEN_KEY, this.token);
        localStorage.setItem(LS_DEV_TOKEN_KEY, this.token);
      } else {
        localStorage.removeItem(LS_TOKEN_KEY);
        localStorage.removeItem(LS_DEV_TOKEN_KEY);
      }
    },

    /* -----------------------------
       DEV login (existing)
    ------------------------------ */
    async login(): Promise<boolean> {
      if (this.loading) return false;
      this.loading = true;
      this.lastError = null;

      try {
        const resp = await apiFetch<any>("/dev/token", {
          method: "POST",
          body: JSON.stringify({}),
        });

        const token =
          (resp?.token ?? resp?.access_token ?? resp?.jwt ?? "")
            .toString()
            .trim();

        if (!token) throw new Error("Token missing from /dev/token response.");

        this.setToken(token);
        this.permissions = this.permissions ?? [];
        return true;
      } catch (e: any) {
        this.lastError = e?.message ?? "Sign in failed";
        this.setToken(null);
        return false;
      } finally {
        this.loading = false;
      }
    },

    async signInDev(): Promise<boolean> {
      return this.login();
    },

    /* -----------------------------
       REAL login (email/password)
    ------------------------------ */
    async loginWithEmail(email: string, password: string): Promise<boolean> {
      if (this.loading) return false;
      this.loading = true;
      this.lastError = null;

      try {
        const resp = await apiFetch<any>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        const token = (resp?.token ?? "").toString().trim();
        if (!token) throw new Error("Token missing from /auth/login response.");

        this.setToken(token);
        this.permissions = resp?.permissions ?? [];
        return true;
      } catch (e: any) {
        this.lastError = e?.message ?? "Invalid email or password";
        this.setToken(null);
        return false;
      } finally {
        this.loading = false;
      }
    },

    /* -----------------------------
       Logout
    ------------------------------ */
    logout() {
      this.setToken(null);
      this.permissions = [];
      localStorage.removeItem("site_id");
    },
  },
});
