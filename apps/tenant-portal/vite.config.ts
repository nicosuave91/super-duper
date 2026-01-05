import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, "../..");
  const env = loadEnv(mode, rootDir, "");

  return {
    plugins: [vue(), tailwindcss()],

    // ✅ Make Vite read env from repo root (so VITE_* works consistently)
    envDir: rootDir,

    // ✅ Alias @ -> src
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      port: Number(env.TENANT_PORTAL_PORT ?? 5173),
      strictPort: true,
    },
  };
});
