// @vitest-environment jsdom
import { Terminal } from "@xterm/xterm";
import { beforeEach, describe, expect, it } from "vitest";

import {
	forgetAllColorSchemes,
	forgetColorScheme,
	reportSchemeChange,
	schemeIsStale,
	watchColorScheme,
} from "@renderer/shared/terminal/color-scheme-notify";

/**
 * An agent picks its light or dark palette once, at startup, and the ones that
 * want to hear about a change say so with DEC private mode 2031. These run the
 * real parser, because what matters is that the subscription is recognised in
 * the middle of everything else a TUI sets on its way up.
 */

const written: { runId: string; data: string }[] = [];
const write = (runId: string, data: string) => written.push({ runId, data });

let theme = "dark";

const feed = (term: Terminal, data: string) =>
	new Promise<void>((resolve) => term.write(data, resolve));

function watched(runId: string) {
	const term = new Terminal({ allowProposedApi: true });

	watchColorScheme(
		term,
		() => runId,
		() => theme,
		write,
	);

	return term;
}

beforeEach(() => {
	written.length = 0;
	theme = "dark";
	forgetAllColorSchemes();
});

describe("watchColorScheme", () => {
	it("tells a subscriber the scheme changed, and leaves everyone else alone", async () => {
		const subscriber = watched("agent");
		watched("shell");

		await feed(subscriber, "\x1b[?1004h\x1b[?2031h\x1b[?25l");

		reportSchemeChange("light", write);

		expect(written).toEqual([{ runId: "agent", data: "\x1b[?997;2n" }]);
	});

	it("reports dark the same way", async () => {
		const term = watched("agent");

		await feed(term, "\x1b[?2031h");
		reportSchemeChange("dark", write);

		expect(written).toEqual([{ runId: "agent", data: "\x1b[?997;1n" }]);
	});

	it("stops once the subscription is dropped", async () => {
		const term = watched("agent");

		await feed(term, "\x1b[?2031h");
		await feed(term, "\x1b[?2031l");
		reportSchemeChange("light", write);

		forgetColorScheme("agent");

		expect(written).toEqual([]);
	});

	it("answers the question about the scheme in use", async () => {
		const term = watched("agent");

		theme = "light";
		await feed(term, "\x1b[?996n");

		expect(written).toEqual([{ runId: "agent", data: "\x1b[?997;2n" }]);
	});

	it("calls a session stale once the theme moves away from what it was told", async () => {
		const term = watched("agent");

		await feed(term, "\x1b]11;?\x07");

		expect(schemeIsStale("agent", "dark")).toBe(false);
		expect(schemeIsStale("agent", "light")).toBe(true);
	});

	it("keeps the answer the session actually got when its backlog is replayed", async () => {
		const term = watched("agent");

		await feed(term, "\x1b]11;?\x07");

		theme = "light";
		// What a rebuilt terminal does: the startup query goes through the parser
		// a second time, long after the program asked it.
		await feed(watched("agent"), "\x1b]11;?\x07");

		expect(schemeIsStale("agent", "light")).toBe(true);
	});

	it("never calls a subscriber stale, because it has been told", async () => {
		const term = watched("agent");

		await feed(term, "\x1b]11;?\x07\x1b[?2031h");
		reportSchemeChange("light", write);

		expect(schemeIsStale("agent", "light")).toBe(false);
	});

	it("says nothing about a session that never asked", () => {
		expect(schemeIsStale("shell", "light")).toBe(false);
	});

	it("leaves the modes and reports that are xterm's to handle", async () => {
		const term = watched("agent");

		await feed(term, "\x1b[?2004h");

		expect(term.modes.bracketedPasteMode).toBe(true);
		expect(written).toEqual([]);
	});
});
