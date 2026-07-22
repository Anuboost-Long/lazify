import fs from "node:fs";
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

    if (!payload.templateId) {
      throw new Error("Choose a stack before creating the project.");
    }

    const template = getTemplate(payload.templateId);
    const baseDirectory = resolveUserPath(payload.baseDirectory);
    const projectPath = path.resolve(baseDirectory, payload.name);
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

    if (payload.structureTree.length > 0) {
      this.emitProgress({
        workflowId,
        status: "running",
        step: "reconcile-project-structure",
        message: "Applying Lazify file structure to the generated project."
      });

      // Expo scaffolds source into `src/`; replace it wholesale so the generated
      // routes/components don't conflict with the configured structure.
      reconcileProjectStructure(
        projectPath,
        payload.structureTree,
        template.projectType === "expo" ? ["src"] : []
      );
    }

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

function resolveUserPath(inputPath: string): string {
  if (inputPath === "~") {
    return os.homedir();
  }

  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  return inputPath;
}
