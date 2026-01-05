<template>
  <div class="page">
    <p>Completing sign-in…</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth0 } from "@auth0/auth0-vue";

// If your bootstrap function lives elsewhere, adjust this import.
// If you don't have this yet, you can remove the import + call and keep the redirect.
import { bootstrapTenantPortal } from "@/bootstrap";

const router = useRouter();
const { handleRedirectCallback } = useAuth0();

onMounted(async () => {
  try {
    await handleRedirectCallback();
    await bootstrapTenantPortal();
    await router.replace("/portal/overview");
  } catch {
    // If callback fails, route to "/" where your Sign In UI is shown
    await router.replace("/");
  }
});
</script>

<style scoped>
.page {
  padding: 20px;
}
</style>
