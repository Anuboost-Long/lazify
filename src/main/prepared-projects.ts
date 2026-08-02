import type { StarterOptionalFolder } from "./starter-descriptor";

/**
 * A project whose tree exists on disk but which the user has not finished
 * setting up: they are still browsing it, removing files, and ticking optional
 * folders before anything is installed.
 */
export interface PreparedProject {
  projectPath: string;
  templateId: string;
  /**
   * Whether this run created the directory. Discarding may only ever delete a
   * directory we made — the renderer is not allowed to be the source of this,
   * because a wrong answer deletes someone's existing folder.
   */
  createdDirectory: boolean;
  /** From the starter's descriptor; empty for a CLI-created project. */
  optionalFolders: StarterOptionalFolder[];
  /** Globs the picker may not remove. */
  required: string[];
}

const preparedProjects = new Map<string, PreparedProject>();

export function rememberPreparedProject(project: PreparedProject): void {
  preparedProjects.set(project.projectPath, project);
}

export function getPreparedProject(projectPath: string): PreparedProject | undefined {
  return preparedProjects.get(projectPath);
}

export function forgetPreparedProject(projectPath: string): void {
  preparedProjects.delete(projectPath);
}
