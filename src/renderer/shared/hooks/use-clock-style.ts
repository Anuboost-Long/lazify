import { atom, useAtom } from "jotai";

import {
	CLOCK_STYLE_OPTIONS,
	type ClockStyleId,
} from "@renderer/features/settings/components/settings-config";

const CLOCK_STYLE_STORAGE_KEY = "lazify-clock-style";

function readStoredClockStyle(): ClockStyleId {
	if (typeof window === "undefined") return CLOCK_STYLE_OPTIONS[0].id;

	const stored = globalThis.localStorage.getItem(CLOCK_STYLE_STORAGE_KEY);

	return CLOCK_STYLE_OPTIONS.some((option) => option.id === stored)
		? (stored as ClockStyleId)
		: CLOCK_STYLE_OPTIONS[0].id;
}

const clockStyleAtom = atom<ClockStyleId>(readStoredClockStyle());

export function useClockStyle() {
	const [clockStyle, setClockStyleAtom] = useAtom(clockStyleAtom);

	function setClockStyle(value: ClockStyleId) {
		globalThis.localStorage.setItem(CLOCK_STYLE_STORAGE_KEY, value);
		setClockStyleAtom(value);
	}

	return { clockStyle, setClockStyle };
}
