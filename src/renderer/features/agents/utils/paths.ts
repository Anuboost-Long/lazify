import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";

/** Splits a repo-relative path into the folder part and the file name. */
export function splitPath(filePath: string) {
  const index = filePath.lastIndexOf("/");

  return index === -1
    ? { directory: "", name: filePath }
    : { directory: filePath.slice(0, index + 1), name: filePath.slice(index + 1) };
}

/** Restores the remembered project when possible, otherwise selects the first synced project. */
export function resolveAgentProjectPath(
  projects: SyncedWorkspaceProject[],
  activeProjectPath: string
): string {
  return projects.some((project) => project.projectPath === activeProjectPath)
    ? activeProjectPath
    : projects[0]?.projectPath ?? "";
}

/** Formats Finder selections for insertion into the active agent terminal. */
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

/** Resolves a path printed in a terminal against the active project. */
export function resolvePrintedProjectPath(projectPath: string, printedPath: string): string | null {
  if (!projectPath) return null;

  return printedPath.startsWith("/")
    ? printedPath
    : `${projectPath}/${printedPath.replace(/^\.\//, "")}`;
}
