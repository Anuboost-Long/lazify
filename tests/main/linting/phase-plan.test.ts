import { describe, expect, it } from "vitest";

import type { FindingReference } from "../../../src/main/linting";
import {
	commonFolder,
	phaseOptions,
	planFixPhases,
} from "../../../src/main/linting/scan/phase-plan";
import type { ScanFileFindings } from "../../../src/main/linting/scan/types";

/**
 * What a phase promises: whole files only, in path order, with the findings
 * spread evenly enough that no round is the whole job.
 */

const file = (path: string, findings: number): ScanFileFindings => ({
	path,
	findings: Array.from({ length: findings }, () => ({}) as FindingReference),
});

const shape = (files: ScanFileFindings[], phases: number) =>
	planFixPhases(files, phases).map((phase) => phase.files.map((entry) => entry.path));

describe("planFixPhases", () => {
	it("keeps every file, once, in path order", () => {
		const files = [file("src/b.tsx", 3), file("src/a.tsx", 1), file("src/c.tsx", 2)];

		expect(shape(files, 2)).toEqual([["src/a.tsx", "src/b.tsx"], ["src/c.tsx"]]);
	});

	it("spreads findings rather than files", () => {
		const files = [
			file("src/a.tsx", 20),
			file("src/b.tsx", 1),
			file("src/c.tsx", 1),
			file("src/d.tsx", 18),
		];

		expect(planFixPhases(files, 2).map((phase) => phase.findingCount)).toEqual([20, 20]);
		expect(shape(files, 2)).toEqual([["src/a.tsx"], ["src/b.tsx", "src/c.tsx", "src/d.tsx"]]);
	});

	it("never returns more phases than there are files", () => {
		expect(planFixPhases([file("src/a.tsx", 4)], 5)).toHaveLength(1);
		expect(shape([file("src/a.tsx", 1), file("src/b.tsx", 1)], 4)).toEqual([
			["src/a.tsx"],
			["src/b.tsx"],
		]);
	});

	it("answers nothing for an empty report", () => {
		expect(planFixPhases([], 3)).toEqual([]);
		expect(phaseOptions(0)).toEqual([1]);
	});
});

describe("commonFolder", () => {
	it("names the folder every file shares", () => {
		expect(commonFolder([file("src/features/a/one.tsx", 1), file("src/features/a/two.tsx", 1)])).toBe(
			"src/features/a",
		);
	});

	it("stops at the first segment that differs", () => {
		expect(commonFolder([file("src/a/one.tsx", 1), file("src/b/two.tsx", 1)])).toBe("src");
	});
});
