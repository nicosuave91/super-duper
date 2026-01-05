<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const err = ref<string | null>(null);

onMounted(async () => {
  try {
    await auth.handleCallback();
    await router.replace('/admin');
  } catch (e: any) {
    err.value = e?.message ?? 'Login callback failed';
  }
});
</script>

<template>
  <div style="padding:24px;">
    <h2>Signing you in…</h2>
    <p v-if="err" style="color:#b00020;">{{ err }}</p>
  </div>
</template>
