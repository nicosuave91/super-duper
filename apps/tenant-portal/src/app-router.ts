import { createRouter, createWebHistory } from "vue-router";

// Routed pages ONLY live in /pages
import AuthCallback from "@/pages/AuthCallback.vue";

// Lazy-loaded routes
const Overview = () => import("./pages/Overview.vue");
const Leads = () => import("./pages/Leads.vue");
const Billing = () => import("./pages/Billing.vue");
const Support = () => import("./pages/Support.vue");
const Profile = () => import("./pages/Profile.vue");

const WebsiteLayout = () => import("./pages/website/WebsiteLayout.vue");
const WebsiteSettings = () => import("./pages/website/WebsiteSettings.vue");
const WebsiteBranding = () => import("./pages/website/WebsiteBranding.vue");

const DevSignIn = () => import("./pages/DevSignIn.vue");
const Forbidden = () => import("./pages/Forbidden.vue");

const router = createRouter({
  history: createWebHistory("/"),
  routes: [
    // Root: send users to sign-in or portal
    {
      path: "/",
      redirect: () => {
        const token = localStorage.getItem("auth_token");
        return token ? "/portal/overview" : "/signin";
      },
    },

    { path: "/overview", redirect: "/portal/overview" },
    { path: "/leads", redirect: "/portal/leads" },
    { path: "/billing", redirect: "/portal/billing" },
    { path: "/website", redirect: "/portal/website" },
    { path: "/support", redirect: "/portal/support" },

    // Auth routes
    { path: "/signin", component: DevSignIn },
    { path: "/dev/signin", component: DevSignIn },
    { path: "/callback", name: "AuthCallback", component: AuthCallback },
    { path: "/forbidden", component: Forbidden },

    // Portal routes (protected)
    { path: "/portal/overview", component: Overview, meta: { requiresAuth: true } },
    { path: "/portal/leads", component: Leads, meta: { requiresAuth: true } },
    { path: "/portal/billing", component: Billing, meta: { requiresAuth: true } },
    { path: "/portal/profile", component: Profile, meta: { requiresAuth: true } },

    {
      path: "/portal/website",
      component: WebsiteLayout,
      meta: { requiresAuth: true },
      children: [
        { path: "", redirect: "/portal/website/settings" },
        { path: "settings", component: WebsiteSettings, meta: { requiresAuth: true } },
        {
          path: "branding",
          component: WebsiteBranding,
          meta: { requiresAuth: true, requiredPerms: ["whitelabel.branding"] },
        },
      ],
    },

    { path: "/portal/support", component: Support, meta: { requiresAuth: true } },

    // Catch-all
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

export default router;
export { router };
