import { lspEngine } from "./lsp/engine";

export const tailwindEngine = lspEngine({
	extensionId: "bradlc.vscode-tailwindcss",
	source: "tailwindcss",
	firstResultTimeoutMs: 20_000,
	resultTimeoutMs: 6_000,
});
