import type { EditorTab } from "@renderer/shared/ui/code/EditorTabBar";

export function reorderTabs(tabs: EditorTab[], fromPath: string, toPath: string): EditorTab[] {
	const from = tabs.findIndex((tab) => tab.path === fromPath);
	const to = tabs.findIndex((tab) => tab.path === toPath);

	if (from === -1 || to === -1 || from === to) return tabs;

	const next = [...tabs];
	const [moved] = next.splice(from, 1);

	next.splice(to, 0, moved);

	return next;
}
