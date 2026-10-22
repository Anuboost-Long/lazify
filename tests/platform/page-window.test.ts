import { beforeEach, describe, expect, it, vi } from "vitest";

const listeners: Record<string, (payload: never) => void> = {};
let nextView = 1;
const create = vi.fn(async () => `view-${nextView++}`);
const close = vi.fn(async () => undefined);
const load = vi.fn(async () => undefined);
const answer = vi.fn(async () => undefined);
const openExternalUrl = vi.fn(async () => undefined);

vi.mock("@chain/sdk", () => ({
	desktop: {
		browserView: {
			create,
			close,
			load,
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
	readTextFile: async () => null,
	writeTextFile: async () => undefined,
}));
vi.mock("@/platform/system", () => ({ openExternalUrl }));
vi.mock("@/platform/lazy-shield", () => ({ startLazyShield: async () => undefined, isBlockedPopup: () => false }));

const pageWindow = await import("@/platform/page-window");

const CLOSED = { open: false, url: null, source: null };
const changes: unknown[] = [];
pageWindow.onPictureInPictureChanged((state) => changes.push(state));

beforeEach(async () => {
	await pageWindow.closePictureInPicture();
	vi.clearAllMocks();
	changes.length = 0;
});

describe("the page window", () => {
	it("floats the browser page's page on its session, following the page's navigations", async () => {
		const state = await pageWindow.openPictureInPicture("https://example.com/", "browser");

		expect(state).toEqual({ open: true, url: "https://example.com/", source: "browser" });
		await vi.waitFor(() => expect(create).toHaveBeenCalled());
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ url: "https://example.com/", session: "lazify-web", floating: {}, decideNavigation: false }),
		);
		expect(changes).toEqual([state]);
	});

	it("holds the preview's window to this machine", async () => {
		expect(await pageWindow.openPictureInPicture("https://example.com/", "preview")).toEqual(CLOSED);
		expect(create).not.toHaveBeenCalled();

		await pageWindow.openPictureInPicture("http://localhost:5173/", "preview");
		await vi.waitFor(() => expect(create).toHaveBeenCalled());
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ session: "lazify-preview", floating: {}, decideNavigation: true }),
		);
	});

	it("sends every popup to the system browser, the browser page's too", async () => {
		await pageWindow.openPictureInPicture("https://example.com/", "browser");
		await vi.waitFor(() => expect(create).toHaveBeenCalled());
		const id = await create.mock.results[0].value;

		listeners.newWindow({ id, url: "https://other.example/", modifiers: { shift: false, control: false, alt: false, meta: false }, button: null } as never);

		expect(openExternalUrl).toHaveBeenCalledWith("https://other.example/");
	});

	it("re-points the window on the same surface, and replaces it for the other one", async () => {
		await pageWindow.openPictureInPicture("http://localhost:3000/", "preview");
		await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1));
		const first = await create.mock.results[0].value;

		await pageWindow.openPictureInPicture("http://localhost:3000/next", "preview");
		await vi.waitFor(() => expect(load).toHaveBeenCalledWith(first, "http://localhost:3000/next"));
		expect(create).toHaveBeenCalledTimes(1);

		const state = await pageWindow.openPictureInPicture("https://example.com/", "browser");
		expect(state.source).toBe("browser");
		await vi.waitFor(() => expect(close).toHaveBeenCalledWith(first));
		await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(2));
	});

	it("hears the user close it from its title bar", async () => {
		await pageWindow.openPictureInPicture("https://example.com/", "browser");
		await vi.waitFor(() => expect(create).toHaveBeenCalled());
		const id = await create.mock.results[0].value;
		await vi.waitFor(() => expect(listeners.close).toBeDefined());
		await new Promise((resolve) => setTimeout(resolve));

		listeners.close({ id } as never);

		expect(await pageWindow.getPictureInPictureState()).toEqual(CLOSED);
		expect(changes.at(-1)).toEqual(CLOSED);
		expect(close).not.toHaveBeenCalled();
	});

	it("answers closed when the window couldn't be made", async () => {
		create.mockRejectedValueOnce(new Error("UNSUPPORTED"));

		await pageWindow.openPictureInPicture("https://example.com/", "browser");

		await vi.waitFor(() => expect(changes.at(-1)).toEqual(CLOSED));
	});
});
