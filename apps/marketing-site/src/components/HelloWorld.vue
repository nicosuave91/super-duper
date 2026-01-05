<script setup lang="ts">
import { ref } from 'vue'

const name = ref('')
const email = ref('')
const submitted = ref(false)

async function submitLead() {
  await fetch('/api/leads', {
    method: 'POST',
    body: JSON.stringify({ name: name.value, email: email.value }),
    headers: { 'Content-Type': 'application/json' }
  })

  submitted.value = true
}
</script>

<template>
  <form @submit.prevent="submitLead" class="p-4 max-w-md mx-auto">
    <h2 class="text-xl font-bold mb-4">Get in Touch</h2>
    <input v-model="name" required placeholder="Name" class="block mb-2 w-full" />
    <input v-model="email" type="email" required placeholder="Email" class="block mb-4 w-full" />
    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">Submit</button>
    <p v-if="submitted" class="text-green-600 mt-2">Thanks! We'll be in touch.</p>
  </form>
</template>
