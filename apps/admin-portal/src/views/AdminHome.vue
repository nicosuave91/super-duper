<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAdminStore } from '../stores/admin'

const adminStore = useAdminStore()

onMounted(async () => {
  await adminStore.fetchTenants()
})

const tenants = computed(() => adminStore.tenants)
</script>

<template>
  <table>
    <tbody>
      <tr v-for="user in tenants" :key="user.email">
        <td>{{ user.email }}</td>
        <td>{{ user.subscriptionStatus }}</td>
      </tr>
    </tbody>
  </table>
</template>
