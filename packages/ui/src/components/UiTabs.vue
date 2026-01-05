<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  modelValue: string;
  tabs: { key: string; label: string; disabled?: boolean }[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const baseBtn =
  "px-3 py-2 text-sm rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2";

function isActive(k: string) {
  return props.modelValue === k;
}

const wrapClass = computed(() => "flex flex-wrap gap-2");
</script>

<template>
  <div :class="wrapClass">
    <button
      v-for="t in tabs"
      :key="t.key"
      type="button"
      :disabled="t.disabled"
      :class="[
        baseBtn,
        isActive(t.key)
          ? 'bg-brand-primary-soft border-border-subtle text-text-strong'
          : 'bg-surface border-border-subtle text-text-muted hover:bg-surface-alt',
        t.disabled ? 'opacity-60 pointer-events-none' : '',
      ]"
      @click="emit('update:modelValue', t.key)"
    >
      {{ t.label }}
    </button>
  </div>
</template>

