<script setup lang="ts">
import { reactive } from "vue";
import PageShell from "@/components/layout/PageShell.vue";
import { UiButton, UiInput } from "@superapp/ui";

const form = reactive({
  name: "",
  email: "",
});

function save(ev: Event) {
  ev.preventDefault();
  alert("Saved (stub)");
}
</script>

<template>
  <PageShell title="Billing" description="Manage your payment details and keep your websites online.">
    <form class="p-6 space-y-4 max-w-xl" @submit="save">
      <UiInput v-model="form.name" label="Name" placeholder="Your name" />
      <UiInput v-model="form.email" label="Email" type="email" placeholder="you@example.com" />

      <div class="pt-2">
        <UiButton variant="primary" type="submit">Save</UiButton>
      </div>
    </form>
  </PageShell>
</template>
