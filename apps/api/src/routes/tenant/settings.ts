import type { Request, Response } from "express";

type Db = {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
};

function validateHexColor(v: string) {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v);
}

export function registerTenantSettingsRoutes(app: any, db: Db) {
  app.get("/tenant/settings", async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) return res.status(401).json({ request_id: (req as any).request_id, error_code: "auth.unauthorized", message: "Unauthorized", details: null });

    const existing = await db.query(`select * from tenant_settings where tenant_id = $1`, [tenantId]);
    if (existing.rows[0]) return res.json({ settings: existing.rows[0] });

    const defaults = {
      tenant_id: tenantId,
      profile: {
        display_name: "",
        phone: "",
        email: "",
        agency_name: "",
        agent_bio: "",
        logo_url: null,
      },
      brand: {
        primary_color: "#0059C1",
accent_color: "#663399",

        cta_label: "Book a call",
        disclosure_text: "",
        calendar_url: null,
      },
      updated_at: new Date().toISOString(),
    };

    await db.query(
      `insert into tenant_settings (tenant_id, profile, brand) values ($1, $2::jsonb, $3::jsonb)`,
      [tenantId, JSON.stringify(defaults.profile), JSON.stringify(defaults.brand)]
    );

    const created = await db.query(`select * from tenant_settings where tenant_id = $1`, [tenantId]);
    res.json({ settings: created.rows[0] });
  });

  app.put("/tenant/settings", async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) return res.status(401).json({ request_id: (req as any).request_id, error_code: "auth.unauthorized", message: "Unauthorized", details: null });

    const body = req.body ?? {};
    const errors: { field: string; message: string }[] = [];

    const existing = await db.query(`select * from tenant_settings where tenant_id = $1`, [tenantId]);
    const current = existing.rows[0];

    const profile = { ...(current?.profile ?? {}), ...(body.profile ?? {}) };
    const brand = { ...(current?.brand ?? {}), ...(body.brand ?? {}) };

    if (brand.primary_color && !validateHexColor(String(brand.primary_color))) errors.push({ field: "brand.primary_color", message: "Invalid color" });
    if (brand.accent_color && !validateHexColor(String(brand.accent_color))) errors.push({ field: "brand.accent_color", message: "Invalid color" });

    if (String(profile.display_name ?? "").length > 80) errors.push({ field: "profile.display_name", message: "Max 80 characters" });
    if (String(profile.agency_name ?? "").length > 120) errors.push({ field: "profile.agency_name", message: "Max 120 characters" });
    if (String(profile.agent_bio ?? "").length > 800) errors.push({ field: "profile.agent_bio", message: "Max 800 characters" });
    if (String(brand.cta_label ?? "").length > 40) errors.push({ field: "brand.cta_label", message: "Max 40 characters" });
    if (String(brand.disclosure_text ?? "").length > 1200) errors.push({ field: "brand.disclosure_text", message: "Max 1200 characters" });

    if (errors.length) return res.status(200).json({ ok: false, errors });

    await db.query(
      `insert into tenant_settings (tenant_id, profile, brand)
       values ($1, $2::jsonb, $3::jsonb)
       on conflict (tenant_id)
       do update set profile = excluded.profile, brand = excluded.brand, updated_at = now()`,
      [tenantId, JSON.stringify(profile), JSON.stringify(brand)]
    );

    const updated = await db.query(`select * from tenant_settings where tenant_id = $1`, [tenantId]);
    res.json({ ok: true, settings: updated.rows[0] });
  });
}
