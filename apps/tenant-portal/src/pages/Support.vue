<script setup lang="ts">
import { ref } from "vue";
import PageShell from "@/components/layout/PageShell.vue";
import TextArea from "@/components/form/TextArea.vue";
import { UiButton, UiCard } from "@superapp/ui";
import { setDevToken } from "@/lib/api";

const tokenInput = ref("");

function saveToken() {
  setDevToken(tokenInput.value.trim() || null);
  alert("Token saved to localStorage as dev_jwt");
}
</script>

<template>
  <PageShell title="Support" description="Support tools and developer utilities.">
    <div class="p-6 max-w-2xl">
      <UiCard>
        <div class="space-y-3">
          <div class="font-semibold text-text-strong">Dev Token</div>
          <div class="text-sm text-text-muted">Paste a JWT here to authenticate apiFetch requests.</div>

          <TextArea
            v-model="tokenInput"
            placeholder="Bearer token (without the 'Bearer ' prefix)"
            :rows="4"
          />

          <div class="pt-1">
            <UiButton variant="primary" @click="saveToken">Save Token</UiButton>
          </div>
        </div>
      </UiCard>
    </div>
  </PageShell>
</template>
