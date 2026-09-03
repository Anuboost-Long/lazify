import { describe, expect, it } from "vitest";

import { parseFlow } from "../../../src/main/diagnostic-tests/flow/parse-flow";
import { toValidatedFlowYaml } from "../../../src/main/diagnostic-tests/recorder/flow-yaml";
import {
	collapseSteps,
	type RecordedStep,
} from "../../../src/main/diagnostic-tests/recorder/recorded-step";

function step(partial: Partial<RecordedStep> & Pick<RecordedStep, "kind">): RecordedStep {
	return { at: 0, description: "", ...partial };
}

describe("collapseSteps", () => {
	it("keeps only the final value typed into a field", () => {
		const collapsed = collapseSteps([
			step({ kind: "input", selector: { id: "email" }, value: "a" }),
			step({ kind: "input", selector: { id: "email" }, value: "ab@example.com" }),
		]);

		expect(collapsed).toHaveLength(1);
		expect(collapsed[0].value).toBe("ab@example.com");
	});

	it("drops the navigation a tap caused", () => {
		const collapsed = collapseSteps([
			step({ kind: "open", url: "http://localhost/login", at: 0 }),
			step({ kind: "tap", selector: { text: "Sign in" }, at: 100 }),
			step({ kind: "open", url: "http://localhost/dashboard", at: 400 }),
		]);

		expect(collapsed.map((entry) => entry.kind)).toEqual(["open", "tap"]);
	});

	it("keeps a navigation the user made on their own", () => {
		const collapsed = collapseSteps([
			step({ kind: "tap", selector: { text: "Sign in" }, at: 0 }),
			step({ kind: "open", url: "http://localhost/users", at: 9000 }),
		]);

		expect(collapsed.map((entry) => entry.kind)).toEqual(["tap", "open"]);
	});
});

describe("toValidatedFlowYaml", () => {
	it("writes a flow the runner can read back", () => {
		const text = toValidatedFlowYaml({
			name: "Create user",
			baseUrl: "http://localhost:3000",
			steps: [
				step({ kind: "open", url: "http://localhost:3000/login" }),
				step({ kind: "input", selector: { id: "email" }, value: "person@example.com" }),
				step({ kind: "input", selector: { id: "password" }, valueFrom: "PASSWORD" }),
				step({ kind: "tap", selector: { text: "Sign in" } }),
				step({ kind: "expectVisible", selector: { role: "heading", name: "Dashboard" } }),
			],
		});

		const flow = parseFlow(text);

		expect(flow.name).toBe("Create user");
		expect(flow.steps.map((entry) => entry.kind)).toEqual([
			"open",
			"input",
			"input",
			"tap",
			"expectVisible",
		]);
		expect(flow.requiredSecrets).toEqual(["PASSWORD"]);
		expect(flow.steps[0].description).toBe("Open /login");
	});

	it("quotes values yaml would otherwise misread", () => {
		const text = toValidatedFlowYaml({
			name: "Edge cases",
			baseUrl: "http://localhost:3000",
			steps: [step({ kind: "input", selector: { id: "note" }, value: "12:30 # today" })],
		});

		expect(parseFlow(text).steps[0].fields.value).toBe("12:30 # today");
	});
});
