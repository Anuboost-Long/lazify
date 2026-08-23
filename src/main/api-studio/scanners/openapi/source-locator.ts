function indentOf(line: string) {
  return line.length - line.trimStart().length;
}

function keyPattern(key: string) {
  return new RegExp(`^["']?${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']?\\s*:`);
}

export function findOperationLine(
  rawText: string,
  routePath: string,
  methodKey: string
): number | null {
  const lines = rawText.split(/\r?\n/);
  const pathMatcher = keyPattern(routePath);
  const pathIndex = lines.findIndex((line) => pathMatcher.test(line.trim()));

  if (pathIndex === -1) return null;

  const pathIndent = indentOf(lines[pathIndex]);
  const methodMatcher = keyPattern(methodKey);

  for (let index = pathIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().length === 0) continue;
    if (indentOf(line) <= pathIndent) break;
    if (methodMatcher.test(line.trim())) return index + 1;
  }

  return pathIndex + 1;
}
