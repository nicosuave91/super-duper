<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { UiBadge, UiCard } from "@superapp/ui";
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import PageShell from "@/components/layout/PageShell.vue";

const auth = useAuthStore();
const router = useRouter();

onMounted(() => {
  if (!auth.isAuthed) {
    router.replace("/signin");
  }
});

type UiUser = { name?: string; email?: string };
type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

const uiUser = computed(() => auth.user as UiUser | null);
const status = computed(() => auth.subscriptionStatus ?? "inactive");

const statusVariant = computed<BadgeVariant>(() => {
  if (status.value === "active") return "success";
  if (status.value === "trialing") return "info";
  return "neutral";
});
</script>

<template>
  <PageShell title="Overview" description="Your account and subscription status.">
    <template #actions>
      <UiBadge :variant="statusVariant">{{ status }}</UiBadge>
    </template>

    <div class="p-6">
      <div class="text-sm text-text-muted">
        Welcome, <span class="text-text-default">{{ uiUser?.name ?? "Type Writer Username" }}</span>
      </div>

      <div class="mt-4">
        <UiCard>
          <div class="space-y-2">
            <div class="text-sm text-text-default">
              Email: <span class="font-medium text-text-strong">{{ uiUser?.email ?? "—" }}</span>
            </div>
            <div class="text-sm text-text-default">
              Subscription: <span class="font-medium text-text-strong">{{ status }}</span>
            </div>
          </div>
        </UiCard>
      </div>
    </div>
  </PageShell>
</template>
