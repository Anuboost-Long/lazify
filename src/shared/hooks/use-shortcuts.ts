import { atom, useAtom, useAtomValue } from "jotai";
import { useEffect, useRef } from "react";

import {
	comboFromEvent,
	defaultBindings,
	shortcuts,
	type Bindings,
	type ShortcutId,
} from "@/shared/lib/shortcuts";

const SHORTCUTS_KEY = "lazify-shortcuts";

function readOverrides(): Partial<Bindings> {
	try {
		const saved = JSON.parse(globalThis.localStorage.getItem(SHORTCUTS_KEY) ?? "{}") as Record<string, unknown>;
		return Object.fromEntries(
			shortcuts.filter(({ id }) => typeof saved[id] === "string").map(({ id }) => [id, saved[id] as string]),
		);
	} catch {
		return {};
	}
}

const overridesAtom = atom(readOverrides());
const bindingsAtom = atom((get) => ({ ...defaultBindings, ...get(overridesAtom) }));

function without(overrides: Partial<Bindings>, id: ShortcutId) {
	const next = { ...overrides };
	delete next[id];
	return next;
}

export function useShortcuts() {
	const [overrides, setOverrides] = useAtom(overridesAtom);
	const bindings = useAtomValue(bindingsAtom);

	function save(next: Partial<Bindings>) {
		globalThis.localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(next));
		setOverrides(next);
	}

	function change(id: ShortcutId, combo: string) {
		const rest = without(overrides, id);
		save(combo === defaultBindings[id] ? rest : { ...rest, [id]: combo });
	}

	return {
		bindings,
		overrides,
		change,
		reset: (id: ShortcutId) => save(without(overrides, id)),
		resetAll: () => save({}),
	};
}

let paused = false;

// While Settings records a new combo, the key being recorded must not also run
// the action it is currently bound to.
export function pauseShortcuts(pause: boolean) {
	paused = pause;
}

export function useShortcutCombo(id: ShortcutId) {
	return useAtomValue(bindingsAtom)[id];
}

// Captured, so a focused terminal or editor cannot swallow the key first.
export function useShortcut(id: ShortcutId, run: (event: KeyboardEvent) => void, enabled = true) {
	const combo = useShortcutCombo(id);
	const latest = useRef(run);

	useEffect(() => {
		latest.current = run;
	});

	useEffect(() => {
		if (!enabled) return;
		function onKeyDown(event: KeyboardEvent) {
			if (paused || comboFromEvent(event) !== combo) return;
			event.preventDefault();
			latest.current(event);
		}
		globalThis.addEventListener("keydown", onKeyDown, true);
		return () => globalThis.removeEventListener("keydown", onKeyDown, true);
	}, [combo, enabled]);
}
