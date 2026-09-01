import path from "node:path";

import { defineConfig } from "vitest/config";

// Reaches Open VSX over the network and downloads a real extension, so these
// stay out of the default run and get their own config.
export default defineConfig({
	resolve: {
		alias: {
			"@brain": path.resolve(__dirname, "src/brain"),
			"@main": path.resolve(__dirname, "src/main"),
			"@preload": path.resolve(__dirname, "src/preload"),
			"@renderer": path.resolve(__dirname, "src/renderer"),
		},
	},
	define: { __APP_VERSION__: JSON.stringify("test") },
	test: {
		environment: "node",
		include: ["tests/**/*.e2e.test.ts"],
		exclude: ["**/node_modules/**", "**/dist/**"],
		testTimeout: 240_000,
		hookTimeout: 240_000,
		poolOptions: { forks: { execArgv: ["--experimental-sqlite"] } },
	},
});
