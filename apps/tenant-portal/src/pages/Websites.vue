<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import PageShell from "@/components/layout/PageShell.vue";
import { UiButton, UiCallout } from "@superapp/ui";
import { apiFetch } from "@/lib/api";

type CheckoutResponse = { url: string };

const route = useRoute();
const isLoading = ref(false);
const error = ref<string | null>(null);

const isSuccess = computed(() => route.query.status === "success");

async function startCheckout() {
  error.value = null;
  isLoading.value = true;

  try {
    const r = await apiFetch<CheckoutResponse>("/billing/checkout", { method: "POST" });
    if (!r?.url) throw new Error("Checkout URL missing from response.");
    window.location.href = r.url;
  } catch (e: any) {
    error.value = e?.message ?? "Unable to start checkout.";
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <PageShell title="Billing" description="Manage subscriptions and purchase additional websites.">
    <div class="p-6 space-y-4">
      <UiCallout v-if="isSuccess" variant="success" title="Success">
        Your checkout completed successfully.
      </UiCallout>

      <UiCallout v-if="error" variant="danger" title="Billing error">
        {{ error }}
      </UiCallout>

      <div class="text-sm text-text-muted">
        You can purchase multiple websites. Each purchase creates a new website (site) tied to its own subscription.
      </div>

      <div class="pt-2">
        <UiButton variant="primary" :disabled="isLoading" @click="startCheckout">
          {{ isLoading ? "Redirecting…" : "Buy New Website" }}
        </UiButton>
      </div>
    </div>
  </PageShell>
</template>
