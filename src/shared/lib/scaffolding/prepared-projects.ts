import { appTempPath, createFolder, deletePath, movePath, pathExists } from "@/platform/folders";
import path from "@/shared/lib/path";
import { uniqueId } from "@/shared/lib/unique-id";

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

/** Electron's `mkdtemp(os.tmpdir()/lazify-project-)`, in the app's own temp folder. */
export async function createStagingRoot(): Promise<string> {
  const stagingRoot = path.join(await appTempPath(), "staging", uniqueId("lazify-project"));
  await createFolder(stagingRoot);
  return stagingRoot;
}

/** Moves the reviewed staging tree into the selected workspace. */
export async function materializePreparedProject(project: PreparedProject): Promise<void> {
  try {
    await movePath(project.projectPath, project.destinationPath);
  } catch (error) {
    // Across volumes Chain copies, then removes the source. When only that
    // removal fails the project is complete, and the staging tree goes below.
    if (!(await pathExists(project.destinationPath))) throw error;
  }

  await deletePath(project.stagingRoot);
}
