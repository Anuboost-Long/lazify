import { describe, expect, it } from "vitest";

import { parseFlow } from "../../../src/main/diagnostic-tests/flow/parse-flow";

const WEB_FLOW = `name: Create user
target: web
start:
 script: dev
 url: http://localhost:3000
steps:
 - open:
    path: /login
 - input:
    id: email
    valueFrom: TEST_EMAIL
 - input:
    id: password
    valueFrom: TEST_PASSWORD
 - tap:
    text: Sign in
 - expectVisible:
    text: Dashboard
 - expectNoRuntimeErrors
 - screenshot:
    name: users-page
`;

describe("parseFlow", () => {
	it("reads the documented web flow", () => {
		const flow = parseFlow(WEB_FLOW);

		expect(flow.name).toBe("Create user");
		expect(flow.target).toBe("web");
		expect(flow.start.url).toBe("http://localhost:3000");
		expect(flow.steps.map((step) => step.kind)).toEqual([
			"open",
			"input",
			"input",
			"tap",
			"expectVisible",
			"expectNoRuntimeErrors",
			"screenshot",
		]);
	});

	it("collects the secrets and driver capabilities a flow needs", () => {
		const flow = parseFlow(WEB_FLOW);

		expect(flow.requiredSecrets).toEqual(["TEST_EMAIL", "TEST_PASSWORD"]);
		expect(flow.capabilities).toContain("runtimeErrors");
		expect(flow.capabilities).toContain("screenshot");
	});

	it("describes each step for the report", () => {
		const flow = parseFlow(WEB_FLOW);

		expect(flow.steps[3].description).toBe('Tap "Sign in"');
		expect(flow.steps[1].description).toBe("Enter TEST_EMAIL into #email");
	});

	it("rejects an action the runner does not support", () => {
		expect(() => parseFlow("name: X\nsteps:\n - swipeLeft\n")).toThrow(/unknown action "swipeLeft"/);
	});

	it("rejects a step with no way to find its element", () => {
		expect(() => parseFlow("name: X\nsteps:\n - tap:\n    color: red\n")).toThrow(
			/unsupported field color/,
		);
	});

	it("rejects an input that carries both a literal and a secret", () => {
		const flow = "name: X\nsteps:\n - input:\n    id: email\n    value: a\n    valueFrom: B\n";

		expect(() => parseFlow(flow)).toThrow(/not both/);
	});
});
