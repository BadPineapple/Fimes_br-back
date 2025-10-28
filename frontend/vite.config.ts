// vite.config.ts
import { defineConfig } from "vite";
import path from "node:path";

import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@components": path.resolve(__dirname, "src/components"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@services": path.resolve(__dirname, "src/services"),
      // adicione outros se usar (@lib, etc.)
    },
  },
  server: {
    port: 5173,
    proxy: {
      // opcional: use se quiser evitar CORS em dev
      "/auth": "http://localhost:3333",
      "/films": "http://localhost:3333",
      "/health": "http://localhost:3333"
    }
  }
});
