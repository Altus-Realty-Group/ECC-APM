import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { frontendApiBoundary } from "./scripts/frontend-api-boundary.mjs";

export default defineConfig({
  plugins: [frontendApiBoundary(), react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [".replit.dev", ".repl.co", ".replit.app"],
    hmr: { overlay: true },
  },
});
