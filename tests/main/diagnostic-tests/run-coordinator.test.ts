import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { EvidenceSink } from "../../../src/main/diagnostic-tests/evidence/sink";
import { DiagnosticRun } from "../../../src/main/diagnostic-tests/run/coordinator";
import type { RunEvent, RunRecord } from "../../../src/main/diagnostic-tests/types";
import { FakeDriver, type FakeDriverOptions } from "./fake-driver";

const FLOW = `name: Smoke
target: web
steps:
 - open:
    url: http://localhost:4321/login
 - tap:
    text: Sign in
 - expectVisible:
    text: Dashboard
 - screenshot:
    name: signed-in
`;

const roots: string[] = [];

afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

async function buildRun(
	text: string,
	driverOptions: FakeDriverOptions,
	driver = new FakeDriver(driverOptions),
) {
	const artifactRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-diagnostics-"));
	roots.push(artifactRoot);

	const events: RunEvent[] = [];

	const run = new DiagnosticRun(
		{
			projectPath: artifactRoot,
			projectName: "demo",
			flow: { filePath: "smoke.yaml", relativePath: "smoke.yaml", text },
			config: {
				defaultTarget: "web",
				baseUrl: "",
				flowsDir: "",
				artifactsDir: "",
				secrets: [],
				retainRuns: 5,
				stepTimeoutMs: 50,
			},
			platform: "web",
		},
		{
			artifactRoot,
			createDriver: (_runId: string, _sink: EvidenceSink) => driver,
			emit: (event) => events.push(event),
		},
	);

	return { run, driver, events };
}

async function runFlow(
	text = FLOW,
	driverOptions: FakeDriverOptions = {},
): Promise<{ record: RunRecord; driver: FakeDriver; events: RunEvent[] }> {
	const { run, driver, events } = await buildRun(text, driverOptions);

	return { record: await run.start(), driver, events };
}

describe("DiagnosticRun", () => {
	it("runs every step and reports a pass", async () => {
		const { record, driver } = await runFlow();

		expect(record.state).toBe("passed");
		expect(record.steps.map((step) => step.status)).toEqual(["passed", "passed", "passed", "passed"]);
		expect(driver.calls).toContain("open http://localhost:4321/login");
		expect(driver.calls.at(-1)).toBe("close");
	});

	it("fails on the assertion that broke and skips what follows", async () => {
		const { record } = await runFlow(FLOW, { visible: () => false });

		expect(record.state).toBe("failed");
		expect(record.steps[2].status).toBe("failed");
		expect(record.steps[2].message).toContain("not visible");
		expect(record.steps[3].status).toBe("skipped");
		expect(record.failureSummary).toContain("Expect visible");
	});

	it("captures a screenshot beside the failed step", async () => {
		const { record } = await runFlow(FLOW, { visible: () => false });

		expect(record.steps[2].artifacts.map((artifact) => artifact.name)).toEqual(["step-3-failure"]);
	});

	it("separates a broken flow from a failed assertion", async () => {
		const { record } = await runFlow("name: Broken\nsteps:\n - tap:\n    text: Missing\n", {
			capabilities: ["open"],
		});

		expect(record.state).toBe("infrastructure-error");
		expect(record.failureSummary).toContain("cannot run: tap");
	});

	it("stops where it was when the run is cancelled", async () => {
		const flow = "name: Waiting\nsteps:\n - waitFor:\n    text: Never\n - back\n";
		const { run } = await buildRun(flow, { visible: () => false });

		const finished = run.start();
		setTimeout(() => run.cancel(), 10);

		const record = await finished;

		expect(record.state).toBe("cancelled");
		expect(record.steps[0].status).toBe("skipped");
	});

	it("reports runtime errors the page raised", async () => {
		const flow = "name: Errors\nsteps:\n - expectNoRuntimeErrors\n";
		const { record } = await runFlow(flow, {
			runtimeErrors: [{ summary: "TypeError: x is not a function", details: "at App.tsx:12" }],
		});

		expect(record.state).toBe("failed");
		expect(record.steps[0].message).toContain("TypeError");
	});
});

describe("step messages", () => {
	it("does not repeat the headline in the detail it carries", async () => {
		const flow = "name: Errors\nsteps:\n - expectNoRuntimeErrors\n";
		const { record } = await runFlow(flow, {
			runtimeErrors: [
				{
					summary: "TypeError: x is not a function",
					details: "TypeError: x is not a function\n    at App.tsx:12",
				},
			],
		});

		expect(record.steps[0].message).toBe("TypeError: x is not a function\nat App.tsx:12");
	});
});
