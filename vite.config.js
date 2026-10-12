import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "https://ecc-triage-node-staging.azurewebsites.net",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes, req) => {
            const url = req?.url || "";
            const handlerByUrl = {
              "/api/dashboard/kpi/summary": "dashboard/kpi/summary",
              "/api/triage/cashflow/ar_aging": "triage/cashflow/ar_aging",
              "/api/triage/cashflow/payment_plans":
                "triage/cashflow/payment_plans::triage/cashflow/payment_plans",
            };

            const handler = handlerByUrl[url];
            if (handler && !proxyRes.headers["x-ecc-handler"]) {
              proxyRes.headers["x-ecc-handler"] = handler;
            }

            if (handler) {
              proxyRes.headers["content-type"] =
                "application/json; charset=utf-8";
            }
          });
        },
      },
    },
    hmr: { overlay: true },
  }
});