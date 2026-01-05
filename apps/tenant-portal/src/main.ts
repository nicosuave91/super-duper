import { createApp } from "vue";
import { createPinia } from "pinia";
import { useThemeStore } from "./stores/theme";
import { setupRouterGuards } from "./router/guards";
import App from "./App.vue";
import router from "./app-router";
import "./style.css";

console.log("TENANT PORTAL main.ts running");
(window as any).__TENANT_PORTAL_BOOTED__ = true;

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);
app.use(router);

setupRouterGuards(router);
useThemeStore(pinia).init();

app.mount("#app");
