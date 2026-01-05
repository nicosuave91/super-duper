<script lang="ts">
import { useAuthStore } from './stores/auth'; // Ensure it's imported once

const auth = useAuthStore(); // Access the auth store

export default {
  name: 'App',
  setup() {
    // You can access auth state here if needed
    return {
      auth
    };
  }
};
</script>

<template>
  <div id="app">
    <!-- Example usage of auth state -->
    <p v-if="auth.authed">User is authenticated</p>
    <p v-else>User is not authenticated</p>
  </div>
</template>
