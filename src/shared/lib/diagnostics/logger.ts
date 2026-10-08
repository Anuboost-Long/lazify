export const logError = (scope: string, message: string, detail?: unknown) =>
	console.error(`[${scope}] ${message}`, detail);

export interface DiagnosticsPaths {
	logFile: string;
	logDirectory: string;
	crashDumpDirectory: string;
	appVersion: string;
	platform: string;
	arch: string;
	electronVersion: string;
}
