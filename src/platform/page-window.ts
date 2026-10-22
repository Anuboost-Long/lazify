import type { PictureInPictureSource, PictureInPictureState } from "@/shared/lib/media/picture-in-picture";
import { isLoopbackUrl } from "@/shared/lib/browser/preview-guard";

import { openFloatingGuest, type Guest } from "./browser-view";

const CLOSED: PictureInPictureState = { open: false, url: null, source: null };

let floater: Guest | null = null;
const listeners = new Set<(state: PictureInPictureState) => void>();

/** `url` is the address just asked for, which the view reports only once its load starts. */
function currentState(url = floater?.getURL()): PictureInPictureState {
	return floater ? { open: true, url: url || null, source: floater.session } : CLOSED;
}

function announce(url?: string) {
	const state = currentState(url);
	listeners.forEach((listener) => listener(state));
	return state;
}

export const getPictureInPictureState = async () => currentState();

export async function closePictureInPicture(): Promise<PictureInPictureState> {
	if (!floater) return CLOSED;

	floater.close();
	floater = null;
	return announce();
}

/**
 * Opens the one floating window, or re-points it — from either surface. A
 * view's session is fixed, so a page from the other surface gets a new window
 * on that surface's session rather than the old one's sign-ins.
 */
export async function openPictureInPicture(url: string, source: PictureInPictureSource): Promise<PictureInPictureState> {
	if (source === "preview" && !isLoopbackUrl(url)) return currentState();

	if (floater?.session === source) {
		void floater.loadURL(url).catch(() => undefined);
		return announce(url);
	}

	floater?.close();
	const guest = openFloatingGuest(source, url);
	guest.addEventListener("closed", () => {
		if (floater !== guest) return;
		floater = null;
		announce();
	});
	floater = guest;
	return announce(url);
}

export function onPictureInPictureChanged(callback: (state: PictureInPictureState) => void): () => void {
	listeners.add(callback);
	return () => {
		listeners.delete(callback);
	};
}
