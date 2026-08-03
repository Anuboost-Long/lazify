import path from "node:path";
import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.ts: tests opt into a DOM per file, while
// renderer component tests still need the same source aliases as the app.
export default defineConfig({
  resolve: {
    alias: {
      "@brain": path.resolve(__dirname, "src/brain"),
      "@main": path.resolve(__dirname, "src/main"),
      "@preload": path.resolve(__dirname, "src/preload"),
      "@renderer": path.resolve(__dirname, "src/renderer")
    }
  },
  test: {
    environment: "node",
    // tests/ mirrors src/, so tests/main covers src/main.
    include: ["tests/**/*.test.ts"]
  }
});
