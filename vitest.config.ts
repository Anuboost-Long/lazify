import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.ts: these are main-process modules with
// no DOM, no React plugin, and no renderer aliases to resolve.
export default defineConfig({
  test: {
    environment: "node",
    // tests/ mirrors src/, so tests/main covers src/main.
    include: ["tests/**/*.test.ts"]
  }
});
