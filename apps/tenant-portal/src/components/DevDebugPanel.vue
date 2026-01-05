<script setup lang="ts">
const isDev = import.meta.env.DEV;
</script>

<template>
  <div v-if="isDev" class="fixed bottom-3 right-3 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs text-text-muted shadow">
    dev
  </div>
</template>
