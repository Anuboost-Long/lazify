import type { FiltersEngine } from "@ghostery/adblocker";
import { parse } from "tldts-experimental";

/** What the page script reports once the DOM exists: names it hasn't reported before. */
export interface DomFeatures {
	classes?: string[];
	hrefs?: string[];
	ids?: string[];
}

export interface CosmeticAnswer {
	styles: string;
	scripts: string[];
}

/**
 * Hosts that get network filtering but no cosmetic filtering.
 *
 * YouTube builds its player lazily: the watch page renders, and the player is
 * only constructed once its container is actually on screen. Cosmetic filtering
 * hides elements, and hiding anything the player is waiting behind means it is
 * never built at all — no player element, and not so much as a request for one.
 */
const NO_COSMETIC_HOSTS = [/(^|\.)youtube\.com$/, /(^|\.)youtube-nocookie\.com$/];

function cosmeticAllowed(url: string): boolean {
	try {
		return !NO_COSMETIC_HOSTS.some((host) => host.test(new URL(url).hostname));
	} catch {
		return true;
	}
}

/**
 * What a page should hide and run, as `@ghostery/adblocker-electron`'s
 * `onInjectCosmeticFilters` asks the engine. The first call for a page (no
 * features) gets the page's base and hostname rules; later ones only the
 * rules its new classes, ids and links bring in.
 *
 * `url` is the frame's address as the web engine reports it, never the page's
 * own claim.
 */
export function cosmeticAnswer(engine: FiltersEngine, url: string, features?: DomFeatures): CosmeticAnswer | null {
	if (!cosmeticAllowed(url)) return null;

	const { hostname, domain } = parse(url);
	const isFirstRun = features === undefined;
	const { active, styles, scripts } = engine.getCosmeticsFilters({
		domain: domain ?? "",
		hostname: hostname ?? "",
		url,
		classes: features?.classes,
		hrefs: features?.hrefs,
		ids: features?.ids,
		getBaseRules: isFirstRun,
		getInjectionRules: isFirstRun,
		getExtendedRules: false,
		getRulesFromHostname: isFirstRun,
		getRulesFromDOM: !isFirstRun,
	});

	return active ? { styles, scripts } : null;
}
