import { translation } from "@/i18n/translation";

export const shortcuts = [
	{ id: "toggle-sidebar", label: translation.Shortcuts.ToggleSidebar, combo: "Mod+\\" },
	{ id: "new-workflow", label: translation.Shortcuts.NewWorkflow, combo: "Mod+N" },
	{ id: "open-settings", label: translation.Shortcuts.OpenSettings, combo: "Mod+," },
	{ id: "quick-open", label: translation.Shortcuts.QuickOpen, combo: "Mod+P" },
	{ id: "zoom-in", label: translation.Shortcuts.ZoomIn, combo: "Mod+=" },
	{ id: "zoom-out", label: translation.Shortcuts.ZoomOut, combo: "Mod+-" },
	{ id: "reset-zoom", label: translation.Shortcuts.ResetZoom, combo: "Mod+0" },
] as const;

export type ShortcutId = (typeof shortcuts)[number]["id"];

export type Bindings = Record<ShortcutId, string>;

export const defaultBindings = Object.fromEntries(shortcuts.map(({ id, combo }) => [id, combo])) as Bindings;

// Taken by macOS, the text fields, or one of Lazify's fixed keys.
const reserved = new Set([
	"Mod+A",
	"Mod+C",
	"Mod+X",
	"Mod+V",
	"Mod+Z",
	"Mod+Shift+Z",
	"Mod+Y",
	"Mod+Q",
	"Mod+W",
	"Mod+H",
	"Mod+M",
	"Mod+F",
	"Mod+Shift+F",
	"Mod+S",
	"Mod+Enter",
]);

const codeKeys: Record<string, string> = {
	Comma: ",",
	Period: ".",
	Slash: "/",
	Backslash: "\\",
	BracketLeft: "[",
	BracketRight: "]",
	Semicolon: ";",
	Quote: "'",
	Minus: "-",
	Equal: "=",
	Backquote: "`",
};

const modifierKeys = new Set(["Meta", "Control", "Shift", "Alt", "AltGraph", "CapsLock"]);

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

function keyName(event: Pick<KeyboardEvent, "code" | "key">) {
	if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
	if (/^Digit\d$/.test(event.code)) return event.code.slice(5);
	if (codeKeys[event.code]) return codeKeys[event.code];
	return event.key.length === 1 ? event.key.toUpperCase() : event.key;
}

export function comboFromEvent(
	event: Pick<KeyboardEvent, "code" | "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
) {
	if (modifierKeys.has(event.key)) return null;
	const parts = [];
	if (isMac ? event.metaKey : event.ctrlKey) parts.push("Mod");
	if (isMac && event.ctrlKey) parts.push("Ctrl");
	if (event.altKey) parts.push("Alt");
	if (event.shiftKey) parts.push("Shift");
	parts.push(keyName(event));
	return parts.join("+");
}

const macSymbols: Record<string, string> = { Mod: "⌘", Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Enter: "↩" };
const otherNames: Record<string, string> = { Mod: "Ctrl" };

export function formatCombo(combo: string) {
	const parts = combo.split(/\+(?!$)/);
	return isMac
		? parts.map((part) => macSymbols[part] ?? part).join("")
		: parts.map((part) => otherNames[part] ?? part).join("+");
}

export type ShortcutProblem =
	| { kind: "no-modifier" }
	| { kind: "reserved" }
	| { kind: "taken"; by: ShortcutId };

export function shortcutProblem(id: ShortcutId, combo: string, bindings: Bindings): ShortcutProblem | null {
	const parts = combo.split(/\+(?!$)/);
	const key = parts.at(-1) ?? "";
	if (!parts.some((part) => part === "Mod" || part === "Ctrl" || part === "Alt") && !/^F\d{1,2}$/.test(key)) {
		return { kind: "no-modifier" };
	}
	if (reserved.has(combo)) return { kind: "reserved" };
	const taken = shortcuts.find((shortcut) => shortcut.id !== id && bindings[shortcut.id] === combo);
	if (taken) return { kind: "taken", by: taken.id };
	return null;
}
