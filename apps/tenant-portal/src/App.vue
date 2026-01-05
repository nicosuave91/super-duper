<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import AppShell from "./layouts/AppShell.vue";
import { bootstrapTenantPortal } from "./bootstrap";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

import { UiButton, UiCard, UiCallout } from "@superapp/ui";

const router = useRouter();
const auth = useAuthStore();
	console.log("typeof signInDev:", typeof (auth as any).signInDev);
	console.log("auth keys:", Object.keys(auth));

onMounted(async () => {
  try {
    await bootstrapTenantPortal();
  } catch (e) {
    if (auth.isAuthed) {
      bootError.value = e as any;
    } else {
      console.warn("Bootstrap failed pre-auth; redirecting to sign-in.", e);
    }
  } finally {
    booting.value = false;

    // 🔑 THIS IS THE KEY FIX
    if (!auth.isAuthed) {
      router.replace("/signin");
    }
  }
});


const booting = ref(true);
const bootError = ref<ApiError | Error | null>(null);

onMounted(async () => {
  try {
    await bootstrapTenantPortal();
  } catch (e) {
    // If boot fails while not signed in, don't block the user from signing in.
    // Only show the full-screen startup error if we are already authed.
    if (auth.isAuthed) {
      bootError.value = e as any;
    } else {
      console.warn("Bootstrap failed pre-auth; user can still sign in.", e);
    }
  } finally {
    booting.value = false;
  }
});
</script>

<template>
  <div v-if="booting" class="min-h-screen grid place-items-center bg-surface-alt p-6">
    <UiCard class="w-full max-w-md">
      <div class="text-sm font-semibold text-text-strong">Loading…</div>
      <div class="mt-2 text-sm text-text-muted">Initializing tenant portal.</div>
    </UiCard>
  </div>

  <div v-else-if="bootError" class="min-h-screen grid place-items-center bg-surface-alt p-6">
    <div class="w-full max-w-xl">
      <UiCallout variant="danger" title="Startup error">
        <div class="text-sm text-text-default">{{ bootError.message }}</div>
        <div v-if="(bootError as any).requestId" class="mt-2 text-xs text-text-muted">
          request_id:
          <span class="font-mono text-text-default">{{ (bootError as any).requestId }}</span>
        </div>
      </UiCallout>
    </div>
  </div>

  <!-- ✅ If authed, render the portal inside the shell (LeftNav lives here) -->
  <AppShell v-else-if="auth.isAuthed">
    <router-view />
  </AppShell>

  <!-- ✅ If not authed, render auth routes full-screen (signin page) -->
  <router-view v-else />
</template>
