import { ipcRenderer } from "electron";

import type {
	BuildPromptInput,
	BuiltPrompt,
	ContextEntry,
	ContextEntryInput,
	ContextScope,
	PromptPreset,
	PromptPresetInput,
} from "../../main/prompts/types";
export const promptsApi = {
	listPromptPresets: (): Promise<PromptPreset[]> => ipcRenderer.invoke("lazify:list-prompt-presets"),
	createPromptPreset: (input: PromptPresetInput): Promise<PromptPreset> =>
		ipcRenderer.invoke("lazify:create-prompt-preset", input),
	updatePromptPreset: (id: string, input: PromptPresetInput): Promise<PromptPreset | null> =>
		ipcRenderer.invoke("lazify:update-prompt-preset", id, input),
	deletePromptPreset: (id: string): Promise<boolean> =>
		ipcRenderer.invoke("lazify:delete-prompt-preset", id),
	listContextEntries: (projectPath: string): Promise<ContextEntry[]> =>
		ipcRenderer.invoke("lazify:list-context-entries", projectPath),
	createContextEntry: (input: ContextEntryInput): Promise<ContextEntry> =>
		ipcRenderer.invoke("lazify:create-context-entry", input),
	updateContextEntry: (id: string, input: ContextEntryInput): Promise<boolean> =>
		ipcRenderer.invoke("lazify:update-context-entry", id, input),
	setContextEntryActive: (id: string, active: boolean): Promise<boolean> =>
		ipcRenderer.invoke("lazify:set-context-entry-active", id, active),
	setContextPackActive: (
		scope: ContextScope,
		scopeKey: string,
		pack: string,
		active: boolean,
	): Promise<number> =>
		ipcRenderer.invoke("lazify:set-context-pack-active", scope, scopeKey, pack, active),
	deleteContextEntry: (id: string): Promise<boolean> =>
		ipcRenderer.invoke("lazify:delete-context-entry", id),
	buildPrompt: (input: BuildPromptInput): Promise<BuiltPrompt> =>
		ipcRenderer.invoke("lazify:build-prompt", input),
	suggestPromptPreset: (text: string): Promise<string | null> =>
		ipcRenderer.invoke("lazify:suggest-prompt-preset", text),
};
