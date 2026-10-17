import { NetworkFilter } from "@ghostery/adblocker";
import { describe, expect, it } from "vitest";

import { shieldRules, urlFilterOf } from "@/shared/lib/browser/shield-rules";

const parse = (...lines: string[]) =>
	lines.map((line) => {
		const filter = NetworkFilter.parse(line, true);
		if (!filter) throw new Error(`not a network filter: ${line}`);
		return filter;
	});

const matches = (urlFilter: string, url: string) => new RegExp(urlFilter, "i").test(url);

describe("ABP patterns as the rule subset's regular expressions", () => {
	it("anchors || to a host and every subdomain of it, and ^ to a separator", () => {
		const { urlFilter } = urlFilterOf("||ads.example.com^") as { urlFilter: string };

		expect(matches(urlFilter, "https://ads.example.com/banner.js")).toBe(true);
		expect(matches(urlFilter, "https://cdn.ads.example.com/x")).toBe(true);
		expect(matches(urlFilter, "wss://ads.example.com:443/socket")).toBe(true);
		expect(matches(urlFilter, "https://notads.example.com/")).toBe(false);
		expect(matches(urlFilter, "https://ads.example.com.evil.net/")).toBe(false);
	});

	it("turns * into anything, | into the URL's ends, and escapes the rest", () => {
		const { urlFilter } = urlFilterOf("|https://example.com/ad?id=*.gif|") as { urlFilter: string };

		expect(urlFilter).toBe(String.raw`^https://example\.com/ad\?id=.*\.gif$`);
		expect(matches(urlFilter, "https://example.com/ad?id=42.gif")).toBe(true);
		expect(matches(urlFilter, "https://example.com/ad?id=42.gif?x")).toBe(false);
	});

	it("refuses what the subset can't say", () => {
		expect(urlFilterOf("/ad|banner/")).toEqual({ refused: "alternation or braces" });
		expect(urlFilterOf("||пример.рф^")).toEqual({ refused: "non-ASCII" });
	});
});

describe("Ghostery's filters as one rule list", () => {
	it("blocks a host everywhere, then lets the page the user asked for through", () => {
		const { rules } = shieldRules(parse("||tracker.example^"));

		expect(rules).toEqual([
			{ trigger: { urlFilter: rules[0]?.trigger.urlFilter }, action: { type: "block" } },
			{
				trigger: { urlFilter: ".*", resourceType: ["document"], loadType: ["first-party"] },
				action: { type: "ignore-previous-rules" },
			},
		]);
	});

	it("keeps resource types and the third-party condition, and adds documents only for frames", () => {
		const [script, frame] = shieldRules(parse("/ad-loader.$script,third-party", "||ads.example^$subdocument")).rules;

		expect(script?.trigger).toMatchObject({ resourceType: ["script"], loadType: ["third-party"] });
		expect(frame?.trigger).toMatchObject({ resourceType: ["document"] });
	});

	it("limits a filter to the sites it names, or spares the ones it excepts", () => {
		const [onSites, offSites] = shieldRules(parse("/banner.$image,domain=news.example|blog.example", "/banner2.$image,domain=~shop.example")).rules;

		expect(onSites?.trigger.ifDomain).toEqual(["*news.example", "*blog.example"]);
		expect(offSites?.trigger.unlessDomain).toEqual(["*shop.example"]);
	});

	it("puts exceptions after the blocks they undo, and $important blocks after both", () => {
		const { rules } = shieldRules(parse("||ads.example^$important", "@@||ads.example/ok.js^", "||cdn.example/ad.js"));

		expect(rules.map((rule) => rule.action.type)).toEqual(["block", "ignore-previous-rules", "block", "ignore-previous-rules"]);
		expect(rules[2]?.trigger.urlFilter).toContain(String.raw`ads\.example`);
	});

	it("turns whole-site allowlisting into an exception for that site's pages", () => {
		const { rules } = shieldRules(parse("@@||trusted.example^$document"));

		expect(rules[0]).toEqual({ trigger: { urlFilter: ".*", ifDomain: ["*trusted.example"] }, action: { type: "ignore-previous-rules" } });
	});

	it("leaves out what has no form in the subset, and says why", () => {
		const { rules, skipped } = shieldRules(
			parse("||ads.example^$redirect=noopjs", "||ads.example^$csp=script-src 'none'", "/^https?:\\/\\/ad/", "||ads.example^$removeparam=utm"),
		);

		expect(rules).toHaveLength(1);
		expect(skipped).toEqual({ redirect: 1, csp: 1, "regular expression": 1, removeparam: 1 });
	});

	it("drops a filter a $badfilter cancels, and the badfilter itself", () => {
		const { rules, skipped } = shieldRules(parse("||ads.example^", "||ads.example^$badfilter"));

		expect(rules).toHaveLength(1);
		expect(skipped).toEqual({ badfilter: 2 });
	});
});
