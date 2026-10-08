import { atom, useAtom } from "jotai";

const FOCUS_MS = 25 * 60 * 1000;
const STORAGE_KEY = "lazify-desktop-focus-timer";

interface FocusTimer {
	/** When a running timer runs out, or null while paused or reset. */
	endsAt: number | null;
	/** Time left while paused. */
	remainingMs: number;
}

const RESET: FocusTimer = { endsAt: null, remainingMs: FOCUS_MS };

/** Kept by end time rather than by ticking, so it keeps counting while home is closed. */
function readStored(): FocusTimer {
	try {
		const parsed = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY) ?? "null") as FocusTimer | null;
		return typeof parsed?.remainingMs === "number" ? parsed : RESET;
	} catch {
		return RESET;
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

	return {
		running,
		remainingMs,
		done: remainingMs === 0,
		start: () => setTimer({ endsAt: Date.now() + timer.remainingMs, remainingMs: timer.remainingMs }),
		pause: () => setTimer({ endsAt: null, remainingMs }),
		reset: () => setTimer(RESET),
	};
}

export function formatCountdown(ms: number) {
	const seconds = Math.ceil(ms / 1000);
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
