import type { CodeSelectionContext } from "@renderer/shared/ui/code/menu/code-selection";

const FENCE_LANGUAGE: Record<string, string> = {
  mjs: "js",
  cjs: "js",
  mts: "ts",
  cts: "ts",
  yml: "yaml",
  md: "markdown",
  py: "python",
  rb: "ruby",
  rs: "rust",
  kt: "kotlin",
  sh: "bash",
  zsh: "bash"
};

function fenceLanguage(fileName: string | null): string {
  const extension = fileName?.split(".").pop()?.toLowerCase() ?? "";

  if (!extension || extension === fileName) return "";

  return FENCE_LANGUAGE[extension] ?? extension;
}

function withLines(path: string, selection: CodeSelectionContext): string {
  if (!path) return "";

  return selection.startLine === selection.endLine
    ? `${path}:${selection.startLine}`
    : `${path}:${selection.startLine}-${selection.endLine}`;
}

export function formatCodeReference(
  selection: CodeSelectionContext,
  projectPath: string
): string {
  const path = selection.filePath ?? selection.fileName ?? "";
  const relative =
    projectPath && path.startsWith(`${projectPath}/`)
      ? path.slice(projectPath.length + 1)
      : path;

  return withLines(relative, selection);
}

export function formatAbsoluteCodeReference(selection: CodeSelectionContext): string {
  return withLines(selection.filePath ?? selection.fileName ?? "", selection);
}

export function buildCodePayload(selection: CodeSelectionContext): string {
  const reference = formatAbsoluteCodeReference(selection);
  const fence = "```";

  return [
    reference,
    `${fence}${fenceLanguage(selection.fileName)}`,
    selection.text,
    fence
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}
