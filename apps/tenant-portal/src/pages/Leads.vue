<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import LeadsListPage from "@/pages/leads/LeadsListPage.vue";

const route = useRoute();
const debugPath = computed(() => route.fullPath);
</script>

<template>
  <!-- This wrapper ensures the route visibly changes even if the list fails -->
  <div class="p-6">
    <div class="text-xs text-text-muted mb-2">
      Route: {{ debugPath }}
    </div>

    <Suspense>
      <template #default>
        <LeadsListPage />
      </template>

      <!-- If the child is pending (or fails to resolve), user sees feedback -->
      <template #fallback>
        <div class="rounded-2xl border border-border-subtle bg-surface p-6">
          <div class="text-sm font-semibold text-text-default">Leads</div>
          <div class="mt-2 text-sm text-text-muted">Loading leads…</div>
        </div>
      </template>
    </Suspense>
  </div>
</template>
