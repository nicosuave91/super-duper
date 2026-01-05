<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { bootstrapTenantPortal } from "@/bootstrap";
import { UiButton, UiCard, UiInput } from "@superapp/ui";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();


const email = ref("");
const password = ref("");

const canSubmit = computed(() => {
  return email.value.trim() && password.value.trim() && !auth.loading;
});

const errorMessage = computed(() => auth.lastError);

/* ---------------------------
   Handlers
---------------------------- */
async function signInWithEmail() {
  if (!canSubmit.value) return;

  const ok = await auth.loginWithEmail(
    email.value.trim(),
    password.value
  );

  if (!ok) return;

  await bootstrapTenantPortal();
  await router.replace("/portal/overview");
}

async function signInDev() {
  const ok = await auth.login();
  if (!ok) return;

  await bootstrapTenantPortal();
  await router.replace("/portal/overview");
}
</script>

<template>
  <div class="min-h-screen w-full bg-surface-alt grid place-items-center p-6">
    <UiCard class="w-full max-w-md">
      <div class="text-lg font-semibold text-text-strong">Sign in</div>
      <div class="mt-2 text-sm text-text-muted">
        Enter your email and password to continue.
      </div>

      <!-- Email -->
      <div class="mt-4">
        <UiInput
          v-model="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autocomplete="email"
        />
      </div>

      <!-- Password -->
      <div class="mt-3">
        <UiInput
          v-model="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          autocomplete="current-password"
        />
      </div>

      <!-- Error -->
      <div
        v-if="errorMessage"
        class="mt-3 text-sm text-red-600"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <!-- Primary sign-in -->
      <div class="mt-4">
        <UiButton
          block
          variant="primary"
          :disabled="!canSubmit"
          :loading="auth.loading"
          @click="signInWithEmail"
        >
          Sign in
        </UiButton>
      </div>
    </UiCard>
  </div>
</template>
