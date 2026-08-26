import { describe, expect, it } from "vitest";

import { planTidyUp } from "../../src/renderer/features/agents/hooks/tidy-monitor-wall";
import type { MonitorPanel } from "../../src/renderer/features/agents/hooks/use-monitor-panels";

function panel(overrides: Partial<MonitorPanel> & { runId: string }): MonitorPanel {
	return {
		id: overrides.runId,
		projectPath: `/work/${overrides.runId}`,
		projectName: overrides.runId,
		kind: "script",
		sourceId: "dev",
		label: "dev",
		displayName: "dev",
		exited: false,
		size: "default",
		...overrides,
	};
}

const quiet = () => 0;

describe("Tidy up the live monitor wall", () => {
	it("puts agents ahead of plain commands", () => {
		const plan = planTidyUp({
			panels: [
				panel({ runId: "script-1" }),
				panel({ runId: "agent-1", kind: "agent" }),
				panel({ runId: "script-2" }),
				panel({ runId: "agent-2", kind: "agent" }),
			],
			waitingRunIds: [],
			overflowScreens: quiet,
		});

		expect(plan.order).toEqual(["agent-1", "agent-2", "script-1", "script-2"]);
	});

	it("lifts a panel waiting on the user above everything still working", () => {
		const plan = planTidyUp({
			panels: [
				panel({ runId: "agent-1", kind: "agent" }),
				panel({ runId: "script-1" }),
				panel({ runId: "agent-2", kind: "agent" }),
			],
			waitingRunIds: ["script-1"],
			overflowScreens: quiet,
		});

		expect(plan.order[0]).toBe("script-1");
	});

	it("sinks panels whose run has already exited", () => {
		const plan = planTidyUp({
			panels: [
				panel({ runId: "agent-done", kind: "agent", exited: true }),
				panel({ runId: "script-1" }),
			],
			waitingRunIds: [],
			overflowScreens: quiet,
		});

		expect(plan.order).toEqual(["script-1", "agent-done"]);
		expect(plan.sizes["agent-done"]).toBe("default");
	});

	it("breaks a tie by how much output has scrolled out of sight", () => {
		const overflow: Record<string, number> = { "agent-1": 0.2, "agent-2": 4 };

		const plan = planTidyUp({
			panels: [panel({ runId: "agent-1", kind: "agent" }), panel({ runId: "agent-2", kind: "agent" })],
			waitingRunIds: [],
			overflowScreens: (runId) => overflow[runId] ?? 0,
		});

		expect(plan.order).toEqual(["agent-2", "agent-1"]);
	});

	it("grows the top panel, and grows it further when it has a lot to read", () => {
		const busy = planTidyUp({
			panels: [panel({ runId: "agent-1", kind: "agent" }), panel({ runId: "script-1" })],
			waitingRunIds: [],
			overflowScreens: (runId) => (runId === "agent-1" ? 3 : 0),
		});

		expect(busy.sizes["agent-1"]).toBe("large");
		expect(busy.sizes["script-1"]).toBe("default");

		const calm = planTidyUp({
			panels: [panel({ runId: "agent-1", kind: "agent" }), panel({ runId: "script-1" })],
			waitingRunIds: [],
			overflowScreens: quiet,
		});

		expect(calm.sizes["agent-1"]).toBe("wide");
	});

	it("widens other dense panels, but never more than three in all", () => {
		const plan = planTidyUp({
			panels: [
				panel({ runId: "agent-1", kind: "agent" }),
				panel({ runId: "agent-2", kind: "agent" }),
				panel({ runId: "agent-3", kind: "agent" }),
				panel({ runId: "agent-4", kind: "agent" }),
			],
			waitingRunIds: [],
			overflowScreens: () => 5,
		});

		const enlarged = Object.values(plan.sizes).filter((size) => size !== "default");

		expect(enlarged).toHaveLength(3);
		expect(plan.sizes["agent-1"]).toBe("large");
	});

	it("leaves an empty wall alone", () => {
		expect(planTidyUp({ panels: [], waitingRunIds: [], overflowScreens: quiet })).toEqual({
			order: [],
			sizes: {},
		});
	});
});
