import fs from "node:fs/promises";
import path from "node:path";

import { collectSourceFiles, type SymbolDefinition } from "./symbol-finder";

/**
 * "Which file is this import?" — the other half of go-to-definition.
 *
 * Clicking a name asks the symbol finder where it is declared; clicking the path
 * an import came from asks this, and the two answer in the same shape. Relative
 * specifiers are resolved against the file being read. Everything else — the
 * alias forms every project spells differently, `@renderer/…`, `@/…`, `~/…` — is
 * matched by path suffix against the files already crawled, which resolves them
 * without reading a tsconfig, a jsconfig, or a bundler config.
 */

/** Tried in order when a specifier leaves the extension off, as bundlers do. */
const MODULE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".vue",
  ".svelte"
];

/** Windows paths compare as their POSIX selves, so suffix matching is one rule. */
function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}

/** Anything that could be a path rather than a name. */
export function isModuleSpecifier(value: string): boolean {
  return /^[.@~]/.test(value) || value.includes("/");
}

/** The file a specifier could mean, with the extension and index forms spelled out. */
function candidates(base: string): string[] {
  return [
    base,
    ...MODULE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...MODULE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`))
  ];
}

async function firstFile(paths: string[]): Promise<string | null> {
  for (const candidate of paths) {
    try {
      const stats = await fs.stat(candidate);
      if (stats.isFile()) return candidate;
    } catch {
      // Not there; the next spelling might be.
    }
  }

  return null;
}

/**
 * The crawled file whose path ends with the specifier, longest tail first.
 *
 * Leading segments are dropped one at a time because an alias stands for a
 * directory that is not in the specifier: `@renderer/shared/ui` is
 * `src/renderer/shared/ui`, and `@/components/Button` is `src/components/Button`.
 * Trying the longest tail first keeps a two-segment coincidence from winning
 * over the path the reader actually pointed at.
 */
function matchBySuffix(files: string[], specifier: string): string | null {
  const segments = toPosix(specifier)
    .replace(/^[@~]/, "")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..");

  for (let from = 0; from < segments.length; from += 1) {
    const tail = segments.slice(from).join("/");
    const suffixes = [
      ...MODULE_EXTENSIONS.map((extension) => `/${tail}${extension}`),
      ...MODULE_EXTENSIONS.map((extension) => `/${tail}/index${extension}`)
    ];

    const hit = files.find((file) => {
      const posix = toPosix(file);
      return suffixes.some((suffix) => posix.endsWith(suffix));
    });

    if (hit) return hit;
  }

  return null;
}

/**
 * The file a module specifier points at inside `projectPath`, or null.
 *
 * `fromPath` is the file the import was read in, which is what makes `./` and
 * `../` mean anything. A package from node_modules resolves to nothing on
 * purpose: it is not part of the project being read.
 */
export async function findModuleDefinition(
  projectPath: string,
  specifier: string,
  fromPath?: string | null
): Promise<SymbolDefinition | null> {
  if (!projectPath || !specifier) return null;

  const relative = specifier.startsWith(".");

  const resolved =
    relative && fromPath
      ? await firstFile(candidates(path.resolve(path.dirname(fromPath), specifier)))
      : null;

  const target = resolved ?? matchBySuffix(await collectSourceFiles(projectPath), specifier);
  if (!target) return null;

  const relativePath = path.relative(projectPath, target);

  // A specifier that climbed out of the project is not somewhere to navigate to.
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return null;

  return { absolutePath: target, relativePath, line: 1, kind: "file" };
}
