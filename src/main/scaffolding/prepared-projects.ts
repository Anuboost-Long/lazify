import fs from "node:fs/promises";
import path from "node:path";

import type { StarterOptionalFolder } from "./starter-descriptor";

/**
 * A project whose tree exists on disk but which the user has not finished
 * setting up: they are still browsing it, removing files, and ticking optional
 * folders before it is placed in the selected workspace.
 */
export interface PreparedProject {
  /** Temporary tree shown in the structure picker before the project exists in the workspace. */
  projectPath: string;
  /** The user-selected location where Create Project will place the reviewed tree. */
  destinationPath: string;
  /** Temporary parent created by Lazify and removed on create or discard. */
  stagingRoot: string;
  templateId: string;
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

/** Moves the reviewed staging tree into the selected workspace. */
export async function materializePreparedProject(project: PreparedProject): Promise<void> {
  try {
    await fs.rename(project.projectPath, project.destinationPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") {
      throw error;
    }

    const copyRoot = await fs.mkdtemp(
      path.join(path.dirname(project.destinationPath), ".lazify-copy-")
    );
    const copyPath = path.join(copyRoot, path.basename(project.destinationPath));

    try {
      await fs.cp(project.projectPath, copyPath, { recursive: true });
      await fs.rename(copyPath, project.destinationPath);
    } finally {
      await fs.rm(copyRoot, { recursive: true, force: true });
    }
  }

  await fs.rm(project.stagingRoot, { recursive: true, force: true });
}
