import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";

export function splitPath(filePath: string) {
  const index = filePath.lastIndexOf("/");

  return index === -1
    ? { directory: "", name: filePath }
    : { directory: filePath.slice(0, index + 1), name: filePath.slice(index + 1) };
}

export function resolveAgentProjectPath(
  projects: SyncedWorkspaceProject[],
  activeProjectPath: string
): string {
  return projects.some((project) => project.projectPath === activeProjectPath)
    ? activeProjectPath
    : projects[0]?.projectPath ?? "";
}

export function formatPickedPathsForTerminal(projectPath: string, pickedPaths: string[]): string {
  const paths = pickedPaths.map((absolutePath) => {
    const selectedPath =
      projectPath && absolutePath.startsWith(`${projectPath}/`)
        ? absolutePath.slice(projectPath.length + 1)
        : absolutePath;

    return selectedPath.includes(" ") ? `"${selectedPath}"` : selectedPath;
  });

  return `${paths.join(" ")} `;
}

export function resolvePrintedProjectPath(projectPath: string, printedPath: string): string | null {
  if (!projectPath) return null;

  return printedPath.startsWith("/")
    ? printedPath
    : `${projectPath}/${printedPath.replace(/^\.\//, "")}`;
}
