import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../../db";
import { requireJwt, requirePermission } from "../../auth/epic2Auth";
import { getTenantMembershipBySub } from "../../membership";
import { parseOrThrow } from "../../validation";
import { AppError } from "../../errors/appError";

const UpdateBody = z.object({
  profile: z.record(z.unknown()).optional(),
  brand: z.record(z.unknown()).optional(),
});

function validateHexColor(v: string) {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v);
}

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
  return {
    primary_color: null, // null => use CSS tokens
    accent_color: null,  // null => use CSS tokens
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
    async (req, reply) => {
      const sub = req.principal!.sub;
      const membership = await getTenantMembershipBySub(sub);

      const existing = await pool.query(
        `select tenant_id, profile, brand, updated_at
         from tenant_settings
         where tenant_id = $1
         limit 1`,
        [membership.tenant_id]
      );

      if (existing.rows[0]) return reply.send({ settings: existing.rows[0] });

      await pool.query(
        `insert into tenant_settings (tenant_id, profile, brand)
         values ($1, $2::jsonb, $3::jsonb)`,
        [membership.tenant_id, JSON.stringify(defaultProfile()), JSON.stringify(defaultBrand())]
      );

      const created = await pool.query(
        `select tenant_id, profile, brand, updated_at
         from tenant_settings
         where tenant_id = $1
         limit 1`,
        [membership.tenant_id]
      );

      return reply.send({ settings: created.rows[0] });
    }
  );

  app.put(
    "/tenant/settings",
    {
      preHandler: async (req) => {
        await requireJwt(req);
        requirePermission(req, "tenant.settings.write");
      },
    },
    async (req, reply) => {
      const sub = req.principal!.sub;
      const membership = await getTenantMembershipBySub(sub);

      const body = parseOrThrow(UpdateBody, req.body, { where: "body", route: "/tenant/settings" });

      const existing = await pool.query(
        `select tenant_id, profile, brand
         from tenant_settings
         where tenant_id = $1
         limit 1`,
        [membership.tenant_id]
      );

      const current = existing.rows[0] ?? {
        tenant_id: membership.tenant_id,
        profile: defaultProfile(),
        brand: defaultBrand(),
      };

      const profile = { ...(current.profile ?? {}), ...(body.profile ?? {}) };
      const brand = { ...(current.brand ?? {}), ...(body.brand ?? {}) };

      // Validation (API-level)
      const errors: { field: string; message: string }[] = [];

      if (brand.primary_color && !validateHexColor(String(brand.primary_color))) errors.push({ field: "brand.primary_color", message: "Invalid color" });
      if (brand.accent_color && !validateHexColor(String(brand.accent_color))) errors.push({ field: "brand.accent_color", message: "Invalid color" });

      if (String(profile.display_name ?? "").length > 80) errors.push({ field: "profile.display_name", message: "Max 80 characters" });
      if (String(profile.agency_name ?? "").length > 120) errors.push({ field: "profile.agency_name", message: "Max 120 characters" });
      if (String(profile.agent_bio ?? "").length > 800) errors.push({ field: "profile.agent_bio", message: "Max 800 characters" });
      if (String(brand.cta_label ?? "").length > 40) errors.push({ field: "brand.cta_label", message: "Max 40 characters" });
      if (String(brand.disclosure_text ?? "").length > 1200) errors.push({ field: "brand.disclosure_text", message: "Max 1200 characters" });

      if (errors.length) {
        throw new AppError(400, "validation.invalid", "Invalid request", { errors });
      }

      await pool.query(
        `insert into tenant_settings (tenant_id, profile, brand)
         values ($1, $2::jsonb, $3::jsonb)
         on conflict (tenant_id)
         do update set profile = excluded.profile, brand = excluded.brand, updated_at = now()`,
        [membership.tenant_id, JSON.stringify(profile), JSON.stringify(brand)]
      );

      const updated = await pool.query(
        `select tenant_id, profile, brand, updated_at
         from tenant_settings
         where tenant_id = $1
         limit 1`,
        [membership.tenant_id]
      );

      return reply.send({ ok: true, settings: updated.rows[0] });
    }
  );
}
