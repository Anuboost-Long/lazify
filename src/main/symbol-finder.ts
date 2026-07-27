import fs from "node:fs/promises";
import path from "node:path";

/**
 * "Where does this component come from?" — answered by reading the project,
 * not by hosting a language server.
 *
 * A click in a read-only editor gives one thing to work with: a name. This
 * looks for the place that name is declared, ranks what it finds, and hands
 * back a file and a line. It is deliberately a heuristic — no type resolution,
 * no import following, no scope analysis — because a wrong jump costs a click
 * and the right one saves a search across the tree.
 *
 * What keeps it fast enough for a click is the ordering: the file named after
 * the symbol is read first, and an exported declaration ends the walk.
 */

/** Directories that never hold a definition the user is reading. */
const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".expo",
  ".turbo",
  "coverage",
  "bin",
  "obj",
  ".vs",
  "TestResults"
]);

/** Sources worth scanning. Anything else cannot declare a symbol we resolve. */
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".vue",
  ".svelte",
  ".cs"
]);

/** A generated bundle can be megabytes of one line; it is never the answer. */
const MAX_FILE_BYTES = 512 * 1024;
/** Ceiling on the walk, so a monorepo cannot turn a click into a stall. */
const MAX_FILES = 6000;
/** How long a project's file list stays good enough to reuse. */
const FILE_LIST_TTL_MS = 30_000;

export interface SymbolDefinition {
  absolutePath: string;
  relativePath: string;
  /** 1-based, so it can be handed straight to an editor gutter. */
  line: number;
  /** How the match was made, for callers that want to say. */
  kind: "export" | "declaration" | "file";
}

interface FileListEntry {
  files: string[];
  readAt: number;
}

const fileListCache = new Map<string, FileListEntry>();

/** Only a plain identifier can be resolved; anything else is not a symbol. */
function isIdentifier(symbol: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(symbol);
}

/**
 * Declaration sites, most specific first. Every pattern is anchored at the
 * start of a line (after indentation) so a mention inside an expression or an
 * argument list is not mistaken for a declaration.
 */
function declarationPatterns(symbol: string): { pattern: RegExp; kind: "export" | "declaration" }[] {
  const name = symbol.replace(/[$]/g, "\\$&");

  return [
    // export function Foo / export default class Foo / export const Foo
    {
      pattern: new RegExp(
        `^\\s*export\\s+(?:default\\s+)?(?:async\\s+)?(?:function\\*?|class|const|let|var|interface|type|enum|abstract\\s+class)\\s+${name}\\b`
      ),
      kind: "export"
    },
    // export { Foo } — a barrel, but still a lead worth following.
    { pattern: new RegExp(`^\\s*export\\s*\\{[^}]*\\b${name}\\b`), kind: "export" },
    // function Foo / class Foo / const Foo = ...
    {
      pattern: new RegExp(
        `^\\s*(?:async\\s+)?(?:function\\*?|class|const|let|var|interface|type|enum)\\s+${name}\\b`
      ),
      kind: "declaration"
    },
    // C# and other brace languages: public sealed class Foo, private void Foo(
    {
      pattern: new RegExp(
        `^\\s*(?:public|private|protected|internal|static|sealed|partial|abstract|virtual|override|async|\\s)*\\b(?:class|record|struct|interface|enum)\\s+${name}\\b`
      ),
      kind: "declaration"
    }
  ];
}

async function collectSourceFiles(projectPath: string): Promise<string[]> {
  const cached = fileListCache.get(projectPath);
  if (cached && Date.now() - cached.readAt < FILE_LIST_TTL_MS) return cached.files;

  const files: string[] = [];
  const queue: string[] = [projectPath];

  while (queue.length > 0 && files.length < MAX_FILES) {
    const current = queue.shift();
    if (!current) break;

    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      // A directory that cannot be read simply holds no answer.
      continue;
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;

      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORY_NAMES.has(entry.name)) queue.push(entryPath);
        continue;
      }

      if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(entryPath);
      }
    }
  }

  fileListCache.set(projectPath, { files, readAt: Date.now() });

  return files;
}

/**
 * Files in the order most likely to hold the answer: the one named after the
 * symbol, then its index barrels, then the rest shortest-path first — which
 * puts `src/` ahead of a fixture buried six levels down.
 */
function rankFiles(files: string[], symbol: string): string[] {
  const lowered = symbol.toLowerCase();

  const score = (filePath: string) => {
    const base = path.basename(filePath, path.extname(filePath)).toLowerCase();
    if (base === lowered) return 0;
    if (base === "index") return 2;
    return 1;
  };

  return [...files].sort((a, b) => {
    const byScore = score(a) - score(b);
    if (byScore !== 0) return byScore;
    return a.length - b.length;
  });
}

/**
 * The best declaration of `symbol` inside `projectPath`, or null.
 *
 * Stops at the first exported declaration: that is the one an import would have
 * resolved to, so nothing later can be a better answer.
 */
export async function findSymbolDefinition(
  projectPath: string,
  symbol: string
): Promise<SymbolDefinition | null> {
  if (!projectPath || !isIdentifier(symbol)) return null;

  const files = rankFiles(await collectSourceFiles(projectPath), symbol);
  const patterns = declarationPatterns(symbol);
  /** Kept in case nothing exported turns up. */
  let fallback: SymbolDefinition | null = null;

  for (const filePath of files) {
    let contents: string;
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > MAX_FILE_BYTES) continue;
      contents = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    // Cheap rejection before splitting a whole file into lines.
    if (!contents.includes(symbol)) continue;

    const lines = contents.split("\n");

    for (let index = 0; index < lines.length; index += 1) {
      const match = patterns.find((candidate) => candidate.pattern.test(lines[index]));
      if (!match) continue;

      const hit: SymbolDefinition = {
        absolutePath: filePath,
        relativePath: path.relative(projectPath, filePath),
        line: index + 1,
        kind: match.kind
      };

      if (match.kind === "export") return hit;
      fallback ??= hit;
      break;
    }

    // A file named after the symbol that declares nothing matching is still
    // where the reader meant to go — a default-exported anonymous component,
    // most often. Held as the weakest answer.
    if (
      !fallback &&
      path.basename(filePath, path.extname(filePath)).toLowerCase() === symbol.toLowerCase()
    ) {
      fallback = {
        absolutePath: filePath,
        relativePath: path.relative(projectPath, filePath),
        line: 1,
        kind: "file"
      };
    }
  }

  return fallback;
}
