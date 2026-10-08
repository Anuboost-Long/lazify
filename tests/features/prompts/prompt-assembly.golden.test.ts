import { describe, expect, it } from "vitest";

import { assemblePrompt, findPreset } from "@/features/prompts/lib/assemble";
import { BUILTIN_PRESETS } from "@/features/prompts/lib/builtin-presets";
import { renderContext } from "@/features/prompts/lib/context-types";
import { suggestPreset } from "@/features/prompts/lib/preset-suggester";
import type {
	BuildPromptInput,
	ContextEntry,
	PromptPreset,
} from "@/features/prompts/lib/types";

/**
 * Exact prompt text for fixed inputs. The snapshot file is the golden fixture:
 * moving prompt assembly anywhere must leave it byte-for-byte unchanged.
 */

const PROJECT = "/work/demo";

const presets: PromptPreset[] = BUILTIN_PRESETS.map((preset) => ({ ...preset, isBuiltin: true }));

let nextId = 0;
function entry(overrides: Partial<ContextEntry>): ContextEntry {
	nextId += 1;
	return {
		id: `entry-${nextId}`,
		scope: "project",
		scopeKey: PROJECT,
		type: "rule",
		category: "Coding Rules",
		payload: {},
		appliesTo: [],
		pack: "",
		isActive: true,
		sortOrder: nextId,
		...overrides,
	};
}

const entries: ContextEntry[] = [
	entry({ type: "fact", payload: { key: "framework", value: "Next.js 15." } }),
	entry({ type: "command", payload: { purpose: "run the tests.", command: "npm test" } }),
	entry({ type: "path", payload: { path: "src/app", holds: "the routes." } }),
	entry({
		type: "rule",
		payload: {
			strength: "forbidden",
			action: "edit generated files..",
			condition: "touching i18n",
			reason: "make:lang rewrites them.",
		},
	}),
	entry({ type: "rule", payload: { action: "keep diffs small" } }),
	entry({ type: "rule", payload: { strength: "preferred", action: "" } }),
	entry({ scope: "global", scopeKey: "", type: "rule", payload: { strength: "preferred", action: "use pnpm" } }),
	entry({ scope: "global", scopeKey: "", type: "fact", payload: { key: "os", value: "macOS" } }),
	entry({ isActive: false, type: "fact", payload: { key: "switched off", value: "never shown" } }),
	entry({ scopeKey: "/work/other", type: "fact", payload: { key: "other project", value: "never shown" } }),
	entry({ appliesTo: ["builtin-bug-fix"], type: "rule", payload: { action: "add a regression test" } }),
];

const input: BuildPromptInput = {
	projectPath: PROJECT,
	projectName: "Demo",
	presetId: null,
	taskName: "",
	description: "Add dark mode to the settings page.\n- add a theme toggle\n* persist the choice.",
	requirements: ["respect the system theme", "  "],
	notes: "  Design is in Figma.  ",
	priority: "high",
	deadline: " 2026-11-01 ",
};

describe("prompt assembly golden output", () => {
	it.each(presets.map((preset) => [preset.id, preset] as const))("%s", (_id, preset) => {
		expect(assemblePrompt(preset, entries, { ...input, presetId: preset.id })).toMatchSnapshot();
	});

	it("renders nothing without a preset", () => {
		expect(assemblePrompt(null, entries, input)).toMatchSnapshot();
	});

	it("renders a bare task: named, normal priority, no deadline, no context", () => {
		const bare: BuildPromptInput = {
			...input,
			taskName: "Dark mode",
			description: "",
			requirements: [],
			notes: "",
			priority: "normal",
			deadline: null,
		};
		expect(assemblePrompt(findPreset(presets, null), [], bare)).toMatchSnapshot();
	});

	it("falls back to the default preset for an unknown id", () => {
		expect(findPreset(presets, "missing")?.id).toMatchSnapshot();
	});

	it("renders each context line", () => {
		const lines = entries.map((item) => renderContext(item.type, item.payload));
		lines.push(renderContext("unknown" as ContextEntry["type"], { action: "fallback to rule" }));
		expect(lines).toMatchSnapshot();
	});

	it("suggests presets by keyword", () => {
		const texts = [
			"fix the crash on save",
			"refactor the store",
			"add a settings page",
			"write docs for the API",
			"",
		];
		expect(texts.map(suggestPreset)).toMatchSnapshot();
	});
});
