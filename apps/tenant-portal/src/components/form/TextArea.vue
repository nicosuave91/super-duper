<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  label?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

function onInput(ev: Event) {
  emit("update:modelValue", (ev.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <label class="block">
    <div v-if="label" class="mb-1 text-xs font-medium text-text-muted">{{ label }}</div>
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows ?? 4"
      :disabled="disabled"
      class="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-text-default outline-none focus:ring-2"
      :style="{ boxShadow: '0 0 0 0 var(--color-focus-ring)' }"
      @input="onInput"
    />
  </label>
</template>

<style scoped>
textarea:focus {
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}
</style>
