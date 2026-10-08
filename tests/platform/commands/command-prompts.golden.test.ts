import { describe, expect, it } from "vitest";

import { detectCommandChoicePrompt } from "@/platform/command-runner";

import { PROMPT_OUTPUTS } from "./command-prompts.cases";

describe("detectCommandChoicePrompt golden", () => {
	for (const [name, output] of PROMPT_OUTPUTS) {
		it(name, () => {
			expect(detectCommandChoicePrompt(output)).toMatchSnapshot();
		});
	}
});
