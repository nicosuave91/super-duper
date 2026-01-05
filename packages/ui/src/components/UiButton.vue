<script setup lang="ts">
import { computed } from "vue";

type Variant = "primary" | "secondary" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    block?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }>(),
  {
    variant: "primary",
    size: "md",
    block: false,
    disabled: false,
    type: "button",
  }
);

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 " +
  "disabled:opacity-60 disabled:pointer-events-none";

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-primary text-white hover:bg-brand-primary-hover active:bg-brand-primary-pressed",
  secondary:
    "bg-surface-alt text-text-strong hover:bg-brand-primary-soft active:bg-brand-primary-soft",
  outline:
    "bg-surface text-text-default border border-border-subtle hover:bg-surface-alt active:bg-surface-alt",
  danger: "bg-danger text-white hover:opacity-95 active:opacity-90",
};

const className = computed(() => {
  return [
    base,
    sizes[props.size],
    variants[props.variant],
    props.block ? "w-full" : "",
  ]
    .filter(Boolean)
    .join(" ");
});
</script>

<template>
  <button :type="type" :class="className" :disabled="disabled">
    <slot />
  </button>
</template>
