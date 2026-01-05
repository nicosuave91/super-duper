<script setup lang="ts">
import { reactive } from "vue";

const form = reactive({
  name: "",
  phone: "",
  email: "",
});

async function submit() {
  // Minimal placeholder so build passes. Replace with real API call later.
  // Example: await fetch("/api/leads", { method: "POST", body: JSON.stringify(form) })
  alert("Submitted (stub)");
}
</script>

<template>
  <form @submit.prevent="submit" style="display: grid; gap: 12px; max-width: 420px;">
    <label style="display: grid; gap: 6px;">
      <span>Name</span>
      <input v-model="form.name" type="text" autocomplete="name" />
    </label>

    <label style="display: grid; gap: 6px;">
      <span>Phone</span>
      <input v-model="form.phone" type="tel" autocomplete="tel" />
    </label>

    <label style="display: grid; gap: 6px;">
      <span>Email</span>
      <input v-model="form.email" type="email" autocomplete="email" />
    </label>

    <button type="submit">Get Info</button>
  </form>
</template>
