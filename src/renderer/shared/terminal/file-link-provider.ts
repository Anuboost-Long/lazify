import type { ILink, Terminal } from "@xterm/xterm";

export interface FileLinkHandlers {
  resolve?: (printedPath: string) => Promise<string | null>;
  open?: (absolutePath: string, line: number | null) => void;
}

// A path as agents print it: "docs/guide.md", "src/app/page.tsx:42",
// "package.json". The extension is required — without it every bare word in a
// sentence ("selection_ids", "end-to-end") would light up as a link.
const FILE_PATH_PATTERN = /\/?(?:[\w.@~+-]+\/)*[\w.@+-]+\.[A-Za-z]\w*(?::\d+){0,2}/g;

function splitLineSuffix(printed: string): { filePath: string; line: number | null } {
  const [filePath, line] = printed.split(":");

  return { filePath, line: line ? Number(line) : null };
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

      const candidates = [
        ...bufferLine.translateToString(true).matchAll(FILE_PATH_PATTERN),
      ];

      if (candidates.length === 0) {
        callback(undefined);
        return;
      }

      void Promise.all(
        candidates.map(async (candidate): Promise<ILink | null> => {
          const { filePath, line } = splitLineSuffix(candidate[0]);
          const absolutePath = await resolve(filePath);

          if (!absolutePath) return null;

          // xterm ranges are 1-based and inclusive on both ends.
          const startX = (candidate.index ?? 0) + 1;

          return {
            range: {
              start: { x: startX, y: bufferLineNumber },
              end: { x: startX + candidate[0].length - 1, y: bufferLineNumber },
            },
            text: candidate[0],
            activate: () => handlers.open?.(absolutePath, line),
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
