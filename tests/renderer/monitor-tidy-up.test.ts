import { describe, expect, it } from "vitest";

import { planTidyUp } from "../../src/renderer/features/agents/hooks/tidy-monitor-wall";
import type { MonitorPanel } from "../../src/renderer/features/agents/hooks/use-monitor-panels";

function panel(runId: string, overrides: Partial<MonitorPanel> = {}): MonitorPanel {
	return {
		id: runId,
		runId,
		projectPath: `/work/${runId}`,
		projectName: runId,
		kind: "agent",
		sourceId: "dev",
		label: "dev",
		displayName: "dev",
		exited: false,
		size: "default",
		...overrides,
	};
}

const scores =
	(byRunId: Record<string, number> = {}) =>
	(runId: string) =>
		byRunId[runId] ?? 0;

function plan(panels: MonitorPanel[], over: Partial<Parameters<typeof planTidyUp>[0]> = {}) {
	return planTidyUp({
		panels,
		waitingRunIds: [],
		overflowScreens: scores(),
		readingDemand: scores(),
		routineWork: scores(),
		columns: 3,
		...over,
	});
}

describe("Tidy up the live monitor wall", () => {
	it("puts whatever is waiting on the user first", () => {
		const order = plan([panel("agent-1"), panel("script-1", { kind: "script" })], {
			waitingRunIds: ["script-1"],
		}).order;

		expect(order).toEqual(["script-1", "agent-1"]);
	});

	it("sizes by how deep the output is, not how much of it there is", () => {
		const noisy = plan([panel("install")], { overflowScreens: scores({ install: 40 }) });
		const dense = plan([panel("diff")], { readingDemand: scores({ diff: 0.9 }) });

		expect(noisy.sizes["install"]).toBe("default");
		expect(dense.sizes["diff"]).toBe("large");
	});

	it("sinks an agent running errands below one doing real work", () => {
		const order = plan([panel("pushing"), panel("building")], {
			overflowScreens: scores({ pushing: 6 }),
			routineWork: scores({ pushing: 1 }),
		}).order;

		expect(order).toEqual(["building", "pushing"]);
	});

	it("fills the gap beside a tall panel instead of leaving a hole", () => {
		const sizes = plan([panel("agent-1"), panel("agent-2"), panel("agent-3")], {
			readingDemand: () => 0.9,
		}).sizes;

		expect(sizes).toEqual({ "agent-1": "large", "agent-2": "default", "agent-3": "default" });
	});

	it("spans nothing at all in a single column", () => {
		const sizes = plan([panel("agent-1"), panel("agent-2")], {
			readingDemand: () => 0.9,
			columns: 1,
		}).sizes;

		expect(Object.values(sizes)).toEqual(["default", "default"]);
	});
});
