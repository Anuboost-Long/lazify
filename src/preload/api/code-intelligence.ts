import { ipcRenderer } from "electron";
export const codeIntelligenceApi = {
	findSymbolDefinition: (
		projectPath: string,
		symbol: string,
		fromPath?: string | null,
		position?: { line: number; column: number } | null,
	): Promise<import("../../main/code-intelligence/symbol-finder").SymbolDefinition | null> =>
		ipcRenderer.invoke("lazify:find-symbol-definition", projectPath, symbol, fromPath, position),
};
