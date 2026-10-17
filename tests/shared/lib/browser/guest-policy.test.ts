import type { BrowserViewInitiator, BrowserViewNavigationRequest, BrowserViewNewWindow } from "@chain/sdk";
import { describe, expect, it } from "vitest";

import {
	USER_ACTIVATION_MS,
	decideBrowserNavigation,
	decideBrowserNewWindow,
	decidePreviewNavigation,
	decidePreviewNewWindow,
	type BrowserGuestContext,
} from "@/shared/lib/browser/guest-policy";

const PAGE = "https://www.youtube.com/watch?v=1";

const initiator = (patch: Partial<BrowserViewInitiator> = {}): BrowserViewInitiator => ({
	sourceUrl: PAGE,
	fromMainFrame: true,
	modifiers: { shift: false, control: false, alt: false, meta: false },
	button: null,
	inputAgeMs: null,
	...patch,
});

const navigation = (
	url: string,
	patch: Partial<BrowserViewNavigationRequest> = {},
): BrowserViewNavigationRequest => ({
	id: "view-1",
	requestId: "request-1",
	url,
	kind: "other",
	...initiator(),
	...patch,
});

const newWindow = (url: string, patch: Partial<BrowserViewInitiator> = {}): BrowserViewNewWindow => ({
	id: "view-1",
	url,
	features: {},
	...initiator(patch),
});

/** Like the platform's: a fresh click counts once, then is spent. */
function context(patch: Partial<BrowserGuestContext> = {}): BrowserGuestContext {
	let spent = false;
	return {
		pageUrl: PAGE,
		isOpenerAllowed: () => false,
		isBlockedPopup: () => false,
		spendUserActivation: (inputAgeMs) => {
			if (spent || inputAgeMs === null || inputAgeMs > USER_ACTIVATION_MS) return false;
			spent = true;
			return true;
		},
		...patch,
	};
}

const AD = "https://bet.example-ads.com/";

describe("the browser page's navigations", () => {
	it("lets the user's own history moves and reloads through", () => {
		expect(decideBrowserNavigation(navigation(AD, { kind: "history" }), context())).toEqual({ action: "allow" });
		expect(decideBrowserNavigation(navigation(AD, { kind: "reload" }), context())).toEqual({ action: "allow" });
	});

	it("never inspects a move within the same site", () => {
		const request = navigation("https://youtube.com/feed", { inputAgeMs: null });
		expect(decideBrowserNavigation(request, context())).toEqual({ action: "allow" });
	});

	it("lets a site the user trusted with popups leave for anywhere", () => {
		const trusted = context({ isOpenerAllowed: (source) => source === PAGE });
		expect(decideBrowserNavigation(navigation(AD), trusted)).toEqual({ action: "allow" });
	});

	it("takes a departure no page asked for as the user's", () => {
		expect(decideBrowserNavigation(navigation(AD, { sourceUrl: "" }), context())).toEqual({ action: "allow" });
	});

	it("follows a cross-site link the user just clicked, once", () => {
		const shared = context();
		expect(decideBrowserNavigation(navigation(AD, { kind: "link", inputAgeMs: 120 }), shared)).toEqual({
			action: "allow",
		});
		expect(decideBrowserNavigation(navigation(AD, { inputAgeMs: 900 }), shared)).toEqual({
			action: "hold",
			blocked: { url: AD, sourceUrl: PAGE, kind: "redirect" },
		});
	});

	it("holds a page redirecting itself on a timer with nobody touching it", () => {
		expect(decideBrowserNavigation(navigation(AD, { inputAgeMs: USER_ACTIVATION_MS + 1 }), context())).toEqual({
			action: "hold",
			blocked: { url: AD, sourceUrl: PAGE, kind: "redirect" },
		});
		expect(decideBrowserNavigation(navigation(AD, { inputAgeMs: null }), context()).action).toBe("hold");
	});

	it("never lets a nested frame steer the page, however recent the click", () => {
		const request = navigation(AD, { fromMainFrame: false, sourceUrl: "https://ads.example.net/frame", inputAgeMs: 10 });
		expect(decideBrowserNavigation(request, context())).toEqual({
			action: "hold",
			blocked: { url: AD, sourceUrl: PAGE, kind: "redirect" },
		});
	});

	it("opens a Cmd-, Ctrl- or middle-clicked link in a background tab, and Shift in a front one", () => {
		const sameSite = "https://www.youtube.com/watch?v=2";
		const meta = navigation(sameSite, { kind: "link", modifiers: { shift: false, control: false, alt: false, meta: true } });
		const control = navigation(sameSite, { kind: "link", modifiers: { shift: false, control: true, alt: false, meta: false } });
		const middle = navigation(sameSite, { kind: "link", button: "middle" });
		const shift = navigation(sameSite, { kind: "link", modifiers: { shift: true, control: false, alt: false, meta: false } });

		for (const request of [meta, control, middle]) {
			expect(decideBrowserNavigation(request, context())).toEqual({ action: "open-tab", url: sameSite, background: true });
		}
		expect(decideBrowserNavigation(shift, context())).toEqual({ action: "open-tab", url: sameSite, background: false });
	});

	it("holds a modified click that leads to another site, like any popup", () => {
		const request = navigation(AD, { kind: "link", modifiers: { shift: false, control: false, alt: false, meta: true } });
		expect(decideBrowserNavigation(request, context())).toEqual({
			action: "hold",
			blocked: { url: AD, sourceUrl: PAGE, kind: "popup" },
		});
	});
});

describe("the browser page's popups", () => {
	it("opens a same-site popup as a tab without asking", () => {
		expect(decideBrowserNewWindow(newWindow("https://youtube.com/embed"), context())).toEqual({
			action: "open-tab",
			url: "https://youtube.com/embed",
			background: false,
		});
	});

	it("keeps a modified click's wish for a background tab", () => {
		expect(decideBrowserNewWindow(newWindow("https://youtube.com/x", { button: "middle" }), context())).toEqual({
			action: "open-tab",
			url: "https://youtube.com/x",
			background: true,
		});
	});

	it("holds a cross-site popup for the user, unless the site is trusted", () => {
		expect(decideBrowserNewWindow(newWindow(AD), context())).toEqual({
			action: "hold",
			blocked: { url: AD, sourceUrl: PAGE, kind: "popup" },
		});
		expect(decideBrowserNewWindow(newWindow(AD), context({ isOpenerAllowed: () => true }))).toEqual({
			action: "open-tab",
			url: AD,
			background: false,
		});
	});
});

describe("Lazy Shield's lists", () => {
	it("refuse a popup they name, without offering it", () => {
		const shielded = context({ isBlockedPopup: (url) => url === AD, isOpenerAllowed: () => true });

		expect(decideBrowserNewWindow(newWindow(AD), shielded)).toEqual({ action: "refuse" });
		const click = navigation(AD, { kind: "link", modifiers: { shift: false, control: false, alt: false, meta: true } });
		expect(decideBrowserNavigation(click, shielded)).toEqual({ action: "refuse" });
	});
});

describe("the agent preview", () => {
	it("stays on this machine", () => {
		expect(decidePreviewNavigation(navigation("http://localhost:5173/about"))).toEqual({ action: "allow" });
		expect(decidePreviewNavigation(navigation("http://app.localhost:3000/"))).toEqual({ action: "allow" });
	});

	it("sends everything else to the system browser", () => {
		expect(decidePreviewNavigation(navigation("https://react.dev/"))).toEqual({
			action: "open-externally",
			url: "https://react.dev/",
		});
	});

	it("lets the user's own history moves and reloads through", () => {
		expect(decidePreviewNavigation(navigation("https://react.dev/", { kind: "history" }))).toEqual({ action: "allow" });
	});

	it("turns every popup into the system browser, and drops what it can't open", () => {
		expect(decidePreviewNewWindow(newWindow("https://react.dev/"))).toEqual({
			action: "open-externally",
			url: "https://react.dev/",
		});
		expect(decidePreviewNewWindow(newWindow("about:blank"))).toEqual({ action: "refuse" });
	});
});
