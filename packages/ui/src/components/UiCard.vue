<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    padded?: boolean;
  }>(),
  { padded: true }
);
</script>

<template>
  <div class="rounded-2xl border border-border-subtle bg-surface">
    <div :class="padded ? 'p-6' : ''">
      <slot />
    </div>
  </div>
</template>
