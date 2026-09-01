/**
 * Pulls a prompt apart into the pieces a decision can be made from.
 *
 * `detectTerminalIntent` answers "is this screen a question". That is enough to
 * ring a bell and no use at all for answering one: to answer, the option the
 * keystroke selects has to be known, and — the part that matters more — so does
 * what the question is *about*. A permission box says "Do you want to proceed?"
 * over a command drawn three lines above it, and the command is the whole story.
 * `rm -rf build` and `rm -rf ~` produce the same question.
 *
 * So this returns the option list, the question, and the box's body as separate
 * fields. The policy reads all three; nothing here decides anything.
 *
 * Deliberately conservative. Every shape it cannot read confidently comes back
 * as null, which the caller treats as "leave this one to the user" — a prompt
 * that is not understood is never one to type into.
 */

import crypto from "node:crypto";

import { normalizeScreen } from "./terminal-intent";

export type AgentPromptKind =
	/** A numbered menu: options to pick from by key. */
	| "choice"
	/** An inline `(y/n)` with no menu drawn. */
	| "yes-no"
	/** A field to type a value into — a token, a path, a name. */
	| "freetext";

export interface PromptOption {
	/** The keystroke that picks it: "1", "2", or "y"/"n" for an inline prompt. */
	key: string;
	label: string;
}

export interface AgentPrompt {
	kind: AgentPromptKind;
	/** The question itself, as one line. */
	question: string;
	/**
	 * What the box showed above the question: the command, the diff, the path.
	 *
	 * This is where the danger lives, and it is why the parser exists at all —
	 * the question is boilerplate, the body is the thing being asked about.
	 */
	body: string;
	options: PromptOption[];
	/**
	 * Identifies this prompt across redraws: the question, the options, and the
	 * tail of the body that names what is being asked about. Used to spot the same
	 * question being asked over and over — the signature of an agent stuck in a
	 * loop that autopilot must not feed forever.
	 */
	fingerprint: string;
}

/**
 * How far up from the option list to look for the question and body.
 *
 * A permission box is a dozen rows at most. Reaching further up starts picking
 * up the transcript above the box, which is text the agent printed earlier
 * rather than anything the prompt is asking about.
 */
const MAX_BOX_LINES = 20;

/** A numbered option, with or without the selection caret parked on it. */
const OPTION_LINE = /^\s*(?:[>❯▶→›»▸]\s*)?(\d{1,2})[.)]\s+(\S.*)$/;

/** An inline yes/no prompt, which draws no menu to pick from. */
const YES_NO = /(?:^|\s)([^?\n]{0,120}\?)?\s*[[(](?:y\/n|yes\/no)[\])]\s*:?\s*$/im;

/** A field to type into: "Enter your API key:", "Paste the token:". */
const INPUT_REQUEST =
	/^\s*(?:please\s+)?(?:enter|type|paste|provide|supply)\b([^\n:]{0,80}):\s*$/im;

/**
 * Box drawing, gutters and the caret column, stripped so the text inside a
 * framed prompt reads the same as an unframed one.
 */
const DECORATION = /^[\s│┃|╎┆┊>❯▶→›»▸*+-]+|(?<![\s│┃|╎┆┊])[\s│┃|╎┆┊]+$/g;

/** A rule drawn across the box: a separator, never content. */
const SEPARATOR_LINE = /^[─-╿\s]*$/;

/** Footer hints — chrome, never content. */
const CHROME =
	/^(?:esc(?:ape)? to|(?:shift\+)?tab to|enter to|\? for shortcuts|↑\/↓|arrow keys? to).*$/i;

function undecorate(line: string): string {
	return line.replace(DECORATION, "").trim();
}

/**
 * How much of the body identifies the prompt.
 *
 * The body ends with what is being asked about — the tool name, the command,
 * its one-line description — and starts with whatever prose the agent happened
 * to print above the box. Only the tail is wanted: including the prose makes two
 * askings of the identical command look like different questions, and dropping
 * the body altogether makes every command look like the same one.
 */
const FINGERPRINT_BODY_LINES = 4;

/**
 * Reduces a prompt to what identifies it: the same action asked about twice
 * fingerprints the same, and two different actions never do.
 *
 * Exact on purpose, beyond folding whitespace and case. An earlier version
 * generalised away paths and numbers, on the theory that they are the noisy
 * parts — but the one thing this is used for is spotting a question that keeps
 * coming back, and a loop repeats its command *exactly*. Blurring the digits
 * only made `test file-1` and `test file-2` collide, so a run working through a
 * list of files tripped the repeat guard and rang the bell mid-task. Precision
 * costs nothing here: the rate limit is what catches a storm of distinct prompts.
 */
function fingerprintOf(question: string, body: string, options: PromptOption[]): string {
	const subject = body.split("\n").slice(-FINGERPRINT_BODY_LINES).join(" ");
	const shape = [subject, question, ...options.map((option) => option.label)]
		.join(" | ")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();

	return crypto.createHash("sha1").update(shape).digest("hex").slice(0, 12);
}

/**
 * Collects the numbered menu at the bottom of the screen, newest first.
 *
 * Walks up from the last option line so a menu still in the buffer from an
 * earlier prompt cannot be mistaken for the live one, and stops at option 1 —
 * a menu that does not reach 1 is a fragment of a redraw in progress.
 */
function lastOptionLine(lines: string[]): number {
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		if (OPTION_LINE.test(lines[index])) return index;
	}

	return -1;
}

function readOptions(lines: string[]): { options: PromptOption[]; from: number } | null {
	const last = lastOptionLine(lines);

	if (last === -1) return null;

	const found: PromptOption[] = [];
	let expected = Number(OPTION_LINE.exec(lines[last])?.[1] ?? 0);
	let index = last;

	// Options wrap: a long label continues on the next row with no number of its
	// own, so a non-option line between two options is a continuation, not the
	// end of the menu.
	for (; index >= 0 && found.length < 12; index -= 1) {
		const match = OPTION_LINE.exec(lines[index]);

		if (!match) {
			// Only a wrapped label may sit between options. Anything else is the
			// question, and the menu ended above it.
			const continues = !lines[index].trim() || found.length === 0 || expected > 1;

			if (!continues) break;
			continue;
		}

		const [, key, label] = match;

		if (Number(key) !== expected) break;

		found.unshift({ key, label: label.trim() });
		expected -= 1;

		if (expected === 0) {
			// A complete menu, 1..n. Everything above is the question and body.
			return { options: found, from: index };
		}
	}

	return null;
}

/**
 * Reads a prompt off a terminal tail, or null when there is nothing it can be
 * confident about.
 *
 * Pass raw PTY bytes or stripped text; both are normalised here.
 */
export function parseAgentPrompt(screen: string): AgentPrompt | null {
	const text = normalizeScreen(screen).replace(/\r\n?/g, "\n");
	if (!text.trim()) return null;

	const lines = text.split("\n").map(undecorate);
	const menu = readOptions(lines);

	if (menu) {
		// The rows above the menu, nearest first: the question is the last thing
		// said before the options, and the body is what came before that.
		const above = lines
			.slice(Math.max(0, menu.from - MAX_BOX_LINES), menu.from)
			.filter((line) => line && !CHROME.test(line) && !SEPARATOR_LINE.test(line));

		let questionAt = -1;
		for (let index = above.length - 1; index >= 0; index -= 1) {
			if (above[index].endsWith("?")) {
				questionAt = index;
				break;
			}
		}

		// Some prompts state rather than ask ("Apply this change"). The nearest
		// line still describes what is being decided, so it stands in.
		const question = questionAt >= 0 ? above[questionAt] : (above[above.length - 1] ?? "");
		const body = (questionAt >= 0 ? above.slice(0, questionAt) : above.slice(0, -1)).join("\n");

		if (!question) return null;

		return {
			kind: "choice",
			question,
			body,
			options: menu.options,
			fingerprint: fingerprintOf(question, body, menu.options),
		};
	}

	// No menu. The remaining shapes are read from the live tail only: an inline
	// prompt is one line, and one line further up is transcript.
	const tail = lines.filter(Boolean).slice(-MAX_BOX_LINES);
	const tailText = tail.join("\n");

	const yesNo = YES_NO.exec(tailText);

	if (yesNo) {
		const question = (yesNo[1] ?? yesNo[0]).trim();
		const options: PromptOption[] = [
			{ key: "y", label: "yes" },
			{ key: "n", label: "no" },
		];

		return {
			kind: "yes-no",
			question,
			// Whatever preceded the question on screen is what it is about.
			body: tail.slice(0, -1).join("\n"),
			options,
			fingerprint: fingerprintOf(question, tail.slice(0, -1).join("\n"), options),
		};
	}

	const input = INPUT_REQUEST.exec(tailText);

	if (input) {
		const question = input[0].trim();

		return {
			kind: "freetext",
			question,
			body: tail.slice(0, -1).join("\n"),
			options: [],
			fingerprint: fingerprintOf(question, tail.slice(0, -1).join("\n"), []),
		};
	}

	return null;
}
