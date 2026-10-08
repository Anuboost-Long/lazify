export const logError = (scope: string, message: string, detail?: unknown) =>
	console.error(`[${scope}] ${message}`, detail);
