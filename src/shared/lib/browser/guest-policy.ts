import type { BrowserViewInitiator, BrowserViewNavigationRequest, BrowserViewNewWindow } from "@chain/sdk";

import { isCrossSite, type BlockedPopup } from "./popup-policy";
import { isLoopbackUrl } from "./preview-guard";

/**
 * How long after a click or a keypress a page may still be taken to be acting
 * on it. Long enough for a click that has to ask a server where it is going;
 * far short of the pause an ad loader waits out before it moves the page.
 */
export const USER_ACTIVATION_MS = 3_000;

export type GuestDecision =
	| { action: "allow" }
	| { action: "refuse" }
	| { action: "open-tab"; url: string; background: boolean }
	| { action: "hold"; blocked: BlockedPopup }
	| { action: "open-externally"; url: string };

export interface BrowserGuestContext {
	/** The page the view shows — what "the same site" is measured against. */
	pageUrl: string;
	isOpenerAllowed: (sourceUrl: string) => boolean;
	/** True once per real click or key press, inside the activation window. */
	spendUserActivation: (inputAgeMs: number | null) => boolean;
}

const refuse: GuestDecision = { action: "refuse" };
const allow: GuestDecision = { action: "allow" };

/** Cmd, Ctrl or the middle button: the user wants it waiting for them, not in front of them. */
const wantsBackground = ({ modifiers, button }: BrowserViewInitiator) =>
	modifiers.meta || modifiers.control || button === "middle";

const wantsNewTab = (initiator: BrowserViewInitiator) => wantsBackground(initiator) || initiator.modifiers.shift;

/**
 * Whether a popup may become a tab on its own: a popup to the site the user is
 * already on is the site's own doing and passes, and anything leading
 * elsewhere is held for the user unless they have already trusted this site.
 */
function deliver(url: string, background: boolean, context: BrowserGuestContext): GuestDecision {
	const sourceUrl = context.pageUrl;
	if (!isCrossSite(url, sourceUrl) || context.isOpenerAllowed(sourceUrl)) {
		return { action: "open-tab", url, background };
	}

	return { action: "hold", blocked: { url, sourceUrl, kind: "popup" } };
}

/**
 * The browser page's view is leaving for another address.
 *
 * Same-site navigation is the site's own business. A departure to somewhere
 * else has to be attributable to the user: something no page asked for, an
 * allowance they granted, or something they just did — and a single click is
 * spent when it is used, so it can't stand as consent for a stream of
 * departures. A frame steering the page it is embedded in never is, whatever
 * the timing, since the click that "authorised" it landed on a video player.
 */
export function decideBrowserNavigation(
	request: BrowserViewNavigationRequest,
	context: BrowserGuestContext,
): GuestDecision {
	if (request.kind === "history" || request.kind === "reload") return allow;

	// WebKit reports a modified click on a plain link as a navigation, where
	// Chromium asked for a new window. It means a tab either way.
	if (request.kind === "link" && request.fromMainFrame && wantsNewTab(request)) {
		return deliver(request.url, wantsBackground(request), context);
	}

	const { url } = request;
	const pageUrl = context.pageUrl;
	if (!isCrossSite(url, pageUrl)) return allow;
	if (context.isOpenerAllowed(pageUrl)) return allow;

	// No source at all means no page asked for this.
	if (!request.sourceUrl) return allow;

	if (request.fromMainFrame && context.spendUserActivation(request.inputAgeMs)) return allow;

	return { action: "hold", blocked: { url, sourceUrl: pageUrl, kind: "redirect" } };
}

/** A popup never gets a chromeless window of its own; it becomes a tab, or waits for the user. */
export function decideBrowserNewWindow(request: BrowserViewNewWindow, context: BrowserGuestContext): GuestDecision {
	return deliver(request.url, wantsBackground(request), context);
}

/**
 * The agent preview shows what a project serves on this machine. A link that
 * leads off it is not an error — it is just not that panel's job, so it
 * leaves for the user's real browser.
 */
export function decidePreviewNavigation(request: BrowserViewNavigationRequest): GuestDecision {
	if (request.kind === "history" || request.kind === "reload") return allow;

	return isLoopbackUrl(request.url) ? allow : { action: "open-externally", url: request.url };
}

/** A popup with no chrome would be a dead end inside the panel. */
export function decidePreviewNewWindow(request: BrowserViewNewWindow): GuestDecision {
	return /^https?:/i.test(request.url) ? { action: "open-externally", url: request.url } : refuse;
}
