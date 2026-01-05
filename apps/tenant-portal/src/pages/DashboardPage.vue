<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '../lib/api'

const userData = ref(null)
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const res = await apiClient().get('whoami')
    userData.value = await res.json()
    loading.value = false
  } catch (e) {
    error.value = e
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error loading dashboard</div>
  <div v-else>
    <h1>Welcome, {{ userData.name }}</h1>
  </div>
</template>
