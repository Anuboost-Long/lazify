import type { IDisposable, Terminal } from "@xterm/xterm";

/**
 * Telling a running TUI that the app's theme changed.
 *
 * An agent picks light or dark once, by asking the terminal for its background
 * colour the moment it starts (OSC 11), and never asks again — both Claude Code
 * and Codex ask exactly once, and a resize does not make them ask a second
 * time. So switching Lazify's theme used to leave a light agent painting light
 * pink diffs onto a dark panel for the rest of the session.
 *
 * There is a protocol for exactly this. A TUI that wants to be told subscribes
 * with DEC private mode 2031, and the terminal then reports every change as
 * `CSI ? 997 ; 1 n` for dark or `; 2 n` for light. Claude Code subscribes;
 * xterm.js has no notion of the mode, so nothing ever answered it.
 *
 * Only subscribers are written to. The report goes to the session's stdin, and
 * a program that never asked for it would read the bytes as something someone
 * typed.
 */

/** The subscription: `CSI ? 2031 h` to start, `l` to stop. */
const SUBSCRIBE_MODE = 2031;

/** The one-off question, answered with the same report. */
const QUERY_PARAM = 996;

const DARK_REPORT = "\x1b[?997;1n";
const LIGHT_REPORT = "\x1b[?997;2n";

export const schemeReport = (resolvedTheme: string): string =>
	resolvedTheme === "light" ? LIGHT_REPORT : DARK_REPORT;

/**
 * Kept by run rather than by terminal: the same session can be shown in two
 * panels at once, and its terminal can be rebuilt from the backlog, while the
 * program that subscribed carries on regardless.
 */
const subscribers = new Set<string>();

/**
 * What each session was last told the background is, recorded at the moment it
 * asked. A session that asked once and cannot be told again is painting for
 * that answer until it is restarted, and this is what says so.
 */
const answered = new Map<string, string>();

const includes = (params: (number | number[])[], code: number): boolean =>
	params.some((param) => (Array.isArray(param) ? param.includes(code) : param === code));

export type SchemeWriter = (runId: string, data: string) => void;

/**
 * Watches one terminal for the subscription and for the question, and answers
 * the question straight away. Returns the disposer both handlers live under.
 */
export function watchColorScheme(
	term: Terminal,
	/** Read at the moment a sequence arrives: a terminal outlives one session. */
	currentRunId: () => string,
	currentTheme: () => string,
	write: SchemeWriter,
): () => void {
	const handlers: IDisposable[] = [
		/**
		 * The background query itself, noted rather than answered — xterm replies
		 * on its own. What matters here is which theme that reply carried.
		 *
		 * Only the first one counts. Rebuilding a terminal replays the session's
		 * backlog through the parser, startup query and all, and that replay says
		 * nothing about what the program was told when it actually asked.
		 */
		term.parser.registerOscHandler(11, (data) => {
			const runId = currentRunId();

			if (data === "?" && !answered.has(runId)) answered.set(runId, currentTheme());

			return false;
		}),

		// Every `CSI ? … h` passes through here, so anything that is not the
		// subscription is handed straight back to xterm's own handlers.
		term.parser.registerCsiHandler({ prefix: "?", final: "h" }, (params) => {
			if (includes(params, SUBSCRIBE_MODE)) subscribers.add(currentRunId());

			return false;
		}),

		term.parser.registerCsiHandler({ prefix: "?", final: "l" }, (params) => {
			if (includes(params, SUBSCRIBE_MODE)) subscribers.delete(currentRunId());

			return false;
		}),

		// `CSI ? 996 n` asks which scheme is in use. Other device reports — the
		// cursor position among them — are xterm's to answer.
		term.parser.registerCsiHandler({ prefix: "?", final: "n" }, (params) => {
			if (!includes(params, QUERY_PARAM)) return false;

			answered.set(currentRunId(), currentTheme());
			write(currentRunId(), schemeReport(currentTheme()));

			return true;
		}),
	];

	return () => handlers.forEach((handler) => handler.dispose());
}

/** Tells every session that asked to be told. */
export function reportSchemeChange(resolvedTheme: string, write: SchemeWriter): void {
	const report = schemeReport(resolvedTheme);

	subscribers.forEach((runId) => {
		write(runId, report);
		answered.set(runId, resolvedTheme);
	});
}

/**
 * Whether a session is painting for a theme the app has since left.
 *
 * True only for one that asked about the background and did not subscribe to
 * changes: a subscriber has been told, and something that never asked — a
 * shell, a dev server — has no palette of its own to be wrong about.
 */
export function schemeIsStale(runId: string, resolvedTheme: string): boolean {
	const told = answered.get(runId);

	return told !== undefined && !subscribers.has(runId) && told !== resolvedTheme;
}

export function forgetColorScheme(runId: string): void {
	subscribers.delete(runId);
	answered.delete(runId);
}

/** For tests, which need this as empty as a fresh app. */
export function forgetAllColorSchemes(): void {
	subscribers.clear();
	answered.clear();
}
