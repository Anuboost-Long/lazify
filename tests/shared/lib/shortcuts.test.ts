import { afterEach, describe, expect, it, vi } from "vitest";

async function loadOn(userAgent: string) {
	vi.resetModules();
	vi.stubGlobal("navigator", { userAgent });
	return import("@/shared/lib/shortcuts");
}

const press = (code: string, key: string, modifiers: Partial<KeyboardEvent> = {}) => ({
	code,
	key,
	metaKey: false,
	ctrlKey: false,
	altKey: false,
	shiftKey: false,
	...modifiers,
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("on macOS", () => {
	const mac = () => loadOn("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");

	it("reads ⌘ as Mod and keeps the physical key", async () => {
		const { comboFromEvent } = await mac();

		expect(comboFromEvent(press("KeyP", "p", { metaKey: true }))).toBe("Mod+P");
		expect(comboFromEvent(press("KeyP", "π", { metaKey: true, altKey: true }))).toBe("Mod+Alt+P");
		expect(comboFromEvent(press("Digit1", "!", { metaKey: true, shiftKey: true }))).toBe("Mod+Shift+1");
		expect(comboFromEvent(press("Backslash", "\\", { metaKey: true }))).toBe("Mod+\\");
		expect(comboFromEvent(press("KeyN", "n", { metaKey: true, ctrlKey: true }))).toBe("Mod+Ctrl+N");
	});

	it("ignores a modifier pressed on its own", async () => {
		const { comboFromEvent } = await mac();

		expect(comboFromEvent(press("MetaLeft", "Meta", { metaKey: true }))).toBeNull();
	});

	it("formats with the macOS symbols", async () => {
		const { formatCombo } = await mac();

		expect(formatCombo("Mod+Shift+P")).toBe("⌘⇧P");
		expect(formatCombo("Mod++")).toBe("⌘+");
		expect(formatCombo("Mod+Alt+Enter")).toBe("⌘⌥↩");
	});
});

describe("on Windows", () => {
	const windows = () => loadOn("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

	it("reads Ctrl as Mod, and not ⌘", async () => {
		const { comboFromEvent } = await windows();

		expect(comboFromEvent(press("KeyP", "p", { ctrlKey: true }))).toBe("Mod+P");
		expect(comboFromEvent(press("KeyP", "p", { metaKey: true }))).toBe("P");
	});

	it("formats with key names", async () => {
		const { formatCombo } = await windows();

		expect(formatCombo("Mod+Shift+P")).toBe("Ctrl+Shift+P");
	});
});

describe("shortcutProblem", () => {
	it("accepts a free combo", async () => {
		const { defaultBindings, shortcutProblem } = await loadOn("Mac OS X");

		expect(shortcutProblem("toggle-sidebar", "Mod+B", defaultBindings)).toBeNull();
		expect(shortcutProblem("toggle-sidebar", "F5", defaultBindings)).toBeNull();
	});

	it("refuses a combo with no modifier, since it would fire while typing", async () => {
		const { defaultBindings, shortcutProblem } = await loadOn("Mac OS X");

		expect(shortcutProblem("toggle-sidebar", "Shift+B", defaultBindings)).toEqual({ kind: "no-modifier" });
	});

	it("refuses a combo the system or a fixed Lazify key uses", async () => {
		const { defaultBindings, shortcutProblem } = await loadOn("Mac OS X");

		expect(shortcutProblem("toggle-sidebar", "Mod+C", defaultBindings)).toEqual({ kind: "reserved" });
		expect(shortcutProblem("toggle-sidebar", "Mod+Shift+F", defaultBindings)).toEqual({ kind: "reserved" });
	});

	it("refuses a combo another shortcut has, but not the shortcut's own", async () => {
		const { defaultBindings, shortcutProblem } = await loadOn("Mac OS X");

		expect(shortcutProblem("toggle-sidebar", "Mod+P", defaultBindings)).toEqual({ kind: "taken", by: "quick-open" });
		expect(shortcutProblem("quick-open", "Mod+P", defaultBindings)).toBeNull();
	});
});
