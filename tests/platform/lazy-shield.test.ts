import type { BrowserViewMessage } from "@chain/sdk";
import { beforeAll, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
let answer: ((message: BrowserViewMessage) => unknown) | null = null;
const files: Record<string, string> = {
	"/data/lazy-shield-lists.json": JSON.stringify({
		savedAt: Date.now(),
		lists: ["||ads.example^\n##.ad-banner\n||popunder.example^$popup"],
		resources: JSON.stringify({ scriptlets: [], redirects: [] }),
	}),
};

vi.mock("@chain/sdk", () => ({
	desktop: {
		http: { get: vi.fn() },
		browserView: {
			setRules: vi.fn(async ({ session, rules }: { session: string; rules: unknown[] }) => {
				calls.push(`setRules ${session} ${rules.length}`);
			}),
			removeRules: vi.fn(async ({ session }: { session: string }) => {
				calls.push(`removeRules ${session}`);
			}),
			setScript: vi.fn(async ({ session }: { session: string }) => {
				calls.push(`setScript ${session}`);
			}),
			removeScript: vi.fn(async ({ session }: { session: string }) => {
				calls.push(`removeScript ${session}`);
			}),
			handleMessages: (handler: (message: BrowserViewMessage) => unknown) => {
				answer = handler;
				return () => {
					answer = null;
				};
			},
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

vi.mock("@/shared/lib/browser/shield-page.js?raw", () => ({ default: "/* page script */" }));

const { getLazyShieldState, isBlockedPopup, setLazyShield } = await import("@/platform/lazy-shield");

const ask = (message: unknown, url = "https://news.example/") =>
	answer?.({ id: "view-1", frame: { url, mainFrame: true }, message });

beforeAll(async () => {
	expect(await getLazyShieldState()).toEqual({ enabled: true, ready: true, blocked: 0 });
});

describe("Lazy Shield", () => {
	it("comes up on by default, with its rules and page script on the browser session only", () => {
		// One network rule ($popup has no rule form), and the closing rule that spares the page asked for.
		expect(calls).toEqual(["setRules lazify-web 2", "setScript lazify-web"]);
	});

	it("answers the page script's question from the frame Chain reports, and nothing else", () => {
		const reported = { type: "lazy-shield/cosmetics", features: { classes: ["ad-banner"], ids: [], hrefs: [] } };
		expect(ask(reported)).toMatchObject({ styles: expect.stringContaining(".ad-banner") });
		expect(ask({ type: "something-else" })).toBeNull();
		expect(ask("not even an object")).toBeNull();
		expect(ask({ type: "lazy-shield/cosmetics" }, "https://www.youtube.com/watch?v=1")).toBeNull();
	});

	it("keeps what a page sends to names, and only so many", () => {
		const flood = { type: "lazy-shield/cosmetics", features: { classes: [...Array(10_000).keys()].map(String).concat([{} as never]), ids: "x" } };
		expect(() => ask(flood)).not.toThrow();
	});

	it("refuses a popup its lists name while on", () => {
		// Asked as a document, as Electron asked: a plain host filter names it.
		expect(isBlockedPopup("https://ads.example/landing", "https://news.example/")).toBe(true);
		expect(isBlockedPopup("https://fine.example/", "https://news.example/")).toBe(false);
	});

	it("takes everything away when switched off, and remembers it", async () => {
		calls.length = 0;
		expect(await setLazyShield(false)).toEqual({ enabled: false, ready: true, blocked: 0 });

		expect(calls).toEqual(["removeRules lazify-web", "removeScript lazify-web"]);
		expect(answer).toBeNull();
		expect(isBlockedPopup("https://ads.example/landing", "https://news.example/")).toBe(false);
		expect(JSON.parse(files["/data/lazy-shield.json"] ?? "{}")).toEqual({ enabled: false });
	});
});
