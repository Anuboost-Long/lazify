/// <reference types="vite/client" />

import type { LazifyApi } from "@/platform/lazify-api";

declare global {
	/** Injected by vite from package.json — see `define` in vite.config.ts. */
	const __APP_VERSION__: string;

	interface Window {
		lazify: LazifyApi;
	}

	// Exposed on globalThis (renderer) so `globalThis.lazify` resolves without `window`.
	// eslint-disable-next-line no-var
	var lazify: Window["lazify"];
}

export {};
