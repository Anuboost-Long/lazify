import {
	desktop,
	type BrowserViewBounds,
	type BrowserViewLoadFailure,
	type BrowserViewNavigationRequest,
	type BrowserViewNewWindow,
	type BrowserViewState,
} from "@chain/sdk";

import {
	USER_ACTIVATION_MS,
	decideBrowserNavigation,
	decideBrowserNewWindow,
	decidePreviewNavigation,
	decidePreviewNewWindow,
	type BrowserGuestContext,
	type GuestDecision,
} from "@/shared/lib/browser/guest-policy";
import { siteOf, type BlockedPopup } from "@/shared/lib/browser/popup-policy";
import { BROWSER_SESSION, PREVIEW_SESSION } from "@/shared/lib/browser/preview-guard";
import { logError } from "@/shared/lib/diagnostics/logger";

import { appDataPath, readTextFile, writeTextFile } from "./folders";
import { openExternalUrl } from "./system";

export type GuestSession = "browser" | "preview";

/** Native code measures input when it arrives and Lazify reads it a moment later; one click must not count twice. */
const SAME_INPUT_MS = 50;

/**
 * One embedded page, driven the way the ported renderer drove Electron's
 * `<webview>`: the same methods, and the same events dispatched on it. Every
 * call is queued behind the view's creation, so a page can drive it at once.
 */
export class Guest extends EventTarget {
	readonly #id: Promise<string>;
	#state: BrowserViewState;
	/** The page the view shows, which `state.url` stops being the moment a load starts. */
	#pageUrl: string;
	/**
	 * An address that failed to load. WebKit leaves the view on the page before
	 * it, where Chromium showed an error page at the failed address; this keeps
	 * Chromium's answer, so the address bar and "Try again" mean the failed one.
	 */
	#failedUrl: string | null = null;
	#spentInputAt = 0;
	#closed = false;

	constructor(
		readonly session: GuestSession,
		url: string,
		id: Promise<string>,
	) {
		super();
		this.#state = { id: "", url, title: "", loading: true, canGoBack: false, canGoForward: false };
		this.#pageUrl = url;
		this.#id = id;
	}

	/** The view exists now: route its events here, or close it if the page already let go. */
	attach(id: string) {
		guests.set(id, this);
		if (this.#closed) this.close();
		else this.#emit("dom-ready");
	}

	getURL = () => this.#failedUrl ?? this.#state.url;
	getTitle = () => (this.#failedUrl ? hostOf(this.#failedUrl) : this.#state.title);
	canGoBack = () => this.#state.canGoBack;
	canGoForward = () => this.#state.canGoForward;

	loadURL = (url: string) => this.#id.then((id) => desktop.browserView.load(id, url));
	reload = () =>
		this.#drive((id) =>
			this.#failedUrl ? desktop.browserView.load(id, this.#failedUrl) : desktop.browserView.reload(id),
		);
	stop = () => this.#drive((id) => desktop.browserView.stop(id));
	goBack = () => this.#drive((id) => desktop.browserView.back(id));
	goForward = () => this.#drive((id) => desktop.browserView.forward(id));

	place = (bounds: BrowserViewBounds) => this.#drive((id) => desktop.browserView.setBounds(id, bounds));
	show = (visible: boolean) => this.#drive((id) => desktop.browserView.setVisible(id, visible));

	close() {
		this.#closed = true;
		void this.#id.then((id) => {
			guests.delete(id);
			return desktop.browserView.close(id);
		}).catch(() => undefined);
	}

	/** WebKit has no programmatic inspector; the preview's view is inspectable from its right-click menu. */
	openDevTools = () => undefined;
	closeDevTools = () => undefined;
	isDevToolsOpened = () => false;

	/** Running script inside a view is a later chain-sdk request (media picture-in-picture). */
	executeJavaScript = () => Promise.reject(new Error("Running script in a page isn't available in Lazify Chain yet."));
	getWebContentsId = () => -1;

	receiveState(next: BrowserViewState) {
		const previous = this.#state;
		this.#state = next;
		if (!next.loading) this.#pageUrl = next.url;

		if (next.loading && !previous.loading) {
			this.#failedUrl = null;
			this.#emit("did-start-loading");
		}
		if (next.title && next.title !== previous.title) this.#emit("page-title-updated", { title: next.title });
		if (!next.loading && (previous.loading || next.url !== previous.url)) this.#emit("did-navigate", { url: this.getURL() });
		if (!next.loading && previous.loading) this.#emit("did-stop-loading");
	}

	receiveFailure({ url, reason, description, nativeCode }: BrowserViewLoadFailure) {
		this.#failedUrl = url;
		this.#emit("did-fail-load", {
			reason,
			errorCode: nativeCode,
			errorDescription: description,
			validatedURL: url,
			isMainFrame: true,
		});
		this.#emit("did-navigate", { url });
	}

	receiveCrash() {
		this.#emit("crashed");
	}

	decideNavigation(request: BrowserViewNavigationRequest) {
		const decision =
			this.session === "browser" ? decideBrowserNavigation(request, this.#context()) : decidePreviewNavigation(request);

		void desktop.browserView.answer(request.requestId, decision.action === "allow").catch(() => undefined);
		carryOut(decision);
	}

	decideNewWindow(request: BrowserViewNewWindow) {
		carryOut(this.session === "browser" ? decideBrowserNewWindow(request, this.#context()) : decidePreviewNewWindow(request));
	}

	#context(): BrowserGuestContext {
		return {
			pageUrl: this.#pageUrl,
			isOpenerAllowed,
			spendUserActivation: (inputAgeMs) => {
				if (inputAgeMs === null || inputAgeMs > USER_ACTIVATION_MS) return false;

				const inputAt = Date.now() - inputAgeMs;
				if (inputAt <= this.#spentInputAt + SAME_INPUT_MS) return false;

				this.#spentInputAt = inputAt;
				return true;
			},
		};
	}

	#drive(call: (id: string) => Promise<void>) {
		void this.#id.then(call).catch(() => undefined);
	}

	#emit(type: string, detail: Record<string, unknown> = {}) {
		this.dispatchEvent(Object.assign(new Event(type), detail));
	}
}

/** What Chromium titled its error page: the host that failed. */
function hostOf(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
}

const guests = new Map<string, Guest>();

export function openGuest(session: GuestSession, url: string, bounds: BrowserViewBounds, visible: boolean): Guest {
	listenToViews();

	const id = loadAllowedOpeners().then(() =>
		desktop.browserView.create({
			url,
			session: session === "browser" ? BROWSER_SESSION : PREVIEW_SESSION,
			bounds,
			visible,
			decideNavigation: true,
			allowFullscreen: true,
			swipeNavigation: session === "browser",
			inspectable: session === "preview",
		}),
	);
	const guest = new Guest(session, url, id);
	id.then(
		(viewId) => guest.attach(viewId),
		(error) => logError("browser", "A page couldn't be placed in the window", error),
	);

	return guest;
}

let listening = false;

/** One subscription per event for every view, each routed to its guest by id. */
function listenToViews() {
	if (listening) return;
	listening = true;

	desktop.browserView.onState((state) => guests.get(state.id)?.receiveState(state));
	desktop.browserView.onLoadFailed((failure) => guests.get(failure.id)?.receiveFailure(failure));
	desktop.browserView.onCrash((crash) => guests.get(crash.id)?.receiveCrash());
	desktop.browserView.onNavigationRequest((request) => {
		const guest = guests.get(request.id);
		if (guest) guest.decideNavigation(request);
		else void desktop.browserView.answer(request.requestId, false).catch(() => undefined);
	});
	desktop.browserView.onNewWindow((request) => guests.get(request.id)?.decideNewWindow(request));
}

const openTabListeners = new Set<(event: { url: string; background: boolean }) => void>();
const blockedPopupListeners = new Set<(blocked: BlockedPopup) => void>();

function carryOut(decision: GuestDecision) {
	switch (decision.action) {
		case "open-tab":
			openTabListeners.forEach((listener) => listener({ url: decision.url, background: decision.background }));
			break;
		case "hold":
			blockedPopupListeners.forEach((listener) => listener(decision.blocked));
			break;
		case "open-externally":
			void openExternalUrl(decision.url).catch(() => undefined);
			break;
		default:
			break;
	}
}

function subscribe<T>(listeners: Set<T>, listener: T): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export const onBrowserOpenTab = (callback: (event: { url: string; background: boolean }) => void) =>
	subscribe(openTabListeners, callback);

export const onBrowserPopupBlocked = (callback: (blocked: BlockedPopup) => void) =>
	subscribe(blockedPopupListeners, callback);

// ── Sites trusted with popups ────────────────────────────────────────────────
// Keyed by the site doing the opening, the same thing a browser remembers.
// Electron's `popup-allowlist.json`, carried over by the first-launch import.

const ALLOW_FILE = "popup-allowlist.json";
let allowedOpeners: Promise<void> | null = null;
let allowedSites = new Set<string>();

const allowPath = async () => `${await appDataPath()}/${ALLOW_FILE}`;

function loadAllowedOpeners(): Promise<void> {
	allowedOpeners ??= allowPath()
		.then(readTextFile)
		.then((text) => {
			const { sites } = JSON.parse(text ?? "{}") as { sites?: unknown };
			if (Array.isArray(sites)) allowedSites = new Set(sites.filter((site): site is string => typeof site === "string"));
		})
		.catch(() => undefined);

	return allowedOpeners;
}

function isOpenerAllowed(sourceUrl: string): boolean {
	const site = siteOf(sourceUrl);
	return site !== "" && allowedSites.has(site);
}

/** Remembers that the page's site may open popups from now on. */
export async function allowPopupsFrom(sourceUrl: string): Promise<void> {
	const site = siteOf(sourceUrl);
	if (!site) return;

	await loadAllowedOpeners();
	if (allowedSites.has(site)) return;
	allowedSites.add(site);

	try {
		await writeTextFile(await allowPath(), JSON.stringify({ sites: [...allowedSites] }));
	} catch {
		// The allowance still holds for this run; only its memory is lost.
	}
}
