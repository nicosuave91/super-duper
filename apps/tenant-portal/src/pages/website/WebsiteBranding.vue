<script setup lang="ts">
import { computed, reactive, watchEffect } from "vue";
import { useThemeStore } from "@/stores/theme";
import { useTenantStore } from "@/stores/tenant";
import TextInput from "@/components/form/TextInput.vue";
import { UiButton, UiCard, UiCallout } from "@superapp/ui";

const tenant = useTenantStore();
const themeStore = useThemeStore();

const siteId = computed(() => tenant.site_id);

const form = reactive({
  tenantName: "",
  logoUrl: "",
  primary: "#2563eb",
  accent: "#22c55e",
  neutral: "#64748b",
});

watchEffect(() => {
  const t = themeStore.theme;
  form.tenantName = t.tenantName ?? "";
  form.logoUrl = t.logoUrl ?? "";
  form.primary = t.colors.primary;
  form.accent = t.colors.accent;
  form.neutral = t.colors.neutral;
});

function save() {
  if (!siteId.value) return;

  themeStore.saveForSite(siteId.value, {
    tenantName: form.tenantName.trim() || "Tenant Portal",
    logoUrl: form.logoUrl.trim() || null,
    colors: {
      primary: form.primary,
      accent: form.accent,
      neutral: form.neutral,
    },
  });
}

function reset() {
  if (!siteId.value) return;
  themeStore.resetForSite(siteId.value);
}
</script>

<template>
  <div class="p-6 space-y-4 max-w-2xl">
    <UiCallout v-if="!siteId" variant="warning" title="Missing site context">
      Set a site_id to edit branding.
    </UiCallout>

    <UiCard>
      <div class="space-y-4">
        <div class="text-sm font-semibold text-text-strong">Branding</div>
        <div class="text-sm text-text-muted">
          Customize your tenant branding. Only high-level theme options are editable.
        </div>

        <TextInput v-model="form.tenantName" label="Tenant name" placeholder="Your brand name" />
        <TextInput v-model="form.logoUrl" label="Logo URL" placeholder="https://..." />

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label class="block">
            <div class="mb-1 text-xs font-medium text-text-muted">Primary</div>
            <input v-model="form.primary" type="color" class="h-10 w-full rounded-xl border border-border-subtle bg-surface" />
          </label>

          <label class="block">
            <div class="mb-1 text-xs font-medium text-text-muted">Accent</div>
            <input v-model="form.accent" type="color" class="h-10 w-full rounded-xl border border-border-subtle bg-surface" />
          </label>

          <label class="block">
            <div class="mb-1 text-xs font-medium text-text-muted">Neutral</div>
            <input v-model="form.neutral" type="color" class="h-10 w-full rounded-xl border border-border-subtle bg-surface" />
          </label>
        </div>

        <div class="flex flex-wrap gap-2 pt-2">
          <UiButton variant="primary" :disabled="!siteId" @click="save">Save branding</UiButton>
          <UiButton variant="secondary" :disabled="!siteId" @click="reset">Reset to default</UiButton>
        </div>
      </div>
    </UiCard>
  </div>
</template>
