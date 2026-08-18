export interface MethodDeclaration {
  name: string;
  signature: string;
  endIndex: number;
}

const MAX_DECLARATION_LINES = 12;

const CLASS_PATTERN = /\b(?:class|record|struct)\s+(\w+)/;
const METHOD_PATTERNS = [
  /\b(?:public|internal|protected|private)\s+(?:[\w<>,.\[\]?]+\s+)+?(\w+)\s*\(/,
  /(?:^|\s)(?:async\s+)?(\w+)\s*\(/
];

export function readClassName(text: string): string | null {
  return text.match(CLASS_PATTERN)?.[1] ?? null;
}

export function readBaseTypes(text: string): string[] {
  const inherits = text.match(/(?:class|record|struct)\s+\w+\s*(?:<[^>]*>)?\s*(?::|extends|implements)\s*([\w<>,. ]+)/);

  return (inherits?.[1] ?? "")
    .split(",")
    .map((baseType) => baseType.trim().replace(/<.*/, ""))
    .filter((baseType) => baseType.length > 0);
}

export function readMethodDeclaration(lines: string[], start: number): MethodDeclaration | null {
  const window = lines.slice(start, start + MAX_DECLARATION_LINES);
  const joined = window.join("\n");
  const match = METHOD_PATTERNS.map((pattern) => joined.match(pattern)).find(
    (candidate) => candidate?.index !== undefined && candidate.index <= window[0].length
  );

  if (!match?.[1] || match.index === undefined) return null;

  const open = joined.indexOf("(", match.index);
  let depth = 0;

  for (let index = open; index < joined.length; index += 1) {
    if (joined[index] === "(") depth += 1;
    else if (joined[index] === ")") {
      depth -= 1;

      if (depth === 0) {
        return {
          name: match[1],
          signature: joined.slice(open + 1, index).replace(/\s+/g, " ").trim(),
          endIndex: start + joined.slice(0, index).split("\n").length - 1
        };
      }
    }
  }

  return null;
}

export function readDocSummary(
  lines: string[],
  beforeIndex: number,
  linePrefix: string,
  tag: string
): string | null {
  const collected: string[] = [];

  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const text = lines[index].trim();

    if (text.startsWith(linePrefix)) {
      collected.unshift(text.slice(linePrefix.length).trim());
      continue;
    }

    if (text.startsWith("[") || text.startsWith("@") || text.startsWith("/*") || text.length === 0) {
      continue;
    }

    break;
  }

  const summary = collected.join(" ").match(new RegExp(`<${tag}>(.*?)</${tag}>`));

  return summary ? summary[1].replace(/\s+/g, " ").trim() || null : null;
}
