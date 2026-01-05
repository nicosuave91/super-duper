import { defineStore } from "pinia";
import { computed, ref } from "vue";

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

function readCssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const DEFAULT_THEME: ThemeConfig = {
  tenantName: "Tenant Portal",
  logoUrl: null,
  colors: {
    // Canonical defaults come from CSS variables (tokens).
    // Fallbacks keep app safe before CSS loads.
    primary: readCssVar("--color-brand-primary", "#0059C1"),
    accent: readCssVar("--color-brand-accent", "#663399"),
    neutral: readCssVar("--color-brand-neutral", "#64748B"),
  },
};

export const useThemeStore = defineStore("theme", () => {
  const theme = ref<ThemeConfig>({ ...DEFAULT_THEME });

  const cssVars = computed(() => ({
    "--color-brand-primary": theme.value.colors.primary,
    "--color-brand-accent": theme.value.colors.accent,
    "--color-brand-neutral": theme.value.colors.neutral,
  }));

  function applyToDocument() {
    const vars = cssVars.value;
    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(k, v);
    }
  }

  function setTheme(next: Partial<ThemeConfig>) {
    theme.value = {
      ...theme.value,
      ...next,
      colors: {
        ...theme.value.colors,
        ...(next.colors ?? {}),
      },
    };
    applyToDocument();
  }

  function resetTheme() {
    theme.value = { ...DEFAULT_THEME, colors: { ...DEFAULT_THEME.colors } };
    applyToDocument();
  }

  return {
    theme,
    cssVars,
    setTheme,
    resetTheme,
    applyToDocument,
  };
});
