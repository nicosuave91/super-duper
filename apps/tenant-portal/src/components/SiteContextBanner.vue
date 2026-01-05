<script setup lang="ts">
import { computed, ref } from "vue";
import { useTenantStore } from "@/stores/tenant";
import { useThemeStore } from "@/stores/theme";
import { UiButton, UiCallout } from "@superapp/ui";

const tenant = useTenantStore();
const theme = useThemeStore();

const visible = computed(() => tenant.loaded && !tenant.site_id);

const siteIdInput = ref("");
const isApplying = ref(false);

async function apply() {
  const next = siteIdInput.value.trim();
  if (!next || isApplying.value) return;

  try {
    isApplying.value = true;
    await tenant.setSiteId(next);
    theme.loadForSite(next);
  } finally {
    isApplying.value = false;
  }
}

function dismiss() {
  siteIdInput.value = "";
}
</script>

<template>
  <div v-if="visible" class="mx-auto w-full max-w-6xl px-6 pt-4">
    <UiCallout variant="warning" title="Select a site to continue">
      <div class="text-sm text-text-default">
        This portal needs a site_id to load leads, website settings, and other data.
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <input
          v-model="siteIdInput"
          type="text"
          aria-label="Site ID"
          class="w-full max-w-md rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-text-default outline-none"
          placeholder="Paste site_id"
        />

        <UiButton :disabled="isApplying" variant="primary" @click="apply">Apply</UiButton>
        <UiButton :disabled="isApplying" variant="secondary" @click="dismiss">Clear</UiButton>
      </div>
    </UiCallout>
  </div>
</template>
