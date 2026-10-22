import type { BrowserViewNavigationRequest, BrowserViewState } from "@chain/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listeners: Record<string, (payload: never) => void> = {};
const create = vi.fn(async () => "view-1");
/** How the shield's start goes, per test: up at once unless a test holds it. */
let shieldStarting: () => Promise<void> = async () => undefined;
const answer = vi.fn(async () => undefined);
const openExternalUrl = vi.fn(async () => undefined);
let files: Record<string, string> = {};

vi.mock("@chain/sdk", () => ({
	desktop: {
		browserView: {
			create,
			close: vi.fn(async () => undefined),
			answer,
			onState: (listener: never) => (listeners.state = listener),
			onLoadFailed: (listener: never) => (listeners.failed = listener),
			onCrash: (listener: never) => (listeners.crash = listener),
			onClose: (listener: never) => (listeners.close = listener),
			onNavigationRequest: (listener: never) => (listeners.navigation = listener),
			onNewWindow: (listener: never) => (listeners.newWindow = listener),
		},
	},
}));

vi.mock("@/platform/folders", () => ({
	appDataPath: async () => "/data",
	readTextFile: async (path: string) => files[path] ?? null,
	writeTextFile: async (path: string, text: string) => {
		files[path] = text;
	},
}));

vi.mock("@/platform/system", () => ({ openExternalUrl }));

vi.mock("@/platform/lazy-shield", () => ({
	startLazyShield: () => shieldStarting(),
	isBlockedPopup: (url: string) => url === "https://blocked.example/",
}));

files = { "/data/popup-allowlist.json": JSON.stringify({ sites: ["trusted.com"] }) };

const { allowPopupsFrom, onBrowserOpenTab, onBrowserPopupBlocked, openGuest } = await import("@/platform/browser-view");

const BOUNDS = { x: 0, y: 0, width: 800, height: 600 };

const state = (patch: Partial<BrowserViewState>): BrowserViewState => ({
	id: "view-1",
	url: "https://example.com/",
	title: "",
	loading: false,
	canGoBack: false,
	canGoForward: false,
	...patch,
});

const request = (url: string, patch: Partial<BrowserViewNavigationRequest> = {}): BrowserViewNavigationRequest => ({
	id: "view-1",
	requestId: "request-1",
	url,
	kind: "other",
	sourceUrl: "https://example.com/",
	fromMainFrame: true,
	modifiers: { shift: false, control: false, alt: false, meta: false },
	button: null,
	inputAgeMs: null,
	...patch,
});

async function opened(session: "browser" | "preview", url = "https://example.com/") {
	const guest = openGuest(session, url, BOUNDS, true);
	const events: string[] = [];
	for (const type of ["dom-ready", "did-start-loading", "did-stop-loading", "did-navigate", "page-title-updated", "did-fail-load", "crashed"]) {
		guest.addEventListener(type, () => events.push(type));
	}
	await vi.waitFor(() => expect(events).toContain("dom-ready"));
	listeners.state(state({ url, loading: false }) as never);
	events.length = 0;
	return { guest, events };
}

beforeEach(() => {
	answer.mockClear();
	openExternalUrl.mockClear();
	create.mockClear();
	shieldStarting = async () => undefined;
});

describe("a guest's events", () => {
	it("tells a load from start to finish the way <webview> did", async () => {
		const { guest, events } = await opened("browser");

		listeners.state(state({ url: "https://example.com/next", loading: true }) as never);
		listeners.state(state({ url: "https://example.com/next", loading: true, title: "Next" }) as never);
		listeners.state(state({ url: "https://example.com/next", loading: false, title: "Next", canGoBack: true }) as never);

		expect(events).toEqual(["did-start-loading", "page-title-updated", "did-navigate", "did-stop-loading"]);
		expect(guest.getURL()).toBe("https://example.com/next");
		expect(guest.canGoBack()).toBe(true);
	});

	it("reports an in-page navigation, which never loads", async () => {
		const { events } = await opened("browser");

		listeners.state(state({ url: "https://example.com/#section" }) as never);

		expect(events).toEqual(["did-navigate"]);
	});

	it("passes a failure on with its reason, and a crash as a crash", async () => {
		const { guest } = await opened("browser");
		const failures: Event[] = [];
		guest.addEventListener("did-fail-load", (event) => failures.push(event));

		listeners.failed({ id: "view-1", url: "https://nope.invalid/", reason: "host-not-found", description: "not found", nativeCode: -1003, nativeDomain: "NSURLErrorDomain" } as never);

		expect(failures[0]).toMatchObject({ reason: "host-not-found", errorCode: -1003, validatedURL: "https://nope.invalid/", isMainFrame: true });
	});

	it("stays on a failed address, as Chromium's error page did, and retries it", async () => {
		const { desktop } = await import("@chain/sdk");
		const load = vi.fn(async () => undefined);
		Object.assign(desktop.browserView, { load, reload: vi.fn(async () => undefined) });
		const { guest, events } = await opened("browser");

		listeners.state(state({ url: "https://nope.invalid/", loading: true }) as never);
		listeners.failed({ id: "view-1", url: "https://nope.invalid/", reason: "host-not-found", description: "", nativeCode: -1003, nativeDomain: "" } as never);
		listeners.state(state({ url: "https://example.com/", loading: false }) as never);

		expect(guest.getURL()).toBe("https://nope.invalid/");
		expect(guest.getTitle()).toBe("nope.invalid");
		expect(events).toContain("did-fail-load");
		guest.reload();
		await vi.waitFor(() => expect(load).toHaveBeenCalledWith("view-1", "https://nope.invalid/"));

		listeners.state(state({ url: "https://nope.invalid/", loading: true }) as never);
		listeners.state(state({ url: "https://example.com/", loading: false }) as never);
		expect(guest.getURL()).toBe("https://example.com/");
	});
});

describe("the browser page's policy, carried out", () => {
	it("lets a same-site navigation go and holds a redirect nobody asked for", async () => {
		await opened("browser");
		const blocked = vi.fn();
		const stop = onBrowserPopupBlocked(blocked);

		listeners.navigation(request("https://example.com/other") as never);
		expect(answer).toHaveBeenLastCalledWith("request-1", true);

		listeners.navigation(request("https://ads.example.net/") as never);
		expect(answer).toHaveBeenLastCalledWith("request-1", false);
		expect(blocked).toHaveBeenCalledWith({ url: "https://ads.example.net/", sourceUrl: "https://example.com/", kind: "redirect" });
		stop();
	});

	it("turns a Cmd-click into a background tab and keeps the view where it is", async () => {
		await opened("browser");
		const opens = vi.fn();
		const stop = onBrowserOpenTab(opens);

		listeners.navigation(request("https://example.com/b", { kind: "link", modifiers: { shift: false, control: false, alt: false, meta: true } }) as never);

		expect(answer).toHaveBeenLastCalledWith("request-1", false);
		expect(opens).toHaveBeenCalledWith({ url: "https://example.com/b", background: true });
		stop();
	});

	it("measures 'the same site' against the page shown, not the load under way", async () => {
		await opened("browser");
		const blocked = vi.fn();
		const stop = onBrowserPopupBlocked(blocked);

		listeners.state(state({ url: "https://ads.example.net/", loading: true }) as never);
		listeners.navigation(request("https://ads.example.net/again") as never);

		expect(blocked).toHaveBeenCalledWith(expect.objectContaining({ sourceUrl: "https://example.com/" }));
		stop();
	});

	it("refuses a popup Lazy Shield's lists name", async () => {
		await opened("browser");
		const opens = vi.fn();
		const blocked = vi.fn();
		const stops = [onBrowserOpenTab(opens), onBrowserPopupBlocked(blocked)];

		listeners.newWindow({ ...request("https://blocked.example/"), features: {} } as never);

		expect(opens).not.toHaveBeenCalled();
		expect(blocked).not.toHaveBeenCalled();
		stops.forEach((stop) => stop());
	});

	it("opens popups from a site the user trusted, and remembers a new one", async () => {
		await opened("browser", "https://trusted.com/");
		const opens = vi.fn();
		const stop = onBrowserOpenTab(opens);

		listeners.newWindow({ ...request("https://accounts.google.com/"), features: {} } as never);
		expect(opens).toHaveBeenCalledWith({ url: "https://accounts.google.com/", background: false });

		await allowPopupsFrom("https://www.example.com/page");
		expect(JSON.parse(files["/data/popup-allowlist.json"] ?? "{}")).toEqual({ sites: ["trusted.com", "example.com"] });
		stop();
	});
});

describe("the agent preview's policy, carried out", () => {
	it("keeps loopback in the panel and sends the web to the system browser", async () => {
		await opened("preview", "http://localhost:5173/");

		listeners.navigation(request("http://localhost:5173/about", { sourceUrl: "http://localhost:5173/" }) as never);
		expect(answer).toHaveBeenLastCalledWith("request-1", true);

		listeners.navigation(request("https://react.dev/") as never);
		expect(answer).toHaveBeenLastCalledWith("request-1", false);
		expect(openExternalUrl).toHaveBeenCalledWith("https://react.dev/");
	});
});

// Electron's lazy-shield-startup cases, on Chain's mechanism: the browser's
// view isn't created until the shield is up, for at most 5 s. Electron's "on
// the session before the engine is built" has no counterpart — the rules only
// exist once built.
describe("the browser's first page and Lazy Shield", () => {
	it("holds the first page until the shield can answer for it", async () => {
		let raise = () => {};
		shieldStarting = () => new Promise<void>((resolve) => (raise = resolve));

		openGuest("browser", "https://example.com/", BOUNDS, true);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(create).not.toHaveBeenCalled();

		raise();
		await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
	});

	it("lets the page through, unfiltered, when the shield takes too long", async () => {
		vi.useFakeTimers();
		shieldStarting = () => new Promise<void>(() => {});

		openGuest("browser", "https://example.com/", BOUNDS, true);
		await vi.advanceTimersByTimeAsync(4_999);
		expect(create).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(create).toHaveBeenCalledOnce();
		vi.useRealTimers();
	});

	it("never makes the agent preview wait for it", async () => {
		shieldStarting = () => new Promise<void>(() => {});

		openGuest("preview", "http://localhost:5173/", BOUNDS, true);

		await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
	});
});
