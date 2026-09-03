import type { EvidenceItem, EvidenceSeverity, EvidenceSource } from "../types";

export interface EvidenceDraft {
	source: EvidenceSource;
	severity: EvidenceSeverity;
	summary: string;
	details?: string;
	artifacts?: string[];
	timestamp?: string;
}

function detailBeyondSummary(summary: string, details: string): string {
	const trimmed = details.trim();
	if (!trimmed.startsWith(summary)) return trimmed;

	return trimmed.slice(summary.length).trim() || summary;
}

export class EvidenceSink {
	private readonly collected: EvidenceItem[] = [];

	stepIndex: number | null = null;

	constructor(private readonly flowName: string) {}

	add(draft: EvidenceDraft): void {
		this.collected.push({
			source: draft.source,
			severity: draft.severity,
			summary: draft.summary,
			details: detailBeyondSummary(draft.summary, draft.details ?? draft.summary),
			artifacts: draft.artifacts ?? [],
			timestamp: draft.timestamp ?? new Date().toISOString(),
			flowName: this.flowName,
			stepIndex: this.stepIndex,
		});
	}

	all(): EvidenceItem[] {
		return [...this.collected];
	}
}
