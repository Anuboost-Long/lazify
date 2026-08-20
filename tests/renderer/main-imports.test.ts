import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const RENDERER = path.join(ROOT, "src/renderer");
const MAIN = path.join(ROOT, "src/main");
const FORBIDDEN = /^(node:|electron$|fs$|path$|child_process$)/;

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) return sourceFiles(full);

    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Value imports only: a type import is erased before the bundler sees it. */
function valueImports(text: string): string[] {
  return [...text.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^;]*?from\s+"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((specifier) => !specifier.includes("{ type "));
}

function resolve(specifier: string, fromFile: string): string | null {
  const base = specifier.startsWith("@main/")
    ? path.join(MAIN, specifier.slice("@main/".length))
    : specifier.startsWith(".")
      ? path.resolve(path.dirname(fromFile), specifier)
      : null;

  if (!base) return null;

  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function reaches(file: string, seen = new Set<string>()): string | null {
  if (seen.has(file)) return null;

  seen.add(file);

  const text = fs.readFileSync(file, "utf8");

  for (const specifier of valueImports(text)) {
    if (FORBIDDEN.test(specifier)) return `${path.relative(ROOT, file)} → ${specifier}`;

    const next = resolve(specifier, file);
    const deeper = next ? reaches(next, seen) : null;

    if (deeper) return deeper;
  }

  return null;
}

describe("what the renderer is allowed to reach", () => {
  it("never pulls main-process code that needs node or electron", () => {
    const offenders = sourceFiles(RENDERER).flatMap((file) => {
      const text = fs.readFileSync(file, "utf8");

      return valueImports(text)
        .filter((specifier) => specifier.startsWith("@main/"))
        .flatMap((specifier) => {
          const target = resolve(specifier, file);
          const through = target ? reaches(target) : null;

          return through ? [`${path.relative(ROOT, file)} imports ${specifier} (${through})`] : [];
        });
    });

    expect(offenders).toEqual([]);
  });
});
