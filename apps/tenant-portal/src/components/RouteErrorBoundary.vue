<script setup lang="ts">
import { ref, onErrorCaptured } from "vue";

const err = ref<Error | null>(null);

onErrorCaptured((e: unknown) => {
  err.value = e instanceof Error ? e : new Error(String(e));
  // Return false so the error doesn't propagate further (keeps UI stable)
  return false;
});

function reset() {
  err.value = null;
}
</script>

<template>
  <div v-if="err" class="p-6">
    <div class="rounded-2xl border border-border-subtle bg-surface p-6">
      <div class="text-sm font-semibold text-text-default">This page crashed while rendering</div>
      <div class="mt-2 text-sm text-text-muted">{{ err.message }}</div>

      <details class="mt-4">
        <summary class="cursor-pointer text-sm text-text-muted hover:text-text-default">
          Show stack trace
        </summary>
        <pre class="mt-2 rounded-xl border border-border-subtle bg-surface-alt p-3 text-xs overflow-auto">{{ err.stack }}</pre>
      </details>

      <button
        type="button"
        class="mt-4 rounded-xl border border-border-subtle bg-surface-alt px-3 py-2 text-sm font-medium hover:bg-surface"
        @click="reset"
      >
        Dismiss
      </button>
    </div>
  </div>

  <slot v-else />
</template>
