import path from "node:path";
import { fileURLToPath } from "node:url";

import esbuild from "esbuild";

/**
 * The preload runs sandboxed, where `require` reaches Electron and a few Node
 * builtins and nothing else — a relative import of a sibling file throws
 * "module not found" at load and leaves the renderer with no `window.lazify`.
 * So the preload sources are split for reading and bundled back into one file
 * for shipping.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const options = {
	entryPoints: [
		path.join(root, "src/preload/index.ts"),
		path.join(root, "src/preload/browser-gesture.ts"),
	],
	outdir: path.join(root, "dist-electron/preload"),
	bundle: true,
	platform: "node",
	format: "cjs",
	target: "node20",
	sourcemap: process.env.NODE_ENV !== "production",
	external: ["electron"],
	logLevel: "info",
};

if (process.argv.includes("--watch")) {
	const context = await esbuild.context(options);

	await context.watch();
} else {
	await esbuild.build(options);
}
