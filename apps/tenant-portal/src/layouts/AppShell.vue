<script setup lang="ts">
import { computed } from "vue";
import SiteContextBanner from "@/components/SiteContextBanner.vue";
import LeftNav from "@/components/LeftNav.vue";
import DevDebugPanel from "@/components/DevDebugPanel.vue";
import { useThemeStore } from "@/stores/theme";
import { RouterView } from "vue-router";
import RouteErrorBoundary from "@/components/RouteErrorBoundary.vue";


const theme = useThemeStore();
const brandName = computed(() => theme.theme.tenantName);
</script>

<template>
  <div class="min-h-screen w-full bg-surface-alt text-text-default">
    <div class="flex min-h-screen w-full">
      <LeftNav />

      <!-- Main column -->
      <div class="flex min-h-screen flex-1 flex-col">
        <!-- Optional header (brandName currently unused otherwise) -->
        <header class="px-6 pt-6">
          <div v-if="brandName" class="text-sm font-semibold text-text-strong">
            {{ brandName }}
          </div>
        </header>

        <div class="px-6 pt-3">
          <SiteContextBanner />
        </div>

        <main class="flex-1 px-6 py-6">
          <div class="mx-auto w-full max-w-6xl">
            <RouterView v-slot="{ Component, route }">
  <Suspense>
    <template #default>
      <RouteErrorBoundary>
        <component :is="Component" :key="route.fullPath" />
      </RouteErrorBoundary>
    </template>

    <template #fallback>
      <div class="p-6">
        <div class="rounded-2xl border border-border-subtle bg-surface p-6">
          <div class="text-sm font-semibold text-text-default">Loading…</div>
          <div class="mt-2 text-sm text-text-muted">Rendering page…</div>
        </div>
      </div>
    </template>
  </Suspense>
</RouterView>

          </div>
        </main>
      </div>
    </div>

    <DevDebugPanel />
  </div>
</template>
