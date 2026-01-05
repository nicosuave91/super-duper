<script setup lang="ts">
import { computed } from "vue";

type Variant = "neutral" | "success" | "warning" | "danger" | "info";

const props = withDefaults(
  defineProps<{
    variant?: Variant;
  }>(),
  { variant: "neutral" }
);

const base =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

const variants: Record<Variant, string> = {
  neutral: "bg-surface-alt text-text-muted border border-border-subtle",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
};

const className = computed(() => [base, variants[props.variant]].join(" "));
</script>

<template>
  <span :class="className">
    <slot />
  </span>
</template>
