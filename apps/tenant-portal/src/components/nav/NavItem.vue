<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

type Badge = string | number | null | undefined;

const props = defineProps<{
  to: string;
  label: string;
  icon: any;
  active?: boolean;
  collapsed?: boolean;
  badge?: Badge;
}>();

const showBadge = computed(() => props.badge !== null && props.badge !== undefined && props.badge !== "");
const badgeText = computed(() => (showBadge.value ? String(props.badge) : ""));
</script>

<template>
  <RouterLink
    :to="to"
    class="nav-item"
    :class="active ? 'is-active' : ''"
    data-nav-item="true"
    :title="collapsed ? label : undefined"
    :aria-label="collapsed ? label : undefined"
  >
    <component :is="icon" class="nav-icon" />

    <span v-if="!collapsed" class="nav-label">
      {{ label }}
    </span>

    <!-- Badge: aligned right in expanded mode; collapsed becomes a dot -->
    <span v-if="showBadge" class="nav-badge" :data-collapsed="collapsed ? '1' : '0'">
      <span v-if="!collapsed" class="nav-badge-text">{{ badgeText }}</span>
    </span>
  </RouterLink>
</template>

<style scoped>
/* NOTE: Spacing is driven by CSS variables from LeftNav (design tokens w/ fallbacks). */
.nav-item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--nav-item-gap, 12px);
  min-height: var(--nav-item-height, 44px);
  padding: var(--nav-item-padding-y, 10px) var(--nav-item-padding-x, 12px);
  border-radius: var(--nav-item-radius, 10px);
  font-size: var(--nav-font-size, 14px);
  color: var(--nav-text-muted, var(--color-text-muted, #6b7280));
  transition:
    background-color var(--nav-hover-dur, 140ms) ease,
    color var(--nav-hover-dur, 140ms) ease,
    transform var(--nav-hover-dur, 140ms) ease;
  text-decoration: none;
}

.nav-item:hover {
  background: var(--nav-hover-bg, var(--color-surface-alt, #f3f4f6));
  color: var(--nav-text-default, var(--color-text-default, #111827));
}

/* Keyboard focus (accessible) */
.nav-item:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--nav-focus, var(--color-brand-primary, #2563eb)),
    0 0 0 4px var(--nav-focus-offset, var(--color-surface, #ffffff));
}

/* Active style: background handled by animated indicator in LeftNav */
.nav-item.is-active {
  background: transparent;
  color: var(--nav-text-default, var(--color-text-default, #111827));
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  color: currentColor;
  transform: translateY(0.5px); /* optical alignment */
}

/* Label */
.nav-label {
  min-width: 0;
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Badge container (right aligned) */
.nav-badge {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--nav-badge-bg, var(--color-surface-alt, #f3f4f6));
  border: 1px solid var(--nav-badge-border, var(--color-border-subtle, #e5e7eb));
  color: var(--nav-badge-text, var(--color-text-default, #111827));
  padding: 0 6px;
  font-size: 12px;
  line-height: 1;
}

/* Collapsed badge becomes a dot */
.nav-badge[data-collapsed="1"] {
  width: 10px;
  min-width: 10px;
  height: 10px;
  padding: 0;
  border-radius: 999px;
}

/* Hide number when collapsed (dot only) */
.nav-badge-text {
  font-weight: 600;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .nav-item {
    transition: none !important;
  }
  .nav-icon {
    transform: none;
  }
}
</style>
