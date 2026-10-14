import {
	activeExtensionRoot,
	type ExtensionProvider,
	onExtensionChanged,
	providerFor,
} from "@/shared/lib/extensions";

import type { Diagnostic, DiagnosticSource } from "../../types";
import type { LintEngine, LintEngineRequest, LintEngineResult } from "../types";
import { LanguageServerSession, type LspDiagnostic } from "./session";

export interface LspEngineOptions {
	extensionId: string;
	source: DiagnosticSource;
	firstResultTimeoutMs: number;
	resultTimeoutMs: number;
}

export function lspEngine(options: LspEngineOptions): LintEngine {
	const sessions = new Map<string, Promise<LanguageServerSession | null>>();

	const dropSessions = () => {
		sessions.forEach((session) => void session.then((started) => started?.dispose()));
		sessions.clear();
	};

	onExtensionChanged((id) => {
		if (id === options.extensionId) dropSessions();
	});

	async function startSession(
		provider: ExtensionProvider,
		root: string,
		projectPath: string,
	): Promise<LanguageServerSession | null> {
		const launch = await provider.launch(root);

		if (!launch) return null;

		return new LanguageServerSession(
			provider,
			launch,
			projectPath,
			options.firstResultTimeoutMs,
			options.resultTimeoutMs,
		);
	}

	async function sessionFor(projectPath: string): Promise<LanguageServerSession | null> {
		const provider = providerFor(options.extensionId);
		const root = await activeExtensionRoot(options.extensionId);

		if (!provider || !root) {
			dropSessions();
			return null;
		}

		const existing = sessions.get(projectPath);

		if (existing !== undefined) return existing;

		const session = startSession(provider, root, projectPath);

		sessions.set(projectPath, session);

		return session;
	}

	function toDiagnostic(found: LspDiagnostic): Diagnostic {
		const code = typeof found.code === "string" ? found.code : (found.code?.toString() ?? null);
		const provider = providerFor(options.extensionId);

		return {
			source: options.source,
			rule: code ? `${options.source}/${code}` : options.source,
			code,
			message: found.message,
			url: code ? (provider?.ruleUrl(code) ?? null) : null,
			line: found.range.start.line + 1,
			column: found.range.start.character + 1,
			endLine: found.range.end.line + 1,
			endColumn: found.range.end.character + 1,
		};
	}

	async function run({
		filePath,
		content,
		projectPath,
	}: LintEngineRequest): Promise<LintEngineResult | null> {
		if (!projectPath) return null;

		const session = await sessionFor(projectPath);

		if (!session) return null;

		const found = await session.diagnose(filePath, content);

		if (found === null) return null;

		return { diagnostics: found.map(toDiagnostic) };
	}

	return { source: options.source, run, dispose: dropSessions };
}
