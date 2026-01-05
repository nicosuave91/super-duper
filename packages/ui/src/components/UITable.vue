<script setup lang="ts">
withDefaults(
  defineProps<{
    dense?: boolean;
  }>(),
  {
    dense: false,
  }
);
</script>

<template>
  <div class="w-full overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
    <table class="w-full text-sm">
      <thead class="border-b border-border-subtle text-text-muted">
        <slot name="head" />
      </thead>

      <tbody class="text-text-default">
        <slot />
      </tbody>
    </table>

    <div v-if="$slots.footer" class="border-t border-border-subtle">
      <slot name="footer" />
    </div>
  </div>
</template>
