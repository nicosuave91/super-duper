import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useTenantStore } from "@/stores/tenant";

export type ThemeColors = {
  primary: string;
  accent: string;
  neutral: string;
};

export type ThemeConfig = {
  tenantName: string;
  logoUrl: string | null;
  colors: ThemeColors;
};

const DEFAULT_THEME: ThemeConfig = {
  tenantName: "Tenant Portal",
  logoUrl: null,
colors: {
  primary: "#0059C1",
  accent: "#663399",
  neutral: "#64748B",
},

};

function lsKey(site_id: string) {
  return `tenant_theme:${site_id}`;
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isHexColor(v: unknown) {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

function sanitizeTheme(input: ThemeConfig | null, fallback: ThemeConfig): ThemeConfig {
  if (!input) return fallback;

  const tenantName =
    typeof input.tenantName === "string" && input.tenantName.trim()
      ? input.tenantName.trim()
      : fallback.tenantName;

  const logoUrl = typeof input.logoUrl === "string" && input.logoUrl.trim() ? input.logoUrl.trim() : null;

  const primary = isHexColor(input.colors?.primary) ? input.colors.primary : fallback.colors.primary;
  const accent = isHexColor(input.colors?.accent) ? input.colors.accent : fallback.colors.accent;
  const neutral = isHexColor(input.colors?.neutral) ? input.colors.neutral : fallback.colors.neutral;

  return { tenantName, logoUrl, colors: { primary, accent, neutral } };
}

/** ---------- Color utils (WCAG contrast + clamping) ---------- */
type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex({ r, g, b }: RGB): string {
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function srgbToLinear(v: number) {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(a: string, b: string): number {
  const L1 = luminance(a);
  const L2 = luminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function mix(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t);
  return rgbToHex({ r: lerp(a.r, b.r), g: lerp(a.g, b.g), b: lerp(a.b, b.b) });
}

/**
 * Guardrail: ensure brand primary is not "too close to white"
 * so primary buttons stay visible against white surfaces.
 *
 * We enforce a minimum contrast vs white background.
 * 3:1 is a practical minimum for large UI surfaces like buttons.
 */
function clampPrimaryForUi(primary: string): string {
  const WHITE = "#ffffff";
  const MIN = 3.0;

  if (contrastRatio(primary, WHITE) >= MIN) return primary;

  // Darken towards black until it meets contrast threshold
  const BLACK = "#000000";
  let t = 0.0;
  let cur = primary;

  // 24 steps is plenty; guarantees termination
  for (let i = 0; i < 24; i++) {
    t += 0.05; // gradually mix in black
    cur = mix(primary, BLACK, Math.min(t, 1));
    if (contrastRatio(cur, WHITE) >= MIN) return cur;
  }

  // If somehow still insufficient, fall back to default
  return DEFAULT_THEME.colors.primary;
}

/**
 * Compute readable text color on top of the primary background.
 * We choose white or near-black for best contrast.
 */
function onBrandText(primary: string): string {
  const WHITE = "#ffffff";
  const BLACK = "#0b0f19"; // softer than pure black
  const cWhite = contrastRatio(primary, WHITE);
  const cBlack = contrastRatio(primary, BLACK);
  return cWhite >= cBlack ? WHITE : BLACK;
}

function applyCssVars(theme: ThemeConfig) {
  const root = document.documentElement;

  // ✅ Guardrail brand primary so buttons never disappear
  const primaryUi = clampPrimaryForUi(theme.colors.primary);
  const onPrimary = onBrandText(primaryUi);

  root.style.setProperty("--color-brand-primary", primaryUi);
  root.style.setProperty("--color-brand-accent", theme.colors.accent);
  root.style.setProperty("--color-brand-neutral", theme.colors.neutral);

  // Semantic token for text on primary surfaces (this is the key long-term)
  root.style.setProperty("--color-on-brand-primary", onPrimary);

  // Derived helpers based on the *UI-safe* primary
  root.style.setProperty("--color-brand-primary-soft", `color-mix(in srgb, ${primaryUi} 12%, white)`);
  root.style.setProperty("--color-brand-primary-hover", `color-mix(in srgb, ${primaryUi} 88%, black)`);
  root.style.setProperty("--color-brand-primary-pressed", `color-mix(in srgb, ${primaryUi} 78%, black)`);
  root.style.setProperty("--color-focus-ring", `color-mix(in srgb, ${primaryUi} 55%, white)`);

  // Back-compat aliases (in case some tokens use these)
  root.style.setProperty("--brand-primary", primaryUi);
  root.style.setProperty("--brand-accent", theme.colors.accent);
  root.style.setProperty("--brand-neutral", theme.colors.neutral);
  root.style.setProperty("--on-brand-primary", onPrimary);
  root.style.setProperty("--brand-primary-hover", `color-mix(in srgb, ${primaryUi} 88%, black)`);
  root.style.setProperty("--brand-primary-pressed", `color-mix(in srgb, ${primaryUi} 78%, black)`);
}

export const useThemeStore = defineStore("theme", () => {
  const tenant = useTenantStore();
  const activeSiteId = computed(() => tenant.site_id);

  const theme = ref<ThemeConfig>(DEFAULT_THEME);

  // ✅ Always apply defaults immediately so pre-auth screens are safe
  function init() {
    applyCssVars(theme.value);
    if (activeSiteId.value) loadForSite(activeSiteId.value);
  }

  function loadForSite(site_id: string | null) {
    if (!site_id) {
      theme.value = DEFAULT_THEME;
      applyCssVars(theme.value);
      return;
    }

    const saved = safeParse<ThemeConfig>(localStorage.getItem(lsKey(site_id)));
    const merged = sanitizeTheme(saved, DEFAULT_THEME);

    const siteName = tenant.tenantMe?.site_name?.trim();
    if (siteName && (!saved?.tenantName || saved.tenantName === DEFAULT_THEME.tenantName)) {
      merged.tenantName = siteName;
    }

    theme.value = merged;
    applyCssVars(theme.value);
  }

  function saveForSite(site_id: string | null, next: ThemeConfig) {
    const id = site_id ?? activeSiteId.value;
    if (!id) return;

    const clean = sanitizeTheme(next, DEFAULT_THEME);
    localStorage.setItem(lsKey(id), JSON.stringify(clean));
    theme.value = clean;
    applyCssVars(theme.value);
  }

  function resetForSite(site_id: string | null) {
    const id = site_id ?? activeSiteId.value;
    if (!id) return;

    localStorage.removeItem(lsKey(id));
    loadForSite(id);
  }

  return { theme, init, loadForSite, saveForSite, resetForSite };
});
