import { findModuleDefinition, isModuleSpecifier } from "@/shared/lib/code-intelligence/module-resolver";
import { findReferenceDefinition } from "@/shared/lib/code-intelligence/reference-finder";

export { listHighlightingAssets, openHighlightingFolder } from "@/shared/lib/code-intelligence/highlighting-store";

/** An import path is the other thing a reader clicks to leave a file, so it is resolved as a path, not a name. */
export function findSymbolDefinition(
	projectPath: string,
	symbol: string,
	fromPath?: string | null,
	position?: { line: number; column: number } | null,
) {
	return isModuleSpecifier(symbol)
		? findModuleDefinition(projectPath, symbol, fromPath)
		: findReferenceDefinition(projectPath, symbol, fromPath, position);
}
