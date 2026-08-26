/// <reference types="vite/client" />

import type { lazifyApi } from "../preload/api";

declare global {
	/** Injected by vite from package.json — see `define` in vite.config.ts. */
	const __APP_VERSION__: string;

	interface Window {
		lazify: typeof lazifyApi;
	}

	// Exposed on globalThis (renderer) so `globalThis.lazify` resolves without `window`.
	// eslint-disable-next-line no-var
	var lazify: Window["lazify"];

	/**
	 * The `<webview>` the agent preview browser renders. Electron ships no JSX
	 * typing for the tag, and the renderer must not pull in the electron types,
	 * so only the surface the preview toolbar actually drives is declared here.
	 */
	interface LazifyWebviewElement extends HTMLElement {
		src: string;
		getURL: () => string;
		getTitle: () => string;
		loadURL: (url: string) => Promise<void>;
		reload: () => void;
		stop: () => void;
		goBack: () => void;
		goForward: () => void;
		canGoBack: () => boolean;
		canGoForward: () => boolean;
		openDevTools: () => void;
		closeDevTools: () => void;
		isDevToolsOpened: () => boolean;
		/**
		 * Runs code inside the guest. `userGesture` is what lets the page's own
		 * picture-in-picture request through — Chromium refuses one that did not
		 * come from a user action.
		 */
		executeJavaScript: (code: string, userGesture?: boolean) => Promise<unknown>;
		/** Identifies the guest to main, which can reach its frames. */
		getWebContentsId: () => number;
	}

	namespace JSX {
		interface IntrinsicElements {
			webview: React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement> & {
					src?: string;
					/** Isolates each surface's cookies and storage from the others. */
					partition?: string;
					/** React's own webview typing already declares this as a boolean. */
					allowpopups?: boolean;
					/** Guest webPreferences, e.g. "backgroundThrottling=no". */
					webpreferences?: string;
				},
				HTMLElement
			>;
		}
	}
}

export {};
