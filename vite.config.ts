import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import pkg from "./package.json";

export default defineConfig({
	plugins: [react()],
	// Surfaced in Settings > About, so the packaged app reports its real version.
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
	},
	base: "./",
	root: ".",
	resolve: {
		alias: {
			"@renderer": path.resolve(__dirname, "src/renderer"),
			// The renderer imports pure modules from main — the context types and the
			// lines they render — so a form previews exactly what a prompt will say.
			// Only side-effect-free modules may be reached this way.
			"@main": path.resolve(__dirname, "src/main"),
		},
	},
	server: {
		host: "127.0.0.1",
		// Off vite's default 5173 on purpose: another vite app holding that port
		// would still answer `wait-on`, and Electron would load *it* instead.
		port: 5273,
		strictPort: true,
	},
	build: {
		outDir: "dist",
		emptyOutDir: true,
	},
});
