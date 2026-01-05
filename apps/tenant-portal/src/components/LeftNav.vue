<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useTenantStore } from "@/stores/tenant";

import NavItem from "@/components/nav/NavItem.vue";

// Lucide icons
import {
  LayoutDashboard,
  Users,
  Globe,
  Plug,
  CreditCard,
  LifeBuoy,
  LogOut,
  HeartHandshake,
  ChevronLeft,
  ChevronRight,
  ShieldPlus,        // using for Compliance Center
  Cog,
  PlugZap,
  CalendarDays,
  ConciergeBell,
} from "lucide-vue-next";

const router = useRouter();
const route = useRoute();

const auth = useAuthStore();
const tenant = useTenantStore();

/**
 * Collapsed nav state (persisted)
 */
const LS_NAV_COLLAPSED = "tenant_portal_leftnav_collapsed";
const collapsed = ref(localStorage.getItem(LS_NAV_COLLAPSED) === "1");

watch(collapsed, (v) => {
  localStorage.setItem(LS_NAV_COLLAPSED, v ? "1" : "0");
  void updateIndicator();
});

function toggleCollapsed() {
  collapsed.value = !collapsed.value;
}

/**
 * User display (no avatar)
 */
const userName = computed(() => {
  const u: any = (auth as any).user;
  return u?.name || u?.email || (tenant as any)?.tenantMe?.name || "Account";
});

async function goToProfile() {
  await router.push("/portal/profile");
}

/**
 * Leads badge count (safe fallback)
 */
const leadsBadge = computed(() => {
  const c = (tenant as any)?.leadsCount ?? (tenant as any)?.leadCount ?? null;
  if (c === null || c === undefined) return null;
  const n = typeof c === "number" ? c : Number(c);
  if (!Number.isFinite(n)) return null;
  return n > 99 ? "99+" : n;
});

const primaryLinks = [
  { to: "/portal/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/portal/website", label: "Website Manager", icon: Globe },
  { to: "/portal/leads", label: "Leads Table", icon: Users, badge: leadsBadge.value },
  { to: "/portal/leads", label: "Appointment Calendar", icon: CalendarDays, badge: leadsBadge.value },
  { to: "/portal/leads", label: "Carrier Fit Engine", icon: PlugZap },
  { to: "/portal/website", label: "Policyholder Hub", icon: HeartHandshake },
];

const productLinks = [
  
  { to: "/portal/billing", label: "Subscription & Billing", icon: CreditCard },
  { to: "/portal/website", label: "Compliance", icon: ShieldPlus },
  { to: "/portal/support", label: "Support Center", icon: ConciergeBell },
  { to: "/portal/support", label: "Settings", icon: Cog },
];

const isActive = (to: string) =>
  route.path === to || route.path.startsWith(to.replace(/\/$/, "") + "/");

/**
 * Sign out
 */
async function onSignOut() {
  auth.logout();

  const maybeSetSiteId = (tenant as any)?.setSiteId;
  if (typeof maybeSetSiteId === "function") {
    await maybeSetSiteId.call(tenant, null);
  } else {
    (tenant as any).site_id = null;
    (tenant as any).tenantMe = null;
    localStorage.removeItem("site_id");
  }

  await router.replace("/");
}

/**
 * Smooth active highlight "pill" animation
 */
const navEl = ref<HTMLElement | null>(null);
const indicatorTop = ref(0);
const indicatorHeight = ref(44);
const indicatorVisible = ref(false);

async function updateIndicator() {
  await nextTick();

  const nav = navEl.value;
  if (!nav) return;

  const active = nav.querySelector<HTMLElement>("[data-nav-item='true'].is-active");
  if (!active) {
    indicatorVisible.value = false;
    return;
  }

  const navRect = nav.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();

  indicatorTop.value = activeRect.top - navRect.top;
  indicatorHeight.value = activeRect.height;
  indicatorVisible.value = true;
}

function onResize() {
  void updateIndicator();
}

watch(
  () => route.path,
  () => void updateIndicator()
);

onMounted(() => {
  void updateIndicator();
  window.addEventListener("resize", onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
});
</script>

<template>
  <aside
    class="leftnav h-screen shrink-0 border-r border-border-subtle bg-surface flex flex-col overflow-hidden
           transition-[width,padding] duration-200 ease-out"
    :class="collapsed ? 'w-20 px-2' : 'w-72 px-3'"
  >
    <div class="leftnav-tokens" />

    <!-- Header -->
    <div class="flex items-center justify-between gap-2 py-3">
      <button
        type="button"
        class="min-w-0 text-left rounded-xl px-2 py-1 hover:bg-surface-alt transition-colors
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
        @click="goToProfile"
        :title="collapsed ? userName : undefined"
        aria-label="Open profile"
      >
        <Transition name="fade-slide">
          <div v-if="!collapsed" class="min-w-0">
            <div class="text-sm font-semibold text-text-default truncate">{{ userName }}</div>
            <div class="text-xs text-text-muted truncate">View profile</div>
          </div>
        </Transition>

        <div v-if="collapsed" class="h-9 w-9 rounded-xl border border-border-subtle bg-surface-alt" />
      </button>

      <button
        type="button"
        class="h-9 w-9 rounded-xl border border-border-subtle bg-surface-alt hover:bg-surface
               grid place-items-center transition-colors
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
        :title="collapsed ? 'Expand navigation' : 'Collapse navigation'"
        @click="toggleCollapsed"
      >
        <component :is="collapsed ? ChevronRight : ChevronLeft" class="h-4 w-4 text-text-default" />
      </button>
    </div>

    <!-- Navigation -->
    <nav ref="navEl" class="mt-3 relative">
      <div
        class="nav-indicator"
        :style="{
          transform: `translateY(${indicatorTop}px)`,
          height: `${indicatorHeight}px`,
          opacity: indicatorVisible ? 1 : 0
        }"
        aria-hidden="true"
      />

      <div class="space-y-0.5">
        <NavItem
          v-for="l in primaryLinks"
          :key="l.label"
          :to="l.to"
          :label="l.label"
          :icon="l.icon"
          :collapsed="collapsed"
          :active="isActive(l.to)"
          :badge="(l as any).badge"
        />

        <div class="nav-divider" :data-collapsed="collapsed ? '1' : '0'">
          <div v-if="!collapsed" class="nav-divider-label">Manage My Profile</div>
          <div class="nav-divider-line" />
        </div>

        <NavItem
          v-for="l in productLinks"
          :key="l.label"
          :to="l.to"
          :label="l.label"
          :icon="l.icon"
          :collapsed="collapsed"
          :active="isActive(l.to)"
        />
      </div>
    </nav>

    <!-- Footer -->
    <div class="mt-auto pt-4 pb-3">
      <div class="border-t border-border-subtle pt-4">
        <button
          type="button"
          class="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium
                 bg-surface-alt hover:bg-surface text-text-default transition-colors
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
          :title="collapsed ? 'Sign out' : undefined"
          :aria-label="collapsed ? 'Sign out' : undefined"
          @click="onSignOut"
        >
          <LogOut class="h-5 w-5 text-text-muted" />
          <Transition name="fade-slide">
            <span v-if="!collapsed">Sign out</span>
          </Transition>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.leftnav {
  --nav-item-height: var(--ds-nav-item-height, 44px);
  --nav-item-padding-x: var(--ds-space-3, 12px);
  --nav-item-padding-y: var(--ds-space-2_5, 10px);
  --nav-item-gap: var(--ds-space-3, 12px);
  --nav-item-radius: var(--ds-radius-10, 10px);

  --nav-font-size: var(--ds-font-sm, 14px);

  --nav-hover-bg: var(--ds-surface-alt, var(--color-surface-alt, #f3f4f6));
  --nav-hover-dur: var(--ds-motion-fast, 140ms);

  --nav-text-muted: var(--ds-text-muted, var(--color-text-muted, #6b7280));
  --nav-text-default: var(--ds-text-default, var(--color-text-default, #111827));

  --nav-badge-bg: var(--ds-badge-bg, var(--color-surface-alt, #f3f4f6));
  --nav-badge-border: var(--ds-border-subtle, var(--color-border-subtle, #e5e7eb));
}

.leftnav-tokens {
  display: none;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}

.nav-indicator {
  position: absolute;
  left: 0;
  right: 0;
  border-radius: var(--nav-item-radius, 10px);
  background: var(--nav-hover-bg);
  border: 1px solid var(--nav-badge-border);
  pointer-events: none;
  transition:
    transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1),
    height 220ms cubic-bezier(0.2, 0.9, 0.2, 1),
    opacity 150ms ease;
  will-change: transform, height;
  z-index: 0;
}

.nav-divider {
  position: relative;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--nav-text-muted);
}

.nav-divider-line {
  height: 1px;
  background: var(--nav-badge-border);
  flex: 1 1 auto;
  opacity: 0.9;
}

.nav-divider-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.nav-divider[data-collapsed="1"] {
  padding: 8px 0;
}
.nav-divider[data-collapsed="1"] .nav-divider-label {
  display: none;
}
.nav-divider[data-collapsed="1"] .nav-divider-line {
  margin: 0 10px;
}

@media (prefers-reduced-motion: reduce) {
  .leftnav {
    transition: none !important;
  }
  .fade-slide-enter-active,
  .fade-slide-leave-active {
    transition: none !important;
  }
  .nav-indicator {
    transition: none !important;
  }
}
</style>
