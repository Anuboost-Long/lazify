import { ipcMain } from "electron";

import {
  buildPrompt,
  createEntry,
  createPreset,
  deleteEntry,
  deletePreset,
  listEntries,
  listPresets,
  setEntryActive,
  setPackActive,
  suggestPreset,
  updateEntry,
  updatePreset,
  type BuildPromptInput,
  type ContextEntryInput,
  type ContextScope,
  type PromptPresetInput
} from "../prompts";

export function registerPromptHandlers() {
  ipcMain.handle("lazify:list-prompt-presets", async () => listPresets());

  ipcMain.handle("lazify:create-prompt-preset", async (_event, input: PromptPresetInput) =>
    createPreset(input)
  );

  ipcMain.handle(
    "lazify:update-prompt-preset",
    async (_event, id: string, input: PromptPresetInput) => updatePreset(id, input)
  );

  ipcMain.handle("lazify:delete-prompt-preset", async (_event, id: string) => deletePreset(id));

  ipcMain.handle("lazify:list-context-entries", async (_event, projectPath: string) =>
    listEntries(projectPath)
  );

  ipcMain.handle("lazify:create-context-entry", async (_event, input: ContextEntryInput) =>
    createEntry(input)
  );

  ipcMain.handle(
    "lazify:update-context-entry",
    async (_event, id: string, input: ContextEntryInput) => updateEntry(id, input)
  );

  ipcMain.handle("lazify:set-context-entry-active", async (_event, id: string, active: boolean) =>
    setEntryActive(id, active)
  );

  ipcMain.handle(
    "lazify:set-context-pack-active",
    async (_event, scope: ContextScope, scopeKey: string, pack: string, active: boolean) =>
      setPackActive(scope, scopeKey, pack, active)
  );

  ipcMain.handle("lazify:delete-context-entry", async (_event, id: string) => deleteEntry(id));

  ipcMain.handle("lazify:build-prompt", async (_event, input: BuildPromptInput) =>
    buildPrompt(input)
  );

  ipcMain.handle("lazify:suggest-prompt-preset", async (_event, text: string) =>
    suggestPreset(text)
  );
}
