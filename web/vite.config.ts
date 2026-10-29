import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const target =
    loadEnv(mode, ".", "").API_PROXY_TARGET || "http://127.0.0.1:3000";
  return {
    plugins: [react()],
    server: { proxy: { "/api": target, "/models": target } },
    build: {
      target: "es2022",
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            three: ["three", "@react-three/fiber"],
          },
        },
      },
    },
    test: { environment: "node" },
  };
});
