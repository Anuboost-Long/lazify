import { ipcRenderer } from "electron";

import type { SwipeProgressEvent as BrowserSwipeProgress } from "../../main/browser/swipe-navigation";
import { subscribe } from "./subscribe";

export const browserApi = {
	getLazyShieldState: (): Promise<import("../../main/browser/lazy-shield").LazyShieldState> =>
		ipcRenderer.invoke("lazify:lazy-shield-state"),
	setLazyShield: (
		enabled: boolean,
	): Promise<import("../../main/browser/lazy-shield").LazyShieldState> =>
		ipcRenderer.invoke("lazify:set-lazy-shield", enabled),
	onLazyShieldBlocked: (callback: (event: { blocked: number }) => void) =>
		subscribe("lazify:lazy-shield-blocked", callback),
	onBrowserSwipeProgress: (callback: (event: BrowserSwipeProgress | null) => void) =>
		subscribe("lazify:browser-swipe-progress", callback),
	onBrowserOpenTab: (callback: (event: { url: string; background: boolean }) => void) =>
		subscribe("lazify:browser-open-tab", callback),
	onBrowserPopupBlocked: (
		callback: (event: import("../../main/browser/popup-policy").BlockedPopup) => void,
	) => subscribe("lazify:browser-popup-blocked", callback),
	allowPopupsFrom: (sourceUrl: string): Promise<void> =>
		ipcRenderer.invoke("lazify:allow-popups-from", sourceUrl),
};
