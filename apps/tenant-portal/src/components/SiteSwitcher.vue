<script setup lang="ts">
import { computed } from "vue";
import { useSiteStore } from "@/stores/site";
import { useTenantStore } from "@/stores/tenant";

const site = useSiteStore();
const tenant = useTenantStore();

const activeLabel = computed(() => {
  const active = site.sites.find((s) => s.site_id === site.activeSiteId);
  return active?.site_name ?? active?.slug ?? active?.site_id ?? "Select a site";
});

async function onChange(e: Event) {
  const site_id = (e.target as HTMLSelectElement).value;
  site.setActiveSite(site_id);
  await tenant.loadTenantMe(site_id);
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-xs font-medium text-text-muted">Site</span>

    <select
      class="h-9 max-w-[320px] rounded-xl border border-border-subtle bg-surface px-3 text-sm text-text-default transition-colors hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
      :value="site.activeSiteId"
      @change="onChange"
      :disabled="!site.sites.length"
      aria-label="Select active site"
    >
      <option v-if="!site.sites.length" value="">
        No sites
      </option>

      <option v-for="s in site.sites" :key="s.site_id" :value="s.site_id">
        {{ s.site_name ?? s.slug ?? s.site_id }}
      </option>
    </select>

    <span class="hidden md:inline text-xs text-text-muted">
      {{ activeLabel }}
    </span>
  </div>
</template>
