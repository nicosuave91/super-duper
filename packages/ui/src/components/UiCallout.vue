<script setup lang="ts">
import { computed } from "vue";

type Variant = "info" | "success" | "warning" | "danger";

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    title?: string;
  }>(),
  {
    variant: "info",
    title: "",
  }
);

const styles: Record<Variant, { wrap: string }> = {
  info: { wrap: "bg-info-bg text-info" },
  success: { wrap: "bg-success-bg text-success" },
  warning: { wrap: "bg-warning-bg text-warning" },
  danger: { wrap: "bg-danger-bg text-danger" },
};

const wrapClass = computed(() => {
  return [
    "rounded-2xl border border-border-subtle p-4",
    styles[props.variant].wrap,
  ].join(" ");
});
</script>

<template>
  <div :class="wrapClass">
    <div v-if="title" class="mb-1 text-sm font-semibold">
      {{ title }}
    </div>
    <div class="text-sm text-text-default">
      <slot />
    </div>
  </div>
</template>
