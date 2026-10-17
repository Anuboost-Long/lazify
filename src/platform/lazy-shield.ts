import { desktop, type BrowserViewMessage } from "@chain/sdk";
import { FiltersEngine, Request, fetchLists, fetchResources, fullLists, parseFilters, type Fetch } from "@ghostery/adblocker";

import type { LazyShieldState } from "@/shared/lib/browser/lazy-shield";
import { BROWSER_SESSION } from "@/shared/lib/browser/preview-guard";
import { cosmeticAnswer, type DomFeatures } from "@/shared/lib/browser/shield-cosmetics";
import pageScript from "@/shared/lib/browser/shield-page.js?raw";
import { shieldRules } from "@/shared/lib/browser/shield-rules";
import { logError, logInfo } from "@/shared/lib/diagnostics/logger";

import { appDataPath, readTextFile, writeTextFile } from "./folders";

/** One rule list and one page script on the browser session, both named this. */
const SHIELD_ID = "lazy-shield";

// ── The lists ────────────────────────────────────────────────────────────────
// Ghostery's full set, as Electron's `fromPrebuiltFull` fetched it, kept as
// text: the engine is built from it for cosmetics and popups, and the rules
// WebKit applies are converted from it.

const CACHE_FILE = "lazy-shield-lists.json";
/** Rules go stale; past this the lists are fetched again. */
const MAX_CACHE_AGE_MS = 3 * 24 * 60 * 60 * 1000;

interface CachedLists {
	savedAt: number;
	lists: string[];
	resources: string;
}

const cachePath = async () => `${await appDataPath()}/${CACHE_FILE}`;

/** Fetched without the page's CORS rules, which the list hosts don't answer for. */
const chainFetch: Fetch = async (url) => {
	const response = await desktop.http.get<string>(url, { timeout: 60_000, validateStatus: () => true });
	if (!response.ok) throw new Error(`${url} answered ${response.status}`);

	const text = response.body;
	return {
		text: async () => text,
		json: async () => JSON.parse(text),
		arrayBuffer: async () => new TextEncoder().encode(text).buffer,
	};
};

async function readCachedLists(): Promise<CachedLists | null> {
	try {
		const cached = JSON.parse((await readTextFile(await cachePath())) ?? "") as CachedLists;
		return Date.now() - cached.savedAt > MAX_CACHE_AGE_MS ? null : cached;
	} catch {
		return null;
	}
}

async function fetchFreshLists(): Promise<CachedLists> {
	const [lists, resources] = await Promise.all([fetchLists(chainFetch, fullLists), fetchResources(chainFetch)]);
	const fresh = { savedAt: Date.now(), lists, resources };

	try {
		await writeTextFile(await cachePath(), JSON.stringify(fresh));
	} catch {
		// A cache we cannot write just means the next start fetches again.
	}

	return fresh;
}

// ── The engine ───────────────────────────────────────────────────────────────

interface Shield {
	engine: FiltersEngine;
	rules: ReturnType<typeof shieldRules>["rules"];
}

let built: Shield | null = null;
/** In flight while the shield is being built; shared by everything waiting. */
let building: Promise<Shield> | null = null;

async function build(): Promise<Shield> {
	const { lists, resources } = (await readCachedLists()) ?? (await fetchFreshLists());
	const text = lists.join("\n");

	const engine = FiltersEngine.parse(text, { enableMutationObserver: true });
	engine.updateResources(resources, `${resources.length}`);

	const { rules, skipped } = shieldRules(parseFilters(text, { debug: true, loadCosmeticFilters: false }).networkFilters);
	logInfo("lazy-shield", `${rules.length} rules; left out by kind`, skipped);

	built = { engine, rules };
	return built;
}

function shieldReady(): Promise<Shield> {
	building ??= build().catch((error: unknown) => {
		building = null;
		throw error;
	});
	return building;
}

// ── On and off ───────────────────────────────────────────────────────────────

let enabled = false;
let stopAnswering: (() => void) | null = null;

export function getLazyShieldState(): Promise<LazyShieldState> {
	return startLazyShield().then(() => ({ enabled, ready: built !== null, blocked: 0 }));
}

/**
 * Turns filtering on or off for the browser session. Enabling the first time
 * builds the shield, so it is awaited; pages use it from their next load.
 */
export async function setLazyShield(next: boolean): Promise<LazyShieldState> {
	if (next !== enabled) {
		if (next) await raise();
		else await lower();
		await persistPreference(enabled);
	}

	return { enabled, ready: built !== null, blocked: 0 };
}

async function raise() {
	const { rules } = await shieldReady();
	const session = BROWSER_SESSION;

	const started = performance.now();
	await desktop.browserView.setRules({ session, id: SHIELD_ID, rules });
	logInfo("lazy-shield", `Rules in place after ${Math.round(performance.now() - started)} ms`);
	await desktop.browserView.setScript({ session, id: SHIELD_ID, source: pageScript });
	stopAnswering = desktop.browserView.handleMessages(answer);
	enabled = true;
}

async function lower() {
	const session = BROWSER_SESSION;
	stopAnswering?.();
	stopAnswering = null;
	enabled = false;

	await desktop.browserView.removeRules({ session, id: SHIELD_ID });
	await desktop.browserView.removeScript({ session, id: SHIELD_ID });
}

// ── The page script's questions ──────────────────────────────────────────────
// Asked from inside pages, so nothing in a message is trusted: the frame's
// address comes from the web engine, and the answer is only public filter
// output any page could compute from the lists.

const MAX_NAMES = 4096;

const names = (value: unknown): string[] | undefined =>
	Array.isArray(value) ? value.filter((name): name is string => typeof name === "string").slice(0, MAX_NAMES) : undefined;

function featuresOf(message: unknown): DomFeatures | undefined {
	const features = (message as { features?: unknown } | null)?.features;
	if (typeof features !== "object" || features === null) return undefined;

	const { classes, hrefs, ids } = features as Record<string, unknown>;
	return { classes: names(classes), hrefs: names(hrefs), ids: names(ids) };
}

function answer({ frame, message }: BrowserViewMessage) {
	if ((message as { type?: unknown } | null)?.type !== "lazy-shield/cosmetics") return null;
	if (!enabled || !built) return null;

	return cosmeticAnswer(built.engine, frame.url, featuresOf(message));
}

/**
 * Whether a popup the lists name should be refused rather than become a tab.
 * Popups never load as a frame the rules would catch, so the engine is asked
 * directly, as Electron's `shouldBlockPopup` did.
 */
export function isBlockedPopup(url: string, sourceUrl: string): boolean {
	if (!enabled || !built || !url) return false;

	return built.engine.match(Request.fromRawDetails({ type: "document", url, sourceUrl })).match;
}

// ── Preference ───────────────────────────────────────────────────────────────

const PREF_FILE = "lazy-shield.json";

async function persistPreference(value: boolean) {
	try {
		await writeTextFile(`${await appDataPath()}/${PREF_FILE}`, JSON.stringify({ enabled: value }));
	} catch {
		// Not worth failing a toggle over.
	}
}

async function readPreference(): Promise<boolean> {
	try {
		const raw = JSON.parse((await readTextFile(`${await appDataPath()}/${PREF_FILE}`)) ?? "") as { enabled?: boolean };
		return raw.enabled === true;
	} catch {
		// On by default: a shield the user never asked to lower stays up.
		return true;
	}
}

let starting: Promise<void> | null = null;

/**
 * Restores the saved preference, once, before the browser's first page loads.
 * A failed list fetch leaves the shield down rather than the browser broken;
 * the user can retry from the toolbar.
 */
export function startLazyShield(): Promise<void> {
	starting ??= readPreference().then(async (wanted) => {
		if (!wanted) return;

		try {
			await raise();
		} catch (error) {
			logError("lazy-shield", "Failed to enable at startup", error);
		}
	});

	return starting;
}
