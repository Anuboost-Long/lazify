import path from "node:path";

import { session, type Session } from "electron";

import { BROWSER_PARTITION } from "./preview-guard";

/**
 * The browser session's guest-side scripts, owned in one place.
 *
 * Two things want a preload there, so each is registered under its own id and
 * replaced on its own — whoever changes one must not silently take the other
 * one down, or turning the shield off would take swipe navigation with it.
 */

const GESTURE_PRELOAD = path.join(__dirname, "../../preload/browser-gesture.js");
const GESTURE_ID = "lazify-browser-gesture";
const SHIELD_ID = "lazify-browser-shield";

let shieldPreload: string | null = null;

function unregister(ses: Session, id: string): void {
	if (ses.getPreloadScripts().some((script) => script.id === id)) ses.unregisterPreloadScript(id);
}

function register(ses: Session, id: string, filePath: string): void {
	unregister(ses, id);
	ses.registerPreloadScript({ id, type: "frame", filePath });
}

function apply(): void {
	const ses = session.fromPartition(BROWSER_PARTITION);

	register(ses, GESTURE_ID, GESTURE_PRELOAD);

	if (shieldPreload) register(ses, SHIELD_ID, shieldPreload);
	else unregister(ses, SHIELD_ID);
}

/** Called at startup, before any guest exists to miss it. */
export function attachBrowserPreloads(): void {
	apply();
}

/** The shield's script comes and goes with the shield; the gesture stays. */
export function setShieldPreload(preloadPath: string | null): void {
	shieldPreload = preloadPath;
	apply();
}
