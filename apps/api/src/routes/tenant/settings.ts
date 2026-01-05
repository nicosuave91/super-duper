import type { FastifyInstance } from "fastify";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";
import { getTenantMembershipBySub } from "../../membership";
import { pool } from "../../db";
import { AppError } from "../../errors/appError";

function validateHexColor(v: string) {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v);
}

type TenantSettingsRow = {
  tenant_id: string;
  profile: any;
  brand: any;
  updated_at: string;
};

type UpdateBody = {
  profile?: Record<string, unknown>;
  brand?: Record<string, unknown>;
};

function defaultProfile() {
  return {
    display_name: "",
    phone: "",
    email: "",
    agency_name: "",
    agent_bio: "",
    logo_url: null,
  };
}

function defaultBrand() {
  // IMPORTANT: avoid hardcoded hex defaults in the API.
  // null => client falls back to CSS tokens (canonical).
  return {
    primary_color: null,
    accent_color: null,
    cta_label: "Book a call",
    disclosure_text: "",
    calendar_url: null,
  };
}

export async function registerTenantSettingsRoutes(app: FastifyInstance) {
  app.get(
    "/tenant/settings",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.settings.read");
      },
    },
    async (req) => {
      const sub = req.principal!.sub;
      const membership = await getTenantMembershipBySub(sub);
      const tenantId = membership.tenant_id;

      const existing = await pool.query<TenantSettingsRow>(
        `select tenant_id, profile, brand, updated_at
         from tenant_settings
         where tenant_id = $1
         limit 1`,
        [tenantId]
      );
      if (existing.rows[0]) return { settings: existing.rows[0] };

      const profile = defaultProfile();
      const brand = defaultBrand();

      await pool.query(
        `insert into tenant_settings (tenant_id, profile, brand)
         values ($1, $2::jsonb, $3::jsonb)`,
        [tenantId, JSON.stringify(profile), JSON.stringify(brand)]
      );

      const created = await pool.query<TenantSettingsRow>(
        `select tenant_id, profile, brand, updated_at
         from tenant_settings
         where tenant_id = $1
         limit 1`,
        [tenantId]
      );

      return { settings: created.rows[0] };
    }
  );

  app.put<{ Body: UpdateBody }>(
    "/tenant/settings",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.settings.write");
      },
    },
    async (req) => {
      const sub = req.principal!.sub;
      const membership = await getTenantMembershipBySub(sub);
      const tenantId = membership.tenant_id;

      const body = req.body ?? {};
      const errors: { field: string; message: string }[] = [];

      const existing = await pool.query<TenantSettingsRow>(
        `select tenant_id, profile, brand, updated_at
         from tenant_settings
         where tenant_id = $1
         limit 1`,
        [tenantId]
      );

      const current =
        existing.rows[0] ?? {
          tenant_id: tenantId,
          profile: defaultProfile(),
          brand: defaultBrand(),
          updated_at: new Date().toISOString(),
        };

      const profile = { ...(current.profile ?? {}), ...(body.profile ?? {}) };
      const brand = { ...(current.brand ?? {}), ...(body.brand ?? {}) };

      if (brand.primary_color && !validateHexColor(String(brand.primary_color))) {
        errors.push({ field: "brand.primary_color", message: "Invalid color" });
      }
      if (brand.accent_color && !validateHexColor(String(brand.accent_color))) {
        errors.push({ field: "brand.accent_color", message: "Invalid color" });
      }

      if (String(profile.display_name ?? "").length > 80) errors.push({ field: "profile.display_name", message: "Max 80 characters" });
      if (String(profile.agency_name ?? "").length > 120) errors.push({ field: "profile.agency_name", message: "Max 120 characters" });
      if (String(profile.agent_bio ?? "").length > 800) errors.push({ field: "profile.agent_bio", message: "Max 800 characters" });
      if (String(brand.cta_label ?? "").length > 40) errors.push({ field: "brand.cta_label", message: "Max 40 characters" });
      if (String(brand.disclosure_text ?? "").length > 1200) errors.push({ field: "brand.disclosure_text", message: "Max 1200 characters" });

      if (errors.length) return { ok: false, errors };

      await pool.query(
        `insert into tenant_settings (tenant_id, profile, brand)
         values ($1, $2::jsonb, $3::jsonb)
         on conflict (tenant_id)
         do update set profile = excluded.profile, brand = excluded.brand, updated_at = now()`,
        [tenantId, JSON.stringify(profile), JSON.stringify(brand)]
      );

      const updated = await pool.query<TenantSettingsRow>(
        `select tenant_id, profile, brand, updated_at
         from tenant_settings
         where tenant_id = $1
         limit 1`,
        [tenantId]
      );

      if (!updated.rows[0]) throw new AppError(500, "error", "Failed to load updated settings");

      return { ok: true, settings: updated.rows[0] };
    }
  );
}
