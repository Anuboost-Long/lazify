import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  getAutoFixArgs,
  getInstallCommand,
  getTemplate,
  summarizeAutoFix,
  type TemplateDefinition
} from "./harmonizer";
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
  templateId: string;
}

export interface InstallPackagePayload {
  packageName: string;
  baseDirectory: string;
  projectName: string;
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

    const createResult = await this.commandRunner.runCommand({
      command: createCommand,
      args: [...createArgs, payload.name],
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
        packageManager: choosePackageManager(),
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

    const packageManager = choosePackageManager();
    const projectPath = path.resolve(resolveUserPath(payload.baseDirectory), payload.projectName);

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

  private async installPackagesWithAutoFix(input: {
    workflowId: string;
    packageManager: PackageManager;
    projectPath: string;
    packages: string[];
  }) {
    const args = getInstallCommand(input.packageManager, input.packages);
    const result = await this.commandRunner.runCommand({
      command: input.packageManager,
      args,
      cwd: input.projectPath
    });

    if (result.success) {
      return result;
    }

    const autoFixArgs = getAutoFixArgs(input.packageManager, input.packages);

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
