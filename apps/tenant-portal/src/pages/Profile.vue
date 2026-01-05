<script setup lang="ts">
import PageShell from "@/components/layout/PageShell.vue";
import { useAuthStore } from "@/stores/auth";
import { UiCard } from "@superapp/ui";
import { User as UserIcon } from "lucide-vue-next";

const auth = useAuthStore();
const u: any = (auth as any).user ?? {};
</script>

<template>
  <PageShell title="Profile" description="Your account details and preferences.">
    <div class="p-6 max-w-2xl space-y-4">
      <UiCard>
        <div class="flex items-start gap-4">
          <div class="h-12 w-12 rounded-2xl border border-border-subtle bg-surface-alt grid place-items-center">
            <UserIcon class="h-5 w-5 text-text-muted" />
          </div>

          <div class="min-w-0">
            <div class="text-sm font-semibold text-text-default">
              {{ u?.name ?? "Account" }}
            </div>
            <div class="text-sm text-text-muted">
              {{ u?.email ?? "—" }}
            </div>
          </div>
        </div>

        <div class="mt-4 text-sm text-text-muted">
          Profile management can be expanded later (photo upload, preferences, notification settings, etc.).
        </div>
      </UiCard>
    </div>
  </PageShell>
</template>
