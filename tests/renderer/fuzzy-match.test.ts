import { describe, expect, it } from "vitest";

import { fuzzyMatch, prepareTarget } from "../../src/renderer/shared/lib/fuzzy/fuzzy";

function match(query: string, text: string) {
	return fuzzyMatch(query, prepareTarget(text));
}

function score(query: string, text: string) {
	return match(query, text)?.score ?? Number.NEGATIVE_INFINITY;
}

describe("scoring a query against a name", () => {
	it("turns down anything the query is not a subsequence of", () => {
		expect(match("xyz", "use-agent-terminals")).toBeNull();
		expect(match("tau", "use-agent-terminals")).toBeNull();
	});

	it("reports where every character landed", () => {
		const found = match("uat", "use-agent-terminals");

		expect(found?.positions).toEqual([0, 4, 10]);
	});

	it("prefers word boundaries over an incidental run of letters", () => {
		expect(score("uat", "use-agent-terminals")).toBeGreaterThan(score("uat", "quaint-hat"));
	});

	it("prefers consecutive characters", () => {
		expect(score("age", "agent-picker")).toBeGreaterThan(score("age", "a-good-example"));
	});

	it("matches an empty query against anything, and nothing longer than its target", () => {
		expect(match("", "anything")).toEqual({ score: 0, positions: [] });
		expect(match("toolong", "short")).toBeNull();
	});
});
