import { atom, useAtom } from "jotai";

const MINUTE_MS = 60 * 1000;
const DEFAULT_MS = 25 * MINUTE_MS;
export const MIN_FOCUS_MINUTES = 1;
export const MAX_FOCUS_MINUTES = 23 * 60 + 59;
const STORAGE_KEY = "lazify-desktop-focus-timer";

interface FocusTimer {
	/** When a running timer runs out, or null while paused or reset. */
	endsAt: number | null;
	/** Time left while paused. */
	remainingMs: number;
	/** The length the user chose; reset returns to it. */
	durationMs: number;
}

const fresh = (durationMs: number): FocusTimer => ({ endsAt: null, remainingMs: durationMs, durationMs });

/** Kept by end time rather than by ticking, so it keeps counting while home is closed. */
function readStored(): FocusTimer {
	try {
		const parsed = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<FocusTimer> | null;
		if (typeof parsed?.remainingMs !== "number") return fresh(DEFAULT_MS);
		// Saved before the length could be chosen.
		const durationMs = typeof parsed.durationMs === "number" ? parsed.durationMs : DEFAULT_MS;
		return { endsAt: parsed.endsAt ?? null, remainingMs: parsed.remainingMs, durationMs };
	} catch {
		return fresh(DEFAULT_MS);
	}
}

const focusTimerAtom = atom<FocusTimer>(readStored());

export function useFocusTimer(now: Date) {
	const [timer, setTimerAtom] = useAtom(focusTimerAtom);

	const setTimer = (next: FocusTimer) => {
		setTimerAtom(next);
		try {
			globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		} catch {
			// The timer still runs for this session.
		}
	};

	const running = timer.endsAt !== null;
	const remainingMs = running ? Math.max(0, (timer.endsAt ?? 0) - now.getTime()) : timer.remainingMs;

	const { durationMs } = timer;

	return {
		running,
		remainingMs,
		done: remainingMs === 0,
		/** Not started, or reset: the length can still be changed. */
		idle: !running && remainingMs === durationMs,
		minutes: Math.round(durationMs / MINUTE_MS),
		start: () => setTimer({ ...timer, endsAt: Date.now() + timer.remainingMs }),
		pause: () => setTimer({ ...timer, endsAt: null, remainingMs }),
		reset: () => setTimer(fresh(durationMs)),
		setMinutes: (minutes: number) =>
			setTimer(
				fresh(Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, Math.round(minutes))) * MINUTE_MS),
			),
	};
}

export function formatCountdown(ms: number) {
	const seconds = Math.ceil(ms / 1000);
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor(seconds / 60) % 60;
	const rest = String(seconds % 60).padStart(2, "0");
	return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}
