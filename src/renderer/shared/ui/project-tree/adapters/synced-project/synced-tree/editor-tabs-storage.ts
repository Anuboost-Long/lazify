import type { EditorTab } from "@renderer/shared/ui/code/EditorTabBar";

const EDITOR_TABS_STORAGE_KEY = "lazify-editor-tabs";

interface StoredEditorTabs {
	openFiles: EditorTab[];
	activeFilePath: string | null;
}

export function readStoredEditorTabs(projectPath: string): StoredEditorTabs | null {
	if (typeof window === "undefined" || !projectPath) {
		return null;
	}

	try {
		const all = JSON.parse(
			globalThis.localStorage.getItem(EDITOR_TABS_STORAGE_KEY) ?? "{}",
		) as Record<string, StoredEditorTabs>;

		return all[projectPath] ?? null;
	} catch {
		return null;
	}
}

export function persistEditorTabs(projectPath: string, value: StoredEditorTabs) {
	if (typeof window === "undefined" || !projectPath) {
		return;
	}

	try {
		const all = JSON.parse(
			globalThis.localStorage.getItem(EDITOR_TABS_STORAGE_KEY) ?? "{}",
		) as Record<string, StoredEditorTabs>;

		all[projectPath] = value;
		globalThis.localStorage.setItem(EDITOR_TABS_STORAGE_KEY, JSON.stringify(all));
	} catch {}
}
