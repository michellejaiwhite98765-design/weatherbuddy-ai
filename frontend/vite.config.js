import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Build the app into the backend's public/ folder so the single Express service
  // can serve it in production (see backend/server.js). Dev flow is unchanged.
  build: {
    outDir: "../backend/public",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
