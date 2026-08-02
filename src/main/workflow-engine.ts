import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ProjectTreeNode } from "../renderer/shared/types/lazify";
import {
  getAutoFixArgs,
  getInstallCommand,
  getTemplate,
  getUninstallCommand,
  summarizeAutoFix,
  type TemplateDefinition
} from "./harmonizer";
import { getImportedTemplate } from "./imported-template-store";
import {
  buildTemplatePackageInstallPlan,
  loadTemplatePackageManifest,
  readProjectPackageJson,
  resolveManifestToLatest
} from "./template-package-manifest";
import type { StarterSource } from "./catalog";
import {
  forgetPreparedProject,
  getPreparedProject,
  rememberPreparedProject,
  type PreparedProject
} from "./prepared-projects";
import type { StarterDescriptor, StarterOptionalFolder } from "./starter-descriptor";
import {
  provisionStarter,
  StarterError,
  type StarterFailureReason
} from "./starter-provisioner";
import { reconcileProjectStructure } from "./tree-reconciler";
import { CommandRunner } from "./command-runner";
import { choosePackageManager, scanEnvironment, type CommandBinary, type PackageManager } from "./scanner";

export interface WorkflowProgressEvent {
  workflowId: string;
  status: "idle" | "running" | "success" | "error";
  step: string;
  message: string;
}

export interface WorkflowResult {
  success: boolean;
  message: string;
  projectPath?: string;
  /** Set only when a starter clone failed, so the UI can name the cause. */
  reason?: StarterFailureReason;
}

export interface CreateProjectPayload {
  name: string;
  baseDirectory: string;
  sourceMode: "stack" | "imported";
  templateId?: string | null;
  importedTemplateId?: string | null;
  structureTree: ProjectTreeNode[];
  /** Keyed by TemplateCreateOption.key; missing keys fall back to the option default. */
  createOptions?: Record<string, boolean>;
}

export interface PrepareProjectResult {
  success: boolean;
  message: string;
  projectPath?: string;
  reason?: StarterFailureReason;
  /** Folders the starter offers but does not ship; empty for a CLI project. */
  optionalFolders?: StarterOptionalFolder[];
  /** Paths the picker may not remove. */
  required?: string[];
}

export interface FinalizeProjectPayload {
  projectPath: string;
  /** Project-relative paths the user unticked. Anything in `required` is ignored. */
  removePaths?: string[];
  /** Project-relative optional folders the user ticked, each created with a .gitkeep. */
  optionalFolderPaths?: string[];
}

export interface InstallPackagePayload {
  packageName: string;
  baseDirectory: string;
  projectName: string;
}

export interface AddProjectPackagePayload {
  projectPath: string;
  packageName: string;
  dev?: boolean;
}

export interface RemoveProjectPackagePayload {
  projectPath: string;
  packageName: string;
}

type ProgressEmitter = (event: WorkflowProgressEvent) => void;

export class WorkflowEngine {
  constructor(
    private readonly commandRunner: CommandRunner,
    private readonly emitProgress: ProgressEmitter
  ) {}

  async createProject(payload: CreateProjectPayload): Promise<WorkflowResult> {
    const workflowId = `create-${Date.now()}`;
    const environment = scanEnvironment();

    if (environment.issues.length > 0) {
      throw new Error(environment.issues.join(" "));
    }

    if (payload.sourceMode === "imported") {
      return this.createProjectFromImportedTemplate(payload, workflowId);
    }

    // One shot: produce the tree and finish it without a review step. This is
    // what the current init flow calls; once the picker reads the prepared tree
    // from disk it will call the two halves itself and this can go.
    const prepared = await this.prepareProject(payload);

    if (!prepared.success || !prepared.projectPath) {
      return { success: false, message: prepared.message, reason: prepared.reason };
    }

    return this.finalizeProject({ projectPath: prepared.projectPath });
  }

  /**
   * Step one of two. Produces the project tree on disk — a starter clone or the
   * framework CLI's output — and stops there, so the picker can browse the real
   * thing before anything is installed. `finalizeProject` finishes the job, and
   * `discardPreparedProject` backs it out.
   */
  async prepareProject(payload: CreateProjectPayload): Promise<PrepareProjectResult> {
    const workflowId = `create-${Date.now()}`;
    const environment = scanEnvironment();

    if (environment.issues.length > 0) {
      throw new Error(environment.issues.join(" "));
    }

    if (!payload.templateId) {
      throw new Error("Choose a stack before creating the project.");
    }

    const template = getTemplate(payload.templateId);
    const baseDirectory = resolveUserPath(payload.baseDirectory);
    const projectPath = path.resolve(baseDirectory, payload.name);
    const directoryExistedBefore = fs.existsSync(projectPath);

    // Tier 1: the stack has a starter repo, so the project is a clone of a real
    // application rather than CLI output with a tree synthesized over it.
    if (template.starter) {
      return this.prepareFromStarter({
        workflowId,
        template,
        starter: template.starter,
        baseDirectory,
        projectPath,
        projectName: payload.name,
        directoryExistedBefore
      });
    }

    const createCommand = resolveTemplateCommand(template);
    const createArgs = template.createCommands[createCommand];

    if (!createArgs) {
      throw new Error(`Template "${template.label}" does not support ${createCommand}.`);
    }

    this.emitProgress({
      workflowId,
      status: "running",
      step: "preflight",
      message: `Environment ready. Using ${createCommand} for ${template.label}.`
    });

    this.emitProgress({
      workflowId,
      status: "running",
      step: "create-project",
      message: `Creating project in ${projectPath}.`
    });

    fs.mkdirSync(baseDirectory, { recursive: true });

    // Some scaffolders (create-next-app) declare negated boolean flags like
    // --no-tailwind that swallow a trailing positional, so the project name
    // cannot simply be appended. Templates mark the correct slot with
    // {{projectName}}; anything without a marker keeps the old append behavior.
    const nameMarker = "{{projectName}}";
    const resolvedArgs = createArgs.includes(nameMarker)
      ? createArgs.map((arg) => (arg === nameMarker ? payload.name : arg))
      : [...createArgs, payload.name];

    // Option flags go last: the name is already positioned, so there is no
    // trailing positional left for a negated flag to swallow.
    const optionFlags = (template.createOptions ?? []).map((option) =>
      (payload.createOptions?.[option.key] ?? option.default) ? option.onFlag : option.offFlag
    );

    const createResult = await this.commandRunner.runCommand({
      command: createCommand,
      args: [...resolvedArgs, ...optionFlags],
      cwd: baseDirectory
    });

    if (!createResult.success) {
      this.emitProgress({
        workflowId,
        status: "error",
        step: "create-project",
        message: "Project creation failed."
      });

      return {
        success: false,
        message: "Project creation failed."
      };
    }

    // Tier 2 has no starter descriptor, so nothing is protected from removal and
    // there are no optional folders to offer — the picker just reads the tree.
    rememberPreparedProject({
      projectPath,
      templateId: template.id,
      createdDirectory: !directoryExistedBefore,
      optionalFolders: [],
      required: []
    });

    return {
      success: true,
      message: `Project created in ${projectPath}.`,
      projectPath,
      optionalFolders: [],
      required: []
    };
  }

  /**
   * Step two of two: what the user chose in the picker, then install, then a
   * repository. Everything here used to run straight after creation, before
   * anyone could look at the tree.
   */
  async finalizeProject(payload: FinalizeProjectPayload): Promise<WorkflowResult> {
    const workflowId = `finalize-${Date.now()}`;
    const prepared = getPreparedProject(payload.projectPath);

    if (!prepared) {
      throw new Error("That project is no longer waiting to be finished.");
    }

    const { projectPath } = prepared;
    const template = getTemplate(prepared.templateId);

    await this.applyPickerChoices(payload, prepared, workflowId);

    // Tier 1 finishes differently: a starter is a working app, so there is no
    // structure to reconcile and no manifest to apply — its own package.json is
    // the dependency list, and overlaying a synthesized tree here would
    // reintroduce exactly the drift the starter repos exist to remove.
    if (template.starter) {
      return this.finalizeStarterProject(projectPath, workflowId);
    }

    if (template.postInstallDependencies?.length) {
      this.emitProgress({
        workflowId,
        status: "running",
        step: "install-template-dependencies",
        message: "Installing template dependencies."
      });

      const dependencyResult = await this.installPackagesWithAutoFix({
        workflowId,
        packageManager: choosePackageManager(projectPath),
        projectPath,
        packages: template.postInstallDependencies
      });

      if (!dependencyResult.success) {
        this.emitProgress({
          workflowId,
          status: "error",
          step: "install-template-dependencies",
          message: "Project was created, but template dependency installation failed."
        });

        return {
          success: false,
          message: "Project was created, but template dependency installation failed.",
          projectPath
        };
      }
    }

    // The structure the user chose was applied to the real tree in
    // applyPickerChoices. Nothing synthesized is overlaid here any more.

    this.emitProgress({
      workflowId,
      status: "running",
      step: "resolve-package-versions",
      message: "Resolving latest compatible package versions from npm."
    });

    const rawManifest = loadTemplatePackageManifest(template);
    const projectPackageJson = readProjectPackageJson(projectPath);
    const packageManifest = await resolveManifestToLatest(rawManifest, {
      ...projectPackageJson.dependencies,
      ...projectPackageJson.devDependencies
    });
    const packagePlan = buildTemplatePackageInstallPlan(packageManifest, projectPackageJson);

    if (packagePlan.versionMismatches.length > 0) {
      this.emitProgress({
        workflowId,
        status: "running",
        step: "package-version-check",
        message: `Detected ${String(packagePlan.versionMismatches.length)} package version mismatch(es). Leaving existing versions unchanged for now.`
      });
    }

    if (packagePlan.dependencies.length > 0) {
      this.emitProgress({
        workflowId,
        status: "running",
        step: "install-manifest-dependencies",
        message: `Installing ${String(packagePlan.dependencies.length)} missing dependency package(s).`
      });

      const dependencyResult = await this.installPackagesWithAutoFix({
        workflowId,
        packageManager: choosePackageManager(projectPath),
        projectPath,
        packages: packagePlan.dependencies,
        dev: false
      });

      if (!dependencyResult.success) {
        this.emitProgress({
          workflowId,
          status: "error",
          step: "install-manifest-dependencies",
          message: "Project was created, but runtime dependency installation failed."
        });

        return {
          success: false,
          message: "Project was created, but runtime dependency installation failed.",
          projectPath
        };
      }
    }

    if (packagePlan.devDependencies.length > 0) {
      this.emitProgress({
        workflowId,
        status: "running",
        step: "install-manifest-dev-dependencies",
        message: `Installing ${String(packagePlan.devDependencies.length)} missing dev dependency package(s).`
      });

      const devDependencyResult = await this.installPackagesWithAutoFix({
        workflowId,
        packageManager: choosePackageManager(projectPath),
        projectPath,
        packages: packagePlan.devDependencies,
        dev: true
      });

      if (!devDependencyResult.success) {
        this.emitProgress({
          workflowId,
          status: "error",
          step: "install-manifest-dev-dependencies",
          message: "Project was created, but dev dependency installation failed."
        });

        return {
          success: false,
          message: "Project was created, but dev dependency installation failed.",
          projectPath
        };
      }
    }

    this.emitProgress({
      workflowId,
      status: "success",
      step: "complete",
      message: `Project created successfully at ${projectPath}.`
    });

    return {
      success: true,
      message: `Project created successfully at ${projectPath}.`,
      projectPath
    };
  }

  /**
   * Removes what the user unticked and creates the optional folders they asked
   * for. `required` is enforced here rather than only in the UI, because a
   * starter is verified green by CI as a whole and these are the files without
   * which it cannot build.
   */
  private async applyPickerChoices(
    payload: FinalizeProjectPayload,
    prepared: PreparedProject,
    workflowId: string
  ): Promise<void> {
    const removals = (payload.removePaths ?? []).filter(
      (relativePath) => !prepared.required.includes(relativePath)
    );

    if (removals.length > 0) {
      this.emitProgress({
        workflowId,
        status: "running",
        step: "apply-structure",
        message: `Removing ${String(removals.length)} file(s) you unticked.`
      });

      for (const relativePath of removals) {
        await fsPromises.rm(resolveInsideProject(prepared.projectPath, relativePath), {
          recursive: true,
          force: true
        });
      }
    }

    for (const relativePath of payload.optionalFolderPaths ?? []) {
      const folderPath = resolveInsideProject(prepared.projectPath, relativePath);
      await fsPromises.mkdir(folderPath, { recursive: true });
      // A .gitkeep so an empty folder the user asked for survives the commit.
      await fsPromises.writeFile(path.join(folderPath, ".gitkeep"), "");
    }
  }

  /** Tier 1 finish: install what the starter declares, then make it a repository. */
  private async finalizeStarterProject(
    projectPath: string,
    workflowId: string
  ): Promise<WorkflowResult> {
    this.emitProgress({
      workflowId,
      status: "running",
      step: "install-dependencies",
      message: "Installing the starter's dependencies."
    });

    const installResult = await this.commandRunner.runCommand({
      command: choosePackageManager(projectPath),
      args: ["install"],
      cwd: projectPath
    });

    if (!installResult.success) {
      this.emitProgress({
        workflowId,
        status: "error",
        step: "install-dependencies",
        message: "Project was created, but dependency installation failed."
      });

      return {
        success: false,
        message: "Project was created, but dependency installation failed.",
        projectPath
      };
    }

    // The starter's history was dropped during provisioning, so without this the
    // project has no repository at all — worse than what the CLI tier produces.
    await this.initializeRepository(projectPath, workflowId);

    forgetPreparedProject(projectPath);

    const message = `Project created successfully at ${projectPath}.`;
    this.emitProgress({ workflowId, status: "success", step: "complete", message });

    return { success: true, message, projectPath };
  }

  /**
   * Backs out a prepared project. Only ever deletes a directory this run
   * created — a folder that was already there is left exactly as it was, even
   * though the tree was written into it.
   */
  async discardPreparedProject(projectPath: string): Promise<{ removed: boolean }> {
    const prepared = getPreparedProject(projectPath);

    if (!prepared) {
      return { removed: false };
    }

    forgetPreparedProject(projectPath);

    if (!prepared.createdDirectory) {
      return { removed: false };
    }

    await fsPromises.rm(projectPath, { recursive: true, force: true });

    return { removed: true };
  }

  /** Tier 1 step one: clone the starter and stop, so the picker sees the real tree. */
  private async prepareFromStarter(options: {
    workflowId: string;
    template: TemplateDefinition;
    starter: StarterSource;
    baseDirectory: string;
    projectPath: string;
    projectName: string;
    directoryExistedBefore: boolean;
  }): Promise<PrepareProjectResult> {
    const {
      workflowId,
      template,
      starter,
      baseDirectory,
      projectPath,
      projectName,
      directoryExistedBefore
    } = options;

    this.emitProgress({
      workflowId,
      status: "running",
      step: "preflight",
      message: `Environment ready. Using the ${template.label} starter.`
    });

    this.emitProgress({
      workflowId,
      status: "running",
      step: "create-project",
      message: `Cloning ${starter.repo} at ${starter.ref} into ${projectPath}.`
    });

    fs.mkdirSync(baseDirectory, { recursive: true });

    let descriptor: StarterDescriptor;

    try {
      descriptor = await provisionStarter({
        repo: starter.repo,
        ref: starter.ref,
        projectPath,
        projectName
      });
    } catch (error) {
      const failure =
        error instanceof StarterError
          ? error
          : new StarterError("clone-failed", (error as Error).message);

      // A partial clone is worse than none: it looks like a project and cannot
      // build. Only ever remove a directory this run created.
      if (!directoryExistedBefore) {
        fs.rmSync(projectPath, { recursive: true, force: true });
      }

      // The message carries git's own words, which is what makes a log useful.
      // Turning the reason into something a person should read is the UI's job.
      this.emitProgress({
        workflowId,
        status: "error",
        step: "create-project",
        message: failure.message
      });

      return { success: false, message: failure.message, reason: failure.reason };
    }

    rememberPreparedProject({
      projectPath,
      templateId: template.id,
      createdDirectory: !directoryExistedBefore,
      optionalFolders: descriptor.optionalFolders,
      required: descriptor.required
    });

    const message = `Cloned ${starter.repo} into ${projectPath}.`;

    // Running, not success: the project is not finished until it is installed.
    this.emitProgress({ workflowId, status: "running", step: "review-structure", message });

    return {
      success: true,
      message,
      projectPath,
      optionalFolders: descriptor.optionalFolders,
      required: descriptor.required
    };
  }

  /**
   * Best effort: a project that exists but is not a git repo is still usable,
   * so nothing here may turn a created project into a failed one. runCommand
   * rejects rather than resolving when a binary cannot be spawned, so the whole
   * sequence is wrapped rather than only its exit codes checked.
   */
  private async initializeRepository(projectPath: string, workflowId: string): Promise<void> {
    const steps = [["init", "--quiet"], ["add", "-A"], ["commit", "--quiet", "-m", "Initial commit"]];

    try {
      for (const args of steps) {
        const result = await this.commandRunner.runCommand({ command: "git", args, cwd: projectPath });

        if (!result.success) {
          break;
        }

        if (args === steps[steps.length - 1]) {
          return;
        }
      }
    } catch {
      // Falls through to the same notice as a non-zero exit.
    }

    this.emitProgress({
      workflowId,
      status: "running",
      step: "git-init",
      message: "Project created, but the git repository could not be initialized."
    });
  }

  private async createProjectFromImportedTemplate(
    payload: CreateProjectPayload,
    workflowId: string
  ): Promise<WorkflowResult> {
    if (!payload.importedTemplateId) {
      throw new Error("Select an imported template before creating the project.");
    }

    const importedTemplate = await getImportedTemplate(payload.importedTemplateId);
    const baseDirectory = resolveUserPath(payload.baseDirectory);
    const projectPath = path.resolve(baseDirectory, payload.name);
    const structureTree =
      payload.structureTree.length > 0 ? payload.structureTree : importedTemplate.tree;

    this.emitProgress({
      workflowId,
      status: "running",
      step: "preflight",
      message: `Preparing imported template ${importedTemplate.name}.`
    });

    this.emitProgress({
      workflowId,
      status: "running",
      step: "create-project",
      message: `Scaffolding project from imported template in ${projectPath}.`
    });

    fs.mkdirSync(projectPath, { recursive: true });
    reconcileProjectStructure(projectPath, structureTree);

    if (fs.existsSync(path.join(projectPath, "package.json"))) {
      this.emitProgress({
        workflowId,
        status: "running",
        step: "install-dependencies",
        message: "Installing project dependencies."
      });

      const packageManager = choosePackageManager(projectPath);
      const installResult = await this.runPlainInstall({ workflowId, packageManager, projectPath });

      if (!installResult.success) {
        this.emitProgress({
          workflowId,
          status: "error",
          step: "install-dependencies",
          message: "Project was created, but dependency installation failed."
        });

        return {
          success: false,
          message: "Project was created, but dependency installation failed.",
          projectPath
        };
      }
    }

    this.emitProgress({
      workflowId,
      status: "success",
      step: "complete",
      message: `Project created successfully at ${projectPath}.`
    });

    return {
      success: true,
      message: `Project created successfully at ${projectPath}.`,
      projectPath
    };
  }

  async installPackage(payload: InstallPackagePayload): Promise<WorkflowResult> {
    const workflowId = `install-${Date.now()}`;
    const environment = scanEnvironment();

    if (environment.issues.length > 0) {
      throw new Error(environment.issues.join(" "));
    }

    const projectPath = path.resolve(resolveUserPath(payload.baseDirectory), payload.projectName);
    const packageManager = choosePackageManager(projectPath);

    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    this.emitProgress({
      workflowId,
      status: "running",
      step: "install-package",
      message: `Installing ${payload.packageName} with ${packageManager}.`
    });

    const result = await this.installPackagesWithAutoFix({
        workflowId,
        packageManager,
        projectPath,
        packages: payload.packageName.split(",").map((item) => item.trim()).filter(Boolean)
      });

    if (!result.success) {
      this.emitProgress({
        workflowId,
        status: "error",
        step: "install-package",
        message: "Package installation failed."
      });

      return {
        success: false,
        message: "Package installation failed."
      };
    }

    this.emitProgress({
      workflowId,
      status: "success",
      step: "complete",
      message: "Packages installed successfully."
    });

    return {
      success: true,
      message: "Packages installed successfully.",
      projectPath
    };
  }

  async addProjectPackage(payload: AddProjectPackagePayload): Promise<WorkflowResult> {
    const workflowId = `add-pkg-${Date.now()}`;

    if (!fs.existsSync(payload.projectPath)) {
      throw new Error(`Project path does not exist: ${payload.projectPath}`);
    }

    const packageManager = choosePackageManager(payload.projectPath);

    this.emitProgress({
      workflowId,
      status: "running",
      step: "add-package",
      message: `Installing ${payload.packageName} with ${packageManager}.`
    });

    const result = await this.installPackagesWithAutoFix({
      workflowId,
      packageManager,
      projectPath: payload.projectPath,
      packages: [payload.packageName],
      dev: payload.dev
    });

    if (!result.success) {
      this.emitProgress({
        workflowId,
        status: "error",
        step: "add-package",
        message: "Package installation failed."
      });
      return { success: false, message: "Package installation failed." };
    }

    this.emitProgress({
      workflowId,
      status: "success",
      step: "complete",
      message: `${payload.packageName} installed successfully.`
    });

    return { success: true, message: `${payload.packageName} installed successfully.`, projectPath: payload.projectPath };
  }

  async installProjectDependencies(projectPath: string): Promise<WorkflowResult> {
    const workflowId = `install-deps-${Date.now()}`;

    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const packageManager = choosePackageManager(projectPath);

    this.emitProgress({
      workflowId,
      status: "running",
      step: "install-dependencies",
      message: `Installing dependencies with ${packageManager}.`
    });

    const result = await this.runPlainInstall({ workflowId, packageManager, projectPath });

    if (!result.success) {
      this.emitProgress({
        workflowId,
        status: "error",
        step: "install-dependencies",
        message: "Dependency installation failed."
      });
      return { success: false, message: "Dependency installation failed." };
    }

    this.emitProgress({
      workflowId,
      status: "success",
      step: "complete",
      message: "Dependencies installed successfully."
    });

    return { success: true, message: "Dependencies installed successfully.", projectPath };
  }

  async removeProjectPackage(payload: RemoveProjectPackagePayload): Promise<WorkflowResult> {
    const workflowId = `remove-pkg-${Date.now()}`;

    if (!fs.existsSync(payload.projectPath)) {
      throw new Error(`Project path does not exist: ${payload.projectPath}`);
    }

    const packageManager = choosePackageManager(payload.projectPath);

    this.emitProgress({
      workflowId,
      status: "running",
      step: "remove-package",
      message: `Removing ${payload.packageName} with ${packageManager}.`
    });

    const args = getUninstallCommand(packageManager, payload.packageName);
    const result = await this.commandRunner.runCommand({
      command: packageManager,
      args,
      cwd: payload.projectPath
    });

    if (!result.success) {
      this.emitProgress({
        workflowId,
        status: "error",
        step: "remove-package",
        message: "Package removal failed."
      });
      return { success: false, message: "Package removal failed." };
    }

    this.emitProgress({
      workflowId,
      status: "success",
      step: "complete",
      message: `${payload.packageName} removed successfully.`
    });

    return { success: true, message: `${payload.packageName} removed successfully.`, projectPath: payload.projectPath };
  }

  private async runPlainInstall(input: {
    workflowId: string;
    packageManager: PackageManager;
    projectPath: string;
  }) {
    const result = await this.commandRunner.runCommand({
      command: input.packageManager,
      args: ["install"],
      cwd: input.projectPath
    });

    if (result.success) {
      return result;
    }

    if (input.packageManager === "npm") {
      this.emitProgress({
        workflowId: input.workflowId,
        status: "running",
        step: "dependency-auto-fix",
        message: summarizeAutoFix(input.packageManager)
      });

      return this.commandRunner.runCommand({
        command: input.packageManager,
        args: ["install", "--legacy-peer-deps"],
        cwd: input.projectPath
      });
    }

    return result;
  }

  private async installPackagesWithAutoFix(input: {
    workflowId: string;
    packageManager: PackageManager;
    projectPath: string;
    packages: string[];
    dev?: boolean;
  }) {
    const args = getInstallCommand(input.packageManager, input.packages, { dev: input.dev });
    const result = await this.commandRunner.runCommand({
      command: input.packageManager,
      args,
      cwd: input.projectPath
    });

    if (result.success) {
      return result;
    }

    const autoFixArgs = getAutoFixArgs(input.packageManager, input.packages, { dev: input.dev });

    if (!autoFixArgs) {
      return result;
    }

    this.emitProgress({
      workflowId: input.workflowId,
      status: "running",
      step: "dependency-auto-fix",
      message: summarizeAutoFix(input.packageManager)
    });

    return this.commandRunner.runCommand({
      command: input.packageManager,
      args: autoFixArgs,
      cwd: input.projectPath
    });
  }
}

function resolveTemplateCommand(template: TemplateDefinition): CommandBinary {
  const scan = scanEnvironment();
  const supportedCommands = Object.keys(template.createCommands) as CommandBinary[];

  if (supportedCommands.includes(template.preferredPackageManager) && scan.binaries[template.preferredPackageManager].available) {
    return template.preferredPackageManager;
  }

  const fallback = supportedCommands.find((command) => scan.binaries[command].available);

  if (!fallback) {
    throw new Error(`No available command runner was found for template "${template.label}".`);
  }

  return fallback;
}

/**
 * Picker choices arrive from the renderer, so a path that climbs out of the
 * project is refused rather than trusted — this one deletes files.
 */
function resolveInsideProject(projectPath: string, relativePath: string): string {
  const resolved = path.resolve(projectPath, relativePath);
  const root = path.resolve(projectPath);

  if (resolved === root || !resolved.startsWith(root + path.sep)) {
    throw new Error(`Refusing to touch a path outside the project: ${relativePath}`);
  }

  return resolved;
}

function resolveUserPath(inputPath: string): string {
  if (inputPath === "~") {
    return os.homedir();
  }

  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  return inputPath;
}
