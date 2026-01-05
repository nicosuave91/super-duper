import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import auth0 from './auth/auth0'
import "@package/config/tokens/colors.css";
import './style.css'
import { createRouter, createWebHistory } from "vue-router";

const app = createApp(App)
const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
export { router };


app.use(createPinia())
app.use(router)
app.use(auth0)

app.mount('#app')
