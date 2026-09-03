import path from "node:path";

import type { EvidenceItem, RunRecord, RunState, StepResult } from "../types";
import type { RunRequest } from "./coordinator";

export interface RecordDraft {
	id: string;
	request: RunRequest;
	flowName: string;
	state: RunState;
	failureSummary: string;
	steps: StepResult[];
	evidence: EvidenceItem[];
	artifactDir: string;
	startedAt: Date;
	endedAt: Date;
}

export function buildRunRecord(draft: RecordDraft): RunRecord {
	const { request } = draft;

	return {
		id: draft.id,
		projectPath: request.projectPath,
		projectName: request.projectName,
		flowName: draft.flowName || path.basename(request.flow.relativePath),
		flowPath: request.flow.relativePath,
		branch: request.branch ?? "",
		commit: request.commit ?? "",
		target: {
			platform: request.platform,
			url: request.config.baseUrl,
			appId: "",
			device: "",
		},
		state: draft.state,
		startedAt: draft.startedAt.toISOString(),
		endedAt: draft.endedAt.toISOString(),
		durationMs: draft.endedAt.getTime() - draft.startedAt.getTime(),
		failureSummary: draft.failureSummary,
		steps: draft.steps,
		evidence: draft.evidence,
		artifactDir: draft.artifactDir,
	};
}
