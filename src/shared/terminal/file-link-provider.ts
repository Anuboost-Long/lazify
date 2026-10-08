import type { ILink, Terminal } from "@xterm/xterm";

export interface FileLinkHandlers {
	resolve?: (printedPath: string) => Promise<string | null>;
	open?: (absolutePath: string, line: number | null) => void;
}

// A run of the characters a printed path is made of, plus the ":42:7" an agent
// may append. One class and one optional suffix, so a long line of word
// characters is walked once rather than retried from every position in it.
const FILE_TOKEN = /[\w.@~+/-]+(?::\d+){0,2}/g;

/** An extension is a letter and then word characters: `.ts`, `.md`, `.mjs`. */
const EXTENSION = /^[A-Za-z]\w*$/;

function splitLineSuffix(printed: string): { filePath: string; line: number | null } {
	const [filePath, line] = printed.split(":");

	return { filePath, line: line ? Number(line) : null };
}

/**
 * The extension is what tells a path from prose — without it every bare word in
 * a sentence ("selection_ids", "end-to-end") would light up as a link.
 */
function namesAFile(filePath: string): boolean {
	const name = filePath.slice(filePath.lastIndexOf("/") + 1);
	const dot = name.lastIndexOf(".");

	return dot > 0 && EXTENSION.test(name.slice(dot + 1));
}

export interface FileCandidate {
	/** The text of the link, and where the line it was printed on starts. */
	text: string;
	index: number;
	filePath: string;
	line: number | null;
}

/**
 * The paths a printed line holds, as link ranges.
 *
 * A token is taken whole and then trimmed back to what can end a path, so the
 * full stop closing a sentence is not read as part of the file it follows.
 */
export function fileCandidates(printed: string): FileCandidate[] {
	const found: FileCandidate[] = [];

	for (const match of printed.matchAll(FILE_TOKEN)) {
		const token = match[0];
		let end = token.length;

		while (end > 0 && !/\w/.test(token[end - 1])) end -= 1;

		const text = token.slice(0, end);
		const { filePath, line } = splitLineSuffix(text);

		if (text && namesAFile(filePath)) {
			found.push({ text, index: match.index ?? 0, filePath, line });
		}
	}

	return found;
}

/**
 * Paths in the output are clickable, the way they are in an IDE terminal. Only
 * what resolves is drawn as a link, so prose that happens to look path-shaped
 * stays plain text.
 *
 * Handlers are read from `handlers` on every hover rather than captured, so a
 * terminal shared between mount points picks up whichever one is showing it.
 */
export function registerFileLinks(term: Terminal, handlers: FileLinkHandlers) {
	let disposed = false;

	term.registerLinkProvider({
		provideLinks(bufferLineNumber, callback) {
			const { resolve, open } = handlers;
			const bufferLine = term.buffer.active.getLine(bufferLineNumber - 1);

			if (!resolve || !open || !bufferLine) {
				callback(undefined);
				return;
			}

			const candidates = fileCandidates(bufferLine.translateToString(true));

			if (candidates.length === 0) {
				callback(undefined);
				return;
			}

			void Promise.all(
				candidates.map(async (candidate): Promise<ILink | null> => {
					const absolutePath = await resolve(candidate.filePath);

					if (!absolutePath) return null;

					// xterm ranges are 1-based and inclusive on both ends.
					const startX = candidate.index + 1;

					return {
						range: {
							start: { x: startX, y: bufferLineNumber },
							end: { x: startX + candidate.text.length - 1, y: bufferLineNumber },
						},
						text: candidate.text,
						activate: () => handlers.open?.(absolutePath, candidate.line),
					};
				}),
			).then((links) => {
				if (disposed) return;

				const found = links.filter((link): link is ILink => link !== null);
				callback(found.length > 0 ? found : undefined);
			});
		},
	});

	// The provider itself goes with the terminal; this only stops in-flight
	// resolves from calling back into a terminal that is being torn down.
	return () => {
		disposed = true;
	};
}
