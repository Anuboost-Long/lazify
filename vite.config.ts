import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

import pkg from "./package.json";

export default defineConfig({
  plugins: [react()],
  // Surfaced in Settings > About, so the packaged app reports its real version.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  base: "./",
  root: ".",
  resolve: {
    alias: {
      "@renderer": path.resolve(__dirname, "src/renderer")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
