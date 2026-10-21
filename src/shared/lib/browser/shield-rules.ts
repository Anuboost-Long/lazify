import type { BrowserViewRule, BrowserViewRuleTrigger } from "@chain/sdk";
import type { NetworkFilter } from "@ghostery/adblocker";

/**
 * Ghostery's network filters as a `desktop.browserView` rule list.
 *
 * Electron asked the engine about every request; WebKit takes rules up front
 * and decides itself. Each filter becomes the content-blocker rule that blocks
 * the same URLs for the same pages, or nothing at all when the subset can't
 * say it — a filter left out lets something through, a filter guessed at
 * could break a page.
 *
 * Electron's engine never cancelled the page the user asked for, only what
 * pages load. The list therefore ends by letting every first-party document
 * through: the page asked for is always first-party to itself, and ad frames
 * come from elsewhere. (A condition per rule on the page's own address said
 * the same, and made WebKit's compiled list 150 MB and two minutes to build.)
 */
export interface ShieldRules {
	rules: BrowserViewRule[];
	/** Filters with no form in the rule subset, by why. */
	skipped: Record<string, number>;
}

type ResourceType = NonNullable<BrowserViewRuleTrigger["resourceType"]>[number];

const URL_START = "^[^:]+://";
/** A host and any of its subdomains, as `||` means. */
const HOST_START = String.raw`${URL_START}([^/]+\.)?`;
/** ABP's `^`: anything that can't be part of a host or a path segment's word. */
const SEPARATOR = "[^a-zA-Z0-9_.%-]";

const escapeRegex = (text: string) => text.replaceAll(/[.+?()[\]\\$]/g, String.raw`\$&`);

/** The address part of a raw filter line, before its options. */
function patternOf(rawLine: string): string {
	const line = rawLine.startsWith("@@") ? rawLine.slice(2) : rawLine;
	const options = line.lastIndexOf("$");
	return options === -1 ? line : line.slice(0, options);
}

/** ABP's pattern syntax as a regular expression in the subset, or why it can't be one. */
export function urlFilterOf(pattern: string): { urlFilter: string } | { refused: string } {
	if (/[^\x20-\x7e]/.test(pattern)) return { refused: "non-ASCII" };

	let rest = pattern;
	let start = "";
	if (rest.startsWith("||")) {
		start = HOST_START;
		rest = rest.slice(2);
	} else if (rest.startsWith("|")) {
		start = "^";
		rest = rest.slice(1);
	}

	let end = "";
	if (rest.endsWith("|")) {
		end = "$";
		rest = rest.slice(0, -1);
	}

	if (rest.includes("|") || rest.includes("{") || rest.includes("}")) return { refused: "alternation or braces" };

	const body = rest
		.split("*")
		.map((part) => part.split("^").map(escapeRegex).join(SEPARATOR))
		.join(".*");

	const urlFilter = `${start}${body}${end}`;
	return urlFilter === "" ? { urlFilter: ".*" } : { urlFilter };
}

const TYPE_FLAGS: Array<[(filter: NetworkFilter) => boolean, ResourceType]> = [
	[(filter) => filter.fromImage(), "image"],
	[(filter) => filter.fromStylesheet(), "style-sheet"],
	[(filter) => filter.fromScript(), "script"],
	[(filter) => filter.fromFont(), "font"],
	[(filter) => filter.fromMedia(), "media"],
	[(filter) => filter.fromPing(), "ping"],
	[(filter) => filter.fromXmlHttpRequest(), "fetch"],
	[(filter) => filter.fromWebsocket(), "websocket"],
	[(filter) => filter.fromOther() || filter.fromObject(), "other"],
];

/** The page's site conditions: `domain=a.com|~b.com`. Ghostery keeps the names only in debug mode. */
function domainsOf(filter: NetworkFilter): Pick<BrowserViewRuleTrigger, "ifDomain" | "unlessDomain"> | null {
	const parts = filter.domains?.parts;
	if (!parts) return {};

	const names = parts.split(",").flatMap((part) => part.split("|")).filter(Boolean);
	// `google.*` names every country's Google; the subset has no such wildcard.
	const usable = names.filter((name) => !name.endsWith(".*"));
	const included = usable.filter((name) => !name.startsWith("~")).map((name) => `*${name}`);
	const excluded = usable.filter((name) => name.startsWith("~")).map((name) => `*${name.slice(1)}`);

	// Only one of the two may be given; the sites it applies on matter more than
	// the few it then spares.
	if (included.length > 0) return { ifDomain: included };
	// Every site it names was a wildcard: sparing only its exceptions would apply it everywhere else.
	if (names.some((name) => !name.startsWith("~"))) return null;
	if (excluded.length > 0) return { unlessDomain: excluded };
	return null;
}

const unsupported = (filter: NetworkFilter): string | null => {
	if (filter.isFullRegex()) return "regular expression";
	if (filter.isRedirect()) return "redirect";
	if (filter.isCSP()) return "csp";
	if (filter.isRemoveParam()) return "removeparam";
	if (filter.isReplace()) return "replace";
	if (filter.denyallow) return "denyallow";
	if (filter.isGenericHide() || filter.isSpecificHide()) return "cosmetic exception";
	return null;
};

/** Whole-site allowlisting, `@@||example.com^$document`: nothing on that site's pages is blocked. */
function siteAllowance(filter: NetworkFilter): BrowserViewRule | null {
	if (!filter.isException() || !filter.fromDocument() || !filter.isHostnameAnchor() || filter.hasFilter()) return null;

	const host = filter.getHostname();
	return host ? { trigger: { urlFilter: ".*", ifDomain: [`*${host}`] }, action: { type: "ignore-previous-rules" } } : null;
}

/** Last, so no rule — not even an `$important` one — cancels the page the user asked for. */
const PAGE_ASKED_FOR: BrowserViewRule = {
	trigger: { urlFilter: ".*", resourceType: ["document"], loadType: ["first-party"] },
	action: { type: "ignore-previous-rules" },
};

type Group = "block" | "allow" | "important";

type Converted = { group: Group; rule: BrowserViewRule } | { skipped: string };

const groupOf = (filter: NetworkFilter): Group => {
	if (filter.isException()) return "allow";
	return filter.isImportant() ? "important" : "block";
};

/** One filter as one rule. */
function convert(filter: NetworkFilter): Converted {
	const allowance = siteAllowance(filter);
	if (allowance) return { group: "allow", rule: allowance };

	const why = unsupported(filter);
	if (why) return { skipped: why };

	const converted = urlFilterOf(patternOf(filter.rawLine ?? ""));
	if ("refused" in converted) return { skipped: converted.refused };

	const domains = domainsOf(filter);
	if (domains === null) return { skipped: "only wildcard domains" };

	const base: BrowserViewRuleTrigger = {
		urlFilter: converted.urlFilter,
		...(filter.isCaseSensitive ? { urlFilterIsCaseSensitive: true } : {}),
		...(filter.thirdParty() && !filter.firstParty() ? { loadType: ["third-party" as const] } : {}),
		...(filter.firstParty() && !filter.thirdParty() ? { loadType: ["first-party" as const] } : {}),
		...domains,
	};

	const action = { type: filter.isException() ? "ignore-previous-rules" : "block" } as BrowserViewRule["action"];
	const framed = filter.fromAny() || filter.fromSubdocument() || filter.fromDocument();
	const types = TYPE_FLAGS.filter(([has]) => has(filter)).map(([, type]) => type);
	if (!framed && types.length === 0) return { skipped: "no resource type left" };

	const trigger: BrowserViewRuleTrigger = {
		...base,
		...(filter.fromAny() ? {} : { resourceType: framed ? [...types, "document"] : types }),
	};

	return { group: groupOf(filter), rule: { trigger, action } };
}

export function shieldRules(filters: readonly NetworkFilter[]): ShieldRules {
	const skipped: Record<string, number> = {};
	const skip = (reason: string) => {
		skipped[reason] = (skipped[reason] ?? 0) + 1;
	};

	const cancelled = new Set(filters.filter((filter) => filter.isBadFilter()).map((filter) => filter.getIdWithoutBadFilter()));
	const groups: Record<Group, BrowserViewRule[]> = {
		block: [],
		allow: [],
		important: [],
	};

	for (const filter of filters) {
		if (filter.isBadFilter() || cancelled.has(filter.getId())) {
			skip("badfilter");
			continue;
		}

		const converted = convert(filter);
		if ("skipped" in converted) skip(converted.skipped);
		else groups[converted.group].push(converted.rule);
	}

	// Exceptions undo only the rules before them in their own list, and an
	// `$important` block is the one an exception mustn't undo.
	return { rules: [...groups.block, ...groups.allow, ...groups.important, PAGE_ASKED_FOR], skipped };
}
