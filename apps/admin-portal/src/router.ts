import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import AdminLayout from "./layouts/AdminLayout.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: AdminLayout,
    children: [
      { path: "", name: "Overview", component: () => import("./pages/Overview.vue") },
      { path: "403", name: "Forbidden", component: () => import("./pages/Forbidden.vue") },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
