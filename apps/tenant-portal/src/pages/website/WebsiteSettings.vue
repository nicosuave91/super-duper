<script setup lang="ts">
import { reactive } from "vue";
import { UiButton } from "@superapp/ui";

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
  <form class="p-6 space-y-4 max-w-xl" @submit="save">
    <TextInput v-model="form.name" label="Name" placeholder="Your name" />
    <TextInput v-model="form.email" label="Email" type="email" placeholder="you@example.com" />

    <div class="pt-2">
      <UiButton variant="primary" type="submit">Save</UiButton>
    </div>
  </form>
</template>
