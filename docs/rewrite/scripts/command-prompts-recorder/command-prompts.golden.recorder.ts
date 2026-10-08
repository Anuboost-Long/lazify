import { describe, expect, it } from "vitest";

import { detectCommandChoicePrompt } from "../../../../../lazify/src/main/command-runner";
import { PROMPT_OUTPUTS } from "../../../../tests/platform/commands/command-prompts.cases";

describe("detectCommandChoicePrompt golden", () => {
	for (const [name, output] of PROMPT_OUTPUTS) {
		it(name, () => {
			expect(detectCommandChoicePrompt(output)).toMatchSnapshot();
		});
	}
});
