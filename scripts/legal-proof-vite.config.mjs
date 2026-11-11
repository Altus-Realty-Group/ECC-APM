import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
if (!process.env.ECC_LEGAL_PROOF_OUT) throw new Error("Test-only output directory is required");
export default defineConfig({
  root: path.resolve("tests/browser/legal-proof"), publicDir: false,
  plugins: [react()], resolve: { alias: { "@": path.resolve("src") } },
  build: { outDir: process.env.ECC_LEGAL_PROOF_OUT, emptyOutDir: true },
  preview: { host: "127.0.0.1", port: 4181, strictPort: true },
});
