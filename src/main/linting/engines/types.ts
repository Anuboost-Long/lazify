import type { Diagnostic, DiagnosticSource } from "../types";

export interface LintEngineRequest {
	filePath: string;
	content: string;
	projectPath: string | null;
}

export interface LintEngineResult {
	diagnostics: Diagnostic[];
}

export interface LintEngine {
	source: DiagnosticSource;
	run: (request: LintEngineRequest) => Promise<LintEngineResult | null>;
	dispose?: () => void;
}
