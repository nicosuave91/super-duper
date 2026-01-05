<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="p-6 space-y-4">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-lg font-semibold text-text-strong">{{ title }}</div>
        <div v-if="description" class="mt-1 text-sm text-text-muted">{{ description }}</div>
      </div>

      <div class="shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <div class="rounded-2xl border border-border-subtle bg-surface">
      <slot />
    </div>
  </div>
</template>
