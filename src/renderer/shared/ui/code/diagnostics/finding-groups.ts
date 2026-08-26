import type { DiagnosticSource, FindingReference } from "@main/linting";
import { translation } from "@renderer/i18n/translation";

export const findingKey = (finding: FindingReference) =>
	`${finding.filePath}:${finding.diagnostic.line}:${finding.diagnostic.column}:${finding.diagnostic.rule}`;

const SOURCE_ORDER: DiagnosticSource[] = ["sonarlint", "tailwindcss"];

export const SOURCE_LABEL: Record<DiagnosticSource, string> = {
	sonarlint: translation.CodeQuality.SourceSonarlint,
	tailwindcss: translation.CodeQuality.SourceTailwindcss,
};

export interface FindingGroup {
	source: DiagnosticSource;
	label: string;
	findings: FindingReference[];
}

export function groupFindings(findings: FindingReference[]): FindingGroup[] {
	return SOURCE_ORDER.map((source) => ({
		source,
		label: SOURCE_LABEL[source],
		findings: findings.filter((finding) => finding.diagnostic.source === source),
	})).filter((group) => group.findings.length > 0);
}
