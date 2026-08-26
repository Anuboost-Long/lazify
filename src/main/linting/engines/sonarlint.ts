import { lspEngine } from "./lsp/engine";

export const sonarlintEngine = lspEngine({
	extensionId: "SonarSource.sonarlint-vscode",
	source: "sonarlint",
	firstResultTimeoutMs: 90_000,
	resultTimeoutMs: 20_000,
});
