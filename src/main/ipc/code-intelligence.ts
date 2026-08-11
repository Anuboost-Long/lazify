import { ipcMain } from "electron";
import { listHighlightingAssets, openHighlightingFolder } from "../code-intelligence/highlighting-store";
import { findModuleDefinition, isModuleSpecifier } from "../code-intelligence/module-resolver";
import { findReferenceDefinition } from "../code-intelligence/reference-finder";

export function registerCodeIntelligenceHandlers() {
  ipcMain.handle("lazify:highlighting-assets", async () => listHighlightingAssets());

  ipcMain.handle("lazify:open-highlighting-folder", async () => openHighlightingFolder());

  // Go-to-definition for the read-only editors: a name in, a file and line out.
  // An import path comes through the same channel — it is the other thing a
  // reader clicks to leave a file — and is resolved as a path, not a name.
  ipcMain.handle(
    "lazify:find-symbol-definition",
    async (
      _event,
      projectPath: string,
      symbol: string,
      fromPath?: string | null,
      position?: { line: number; column: number } | null
    ) =>
      isModuleSpecifier(symbol)
        ? findModuleDefinition(projectPath, symbol, fromPath)
        : findReferenceDefinition(projectPath, symbol, fromPath, position)
  );
}
