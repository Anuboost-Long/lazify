import type { DiagnosticSource } from "./types";

/** What each engine is called wherever findings are written out for a reader. */
export const ENGINE_NAME: Record<DiagnosticSource, string> = {
	sonarlint: "SonarQube for IDE",
	tailwindcss: "Tailwind CSS",
};

export const engineName = (source: DiagnosticSource) => ENGINE_NAME[source] ?? source;
