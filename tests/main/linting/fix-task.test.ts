import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { Diagnostic, FindingReference } from "../../../src/main/linting/types";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-fix-task-"));

vi.mock("electron", () => ({ app: { getPath: () => userDataPath } }));

const { createFixTask, describeFixTask } = await import("../../../src/main/linting/fix-task");
const { getTask } = await import("../../../src/main/tasks/task-store");
const { buildPromptForTask } = await import("../../../src/main/tasks/task-prompt");
const { initPromptBuilder } = await import("../../../src/main/prompts");

// The shipped presets are put in place at startup; a fresh database has none,
// and a task with no preset behind it renders to nothing.
initPromptBuilder();

const PROJECT = "/home/dev/shop";

function finding(over: Partial<Diagnostic> = {}, filePath = "src/cart.ts"): FindingReference {
	return {
		diagnostic: {
			source: "sonarlint",
			rule: "sonarlint/typescript:S1764",
			code: "S1764",
			message: 'Correct one of the identical sub-expressions on both sides of operator "&&"',
			url: "https://sonarsource.github.io/rspec/#/rspec/S1764/javascript",
			line: 7,
			column: 7,
			endLine: 7,
			endColumn: 21,
			...over,
		},
		filePath: path.join(PROJECT, filePath),
		snippet: "if (total > 1 && total > 1) return 0;",
		snippetStartLine: 5,
	};
}

const dead = finding({
	rule: "sonarlint/typescript:S1854",
	code: "S1854",
	message: 'Remove this useless assignment to variable "total".',
	url: "https://sonarsource.github.io/rspec/#/rspec/S1854/javascript",
	line: 12,
	endLine: 12,
});

describe("a batch of findings, written down as a task", () => {
	it("names one finding by its rule and its file", () => {
		const described = describeFixTask({ projectPath: PROJECT, findings: [finding()] });

		expect(described?.name).toBe("Fix S1764 in src/cart.ts");
	});

	it("counts a batch, and says how many files it spans", () => {
		const oneFile = describeFixTask({ projectPath: PROJECT, findings: [finding(), dead] });
		const spread = describeFixTask({
			projectPath: PROJECT,
			findings: [finding(), finding({}, "src/checkout.ts")],
		});

		expect(oneFile?.name).toBe("Fix 2 SonarQube for IDE findings in src/cart.ts");
		expect(spread?.name).toBe("Fix 2 SonarQube for IDE findings across 2 files");
	});

	it("makes each finding one requirement, so the work is a checklist", () => {
		const described = describeFixTask({ projectPath: PROJECT, findings: [finding(), dead] });

		expect(described?.requirements).toEqual([
			'S1764 · src/cart.ts:7 — Correct one of the identical sub-expressions on both sides of operator "&&"',
			'S1854 · src/cart.ts:12 — Remove this useless assignment to variable "total".',
		]);
	});

	it("keeps the rule pages and the code in the notes", () => {
		const described = describeFixTask({ projectPath: PROJECT, findings: [finding(), dead] });

		expect(described?.notes).toContain(
			"S1764  https://sonarsource.github.io/rspec/#/rspec/S1764/javascript",
		);
		expect(described?.notes).toContain(
			"S1854  https://sonarsource.github.io/rspec/#/rspec/S1854/javascript",
		);
		expect(described?.notes).toContain("src/cart.ts:7 (S1764), shown from line 5:");
		expect(described?.notes).toContain("```ts\nif (total > 1 && total > 1) return 0;\n```");
	});

	it("lists a rule page once however many findings quote it", () => {
		const described = describeFixTask({
			projectPath: PROJECT,
			findings: [finding(), finding({ line: 20, endLine: 20 })],
		});
		const mentions = described?.notes.split("rspec/S1764/javascript").length ?? 0;

		expect(mentions - 1).toBe(1);
	});

	it("names a file outside the project in full, not as a walk out of it", () => {
		const described = describeFixTask({
			projectPath: PROJECT,
			findings: [{ ...finding(), filePath: "/elsewhere/vendor/lib.js" }],
		});

		expect(described?.name).toBe("Fix S1764 in /elsewhere/vendor/lib.js");
	});

	it("says out loud when the code was too long to include", () => {
		const many = Array.from({ length: 400 }, (_, index) =>
			finding({ line: index + 1, endLine: index + 1 }),
		);
		const described = describeFixTask({ projectPath: PROJECT, findings: many });

		expect(described?.requirements).toHaveLength(400);
		expect(described?.notes).toMatch(/\(\d+ more findings listed above without code\.\)/);
	});

	it("describes nothing when nothing was selected", () => {
		expect(describeFixTask({ projectPath: PROJECT, findings: [] })).toBeNull();
	});
});

describe("the stored task", () => {
	it("lands in the database as a todo an agent prompt can be built from", () => {
		const created = createFixTask({ projectPath: PROJECT, findings: [finding(), dead] });

		expect(created).not.toBeNull();
		expect(created?.status).toBe("todo");
		expect(created?.priority).toBe("normal");
		expect(created?.requirements).toHaveLength(2);

		const stored = getTask(created!.id);
		expect(stored?.name).toBe(created?.name);
		expect(stored?.requirements).toEqual(created?.requirements);

		// The whole point of storing it: an agent can be handed it later.
		const prompt = buildPromptForTask(created!.id);
		expect(prompt?.prompt).toContain("S1764");
		expect(prompt?.prompt).toContain("src/cart.ts:7");
	});
});
