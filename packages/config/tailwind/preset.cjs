module.exports = {
  safelist: [
    // UiButton variants
    "bg-brand-primary",
    "bg-brand-primary-hover",
    "bg-brand-primary-pressed",
    "hover:bg-brand-primary-hover",
    "active:bg-brand-primary-pressed",
    "bg-brand-primary-soft",
    "bg-surface-alt",
    "bg-surface",
    "bg-danger",
    "text-white",
    "text-text-strong",
    "text-text-default",
    "text-text-muted",
    "text-text-disabled",
    "border",
    "border-border",
    "border-border-subtle",
    "hover:bg-surface-alt",
    "hover:bg-brand-primary-soft",
    "hover:opacity-95",
    "active:opacity-90",

    // Focus ring utilities used by UI primitives
    "focus-visible:ring-2",
    "focus-visible:ring-brand-primary",
    "focus-visible:ring-offset-2",
    "focus-visible:ring-offset-surface",

    // UiCallout / UiBadge variant classes
    "bg-info-bg",
    "text-info",
    "bg-success-bg",
    "text-success",
    "bg-warning-bg",
    "text-warning",
    "bg-danger-bg",
    "text-danger",
  ],

  theme: {
    extend: {
      colors: {
        /* Brand (with fallbacks) */
        "brand-primary": "var(--color-brand-primary, #0059C1)",
        "brand-primary-hover": "var(--color-brand-primary-hover, #00418E)",
        "brand-primary-pressed": "var(--color-brand-primary-pressed, #002A5B)",
        "brand-primary-soft": "var(--color-brand-primary-soft, #EAF2FF)",

        "brand-accent": "var(--color-brand-accent, #663399)",
        "brand-accent-soft": "var(--color-brand-accent-soft, #F2EBFA)",

        /* Neutrals (with fallbacks) */
        "text-strong": "var(--color-text-strong, #0A0A0A)",
        "text-default": "var(--color-text-default, #1F1F1F)",
        "text-muted": "var(--color-text-muted, #666666)",
        "text-disabled": "var(--color-text-disabled, #9AA3AF)",

        "border": "var(--color-border, #D0D5DD)",
        "border-subtle": "var(--color-border-subtle, #E6E8EB)",

        surface: "var(--color-surface, #FFFFFF)",
        "surface-alt": "var(--color-surface-alt, #F7F8FA)",

        /* Used for focus ring offset */
        "ring-offset-surface": "var(--color-surface, #FFFFFF)",

        /* Semantic (with fallbacks) */
        success: "var(--color-success, #145523)",
        "success-bg": "var(--color-success-bg, #E9F7EE)",

        warning: "var(--color-warning, #5A3B00)",
        "warning-bg": "var(--color-warning-bg, #FFF4E5)",

        danger: "var(--color-danger, #A02622)",
        "danger-bg": "var(--color-danger-bg, #FDEEEE)",

        info: "var(--color-info, #003A7A)",
        "info-bg": "var(--color-info-bg, #E6F0FF)",
      },
    },
  },

  plugins: [],
};
