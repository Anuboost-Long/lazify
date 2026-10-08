import { describe, expect, it } from "vitest";

import { detectProjectStack } from "@/shared/lib/stack-detection/detect-stack";

import { memoryReader } from "./memory-reader";
import { DIFFERENT_BY_DESIGN, STACK_DETECTION_CASES } from "./stack-detection.cases";

describe("detectProjectStack golden", () => {
	for (const { name, tree } of STACK_DETECTION_CASES) {
		it.skipIf(DIFFERENT_BY_DESIGN.has(name))(name, async () => {
			expect(await detectProjectStack(memoryReader(tree))).toMatchSnapshot();
		});
	}
});
