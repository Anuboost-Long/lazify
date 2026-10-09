import { seedBuiltinContext } from "@/features/prompts/lib/builtin-context";
import * as contextStore from "@/features/prompts/lib/context-store";
import * as presetStore from "@/features/prompts/lib/preset-store";
import { suggestPreset } from "@/features/prompts/lib/preset-suggester";
import { buildPrompt as build } from "@/features/prompts/lib/prompt-builder";
import type {
	BuildPromptInput,
	ContextEntryInput,
	ContextScope,
	PromptPresetInput,
} from "@/features/prompts/lib/types";

let seeded: Promise<void> | null = null;

export function ready(): Promise<void> {
	seeded ??= (async () => {
		await presetStore.seedBuiltinPresets();
		await seedBuiltinContext();
	})();

	return seeded;
}

const seededFirst =
	<Args extends unknown[], Result>(call: (...args: Args) => Promise<Result>) =>
	async (...args: Args): Promise<Result> => {
		await ready();
		return call(...args);
	};

export const listPromptPresets = seededFirst(() => presetStore.listPresets());
export const createPromptPreset = seededFirst((input: PromptPresetInput) => presetStore.createPreset(input));
export const updatePromptPreset = seededFirst((id: string, input: PromptPresetInput) => presetStore.updatePreset(id, input));
export const deletePromptPreset = seededFirst((id: string) => presetStore.deletePreset(id));
export const listContextEntries = seededFirst((projectPath: string) => contextStore.listEntries(projectPath));
export const createContextEntry = seededFirst((input: ContextEntryInput) => contextStore.createEntry(input));
export const updateContextEntry = seededFirst((id: string, input: ContextEntryInput) => contextStore.updateEntry(id, input));
export const setContextEntryActive = seededFirst((id: string, active: boolean) => contextStore.setEntryActive(id, active));
export const setContextPackActive = seededFirst((scope: ContextScope, scopeKey: string, pack: string, active: boolean) =>
	contextStore.setPackActive(scope, scopeKey, pack, active),
);
export const deleteContextEntry = seededFirst((id: string) => contextStore.deleteEntry(id));
export const buildPrompt = seededFirst((input: BuildPromptInput) => build(input));

export async function suggestPromptPreset(text: string): Promise<string | null> {
	return suggestPreset(text);
}
