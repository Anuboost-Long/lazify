import type { MonitorPanel, MonitorPanelSize } from "./use-monitor-panels";

const SCREENS_WORTH_ENLARGING = 1;
const MAX_ENLARGED_PANELS = 3;

export interface TidyPlan {
	order: string[];
	sizes: Record<string, MonitorPanelSize>;
}

export interface TidyInput {
	panels: MonitorPanel[];
	waitingRunIds: string[];
	overflowScreens: (runId: string) => number;
}

function attentionRank(runId: string, waiting: Set<string>) {
	return waiting.has(runId) ? 0 : 1;
}

function kindRank(panel: MonitorPanel) {
	if (panel.exited) return 2;

	return panel.kind === "agent" ? 0 : 1;
}

export function planTidyUp({ panels, waitingRunIds, overflowScreens }: TidyInput): TidyPlan {
	const waiting = new Set(waitingRunIds);

	const ranked = [...panels].sort((left, right) => {
		const byAttention = attentionRank(left.runId, waiting) - attentionRank(right.runId, waiting);
		if (byAttention !== 0) return byAttention;

		const byKind = kindRank(left) - kindRank(right);
		if (byKind !== 0) return byKind;

		return overflowScreens(right.runId) - overflowScreens(left.runId);
	});

	const sizes: Record<string, MonitorPanelSize> = {};
	let enlarged = 0;

	ranked.forEach((panel, index) => {
		const dense = overflowScreens(panel.runId) >= SCREENS_WORTH_ENLARGING;

		if (panel.exited) {
			sizes[panel.runId] = "default";
			return;
		}

		if (index === 0) {
			sizes[panel.runId] = dense ? "large" : "wide";
			enlarged += 1;
			return;
		}

		if (dense && enlarged < MAX_ENLARGED_PANELS) {
			sizes[panel.runId] = "wide";
			enlarged += 1;
			return;
		}

		sizes[panel.runId] = "default";
	});

	return { order: ranked.map((panel) => panel.runId), sizes };
}
