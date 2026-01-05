import type { Router } from "vue-router";
import { useAuthStore } from "@/stores/auth";

function hasRequiredPerms(required: unknown, userPerms: string[]) {
  const perms = Array.isArray(required) ? (required as string[]) : [];
  if (!perms.length) return true;
  return perms.every((p) => userPerms.includes(p));
}

export function setupRouterGuards(router: Router) {
  router.beforeEach((to) => {
    const auth = useAuthStore();

    const requiresAuth = !!to.meta.requiresAuth;
if (to.meta.requiresAuth && !auth.isAuthed) {
  return "/signin";
}

    // If the route requires auth but the user is not authed,
    // route to "/" so App.vue shows the Sign In UI.
    if (requiresAuth && !auth.isAuthed) {
      return { path: "/" };
    }

    // Permissions gating (safe defaults)
    const requiredPerms = to.meta.requiredPerms;
    const userPerms = auth.permissions ?? [];

    if (requiresAuth && !hasRequiredPerms(requiredPerms, userPerms)) {
      return { path: "/forbidden" };
    }

    return true;
  });
}
