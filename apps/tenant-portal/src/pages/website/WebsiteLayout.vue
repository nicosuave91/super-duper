<script setup lang="ts">
import { computed } from "vue";
import { useRoute, RouterLink } from "vue-router";
import PageShell from "@/components/layout/PageShell.vue";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const auth = useAuthStore();

const showBranding = computed(() => auth.permissions.includes("whitelabel.branding"));

function isActive(path: string) {
  return route.path === path;
}
</script>

<template>
  <PageShell title="Website" description="Manage your website settings and branding.">
    <div class="p-6 space-y-4">
      <div class="flex flex-wrap gap-2">
        <RouterLink
          to="/portal/website/settings"
          class="rounded-xl px-3 py-2 text-sm font-medium"
          :class="isActive('/portal/website/settings') ? 'text-white' : 'text-text-default hover:bg-surface-alt'"
          :style="isActive('/portal/website/settings') ? { background: 'var(--color-brand-primary)' } : undefined"
        >
          Settings
        </RouterLink>

        <RouterLink
          v-if="showBranding"
          to="/portal/website/branding"
          class="rounded-xl px-3 py-2 text-sm font-medium"
          :class="isActive('/portal/website/branding') ? 'text-white' : 'text-text-default hover:bg-surface-alt'"
          :style="isActive('/portal/website/branding') ? { background: 'var(--color-brand-primary)' } : undefined"
        >
          Branding
        </RouterLink>
      </div>

      <div class="rounded-2xl border border-border-subtle bg-surface">
        <router-view />
      </div>
    </div>
  </PageShell>
</template>
