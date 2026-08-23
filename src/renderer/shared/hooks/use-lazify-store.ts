import type { CommandChoicePrompt } from "@main/command-runner";
import type { StarterFailureReason } from "@main/scaffolding/starter-provisioner";
import type {
  EnvironmentSummary,
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
  LogEntry,
  ProjectTreeNode,
  SyncedWorkspaceProject,
  TemplateOption,
  ToolScanReport,
  WorkflowStatus,
} from "@renderer/shared/types/lazify";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

const PROJECT_DIRECTORY_STORAGE_KEY = "lazify-project-directory";
const WORKSPACE_PROJECTS_STORAGE_KEY = "lazify-workspace-projects";
const ACTIVE_PROJECT_STORAGE_KEY = "lazify-active-project";

function readStoredProjectDirectory() {
  if (typeof window === "undefined") {
    return "";
  }

  return globalThis.localStorage.getItem(PROJECT_DIRECTORY_STORAGE_KEY) ?? "";
}

function persistProjectDirectory(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  globalThis.localStorage.setItem(PROJECT_DIRECTORY_STORAGE_KEY, value);
}

function readStoredWorkspaceProjects() {
  if (typeof window === "undefined") {
    return [] as SyncedWorkspaceProject[];
  }

  const rawValue = globalThis.localStorage.getItem(
    WORKSPACE_PROJECTS_STORAGE_KEY,
  );

  if (!rawValue) {
    return [] as SyncedWorkspaceProject[];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? (parsed as SyncedWorkspaceProject[]) : [];
  } catch {
    return [] as SyncedWorkspaceProject[];
  }
}

function persistWorkspaceProjects(value: SyncedWorkspaceProject[]) {
  if (typeof window === "undefined") {
    return;
  }

  globalThis.localStorage.setItem(
    WORKSPACE_PROJECTS_STORAGE_KEY,
    JSON.stringify(value),
  );
}

// The project the user last had open, so leaving a page and returning lands
// back on it instead of resetting to the first in the list.
function readStoredActiveProjectPath() {
  if (typeof window === "undefined") {
    return "";
  }

  return globalThis.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY) ?? "";
}

function persistActiveProjectPath(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  globalThis.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, value);
}

const projectNameAtom = atom("lazify-starter");
const projectDirectoryAtom = atom(readStoredProjectDirectory());
const activeProjectPathAtom = atom(readStoredActiveProjectPath());
const packageNameAtom = atom("");
const initSourceModeAtom = atom<"stack" | "imported">("stack");
const selectedTemplateIdAtom = atom("");
/** Scaffolder toggles chosen in the pre-flight panel, keyed by option key. */
const createOptionValuesAtom = atom<Record<string, boolean>>({});
const selectedImportedTemplateIdAtom = atom("");
const selectedImportedTemplateAtom = atom<ImportedTemplateSnapshot | null>(
  null,
);
const logsAtom = atom<LogEntry[]>([]);
const commandChoicePromptAtom = atom<CommandChoicePrompt | null>(null);
const busyAtom = atom(false);
const workflowStatusAtom = atom<WorkflowStatus>("idle");
const statusMessageAtom = atom("Checking local runtime prerequisites.");
/** Set only when a starter clone failed, so the console can say why in plain words. */
const starterFailureReasonAtom = atom<StarterFailureReason | null>(null);
const environmentAtom = atom<EnvironmentSummary | null>(null);
const templateOptionsAtom = atom<TemplateOption[]>([
  {
    id: "expo-default",
    label: "Expo Starter",
    description: "Default Expo template.",
  },
]);
const importedTemplateOptionsAtom = atom<ImportedTemplateOption[]>([]);
const syncedWorkspaceProjectsAtom = atom<SyncedWorkspaceProject[]>(
  readStoredWorkspaceProjects(),
);
const toolScanReportAtom = atom<ToolScanReport | null>(null);
const toolScanLoadingAtom = atom(false);

export function useLazifyStore() {
  const [projectName, setProjectName] = useAtom(projectNameAtom);
  const [projectDirectory, setProjectDirectory] = useAtom(projectDirectoryAtom);
  const [activeProjectPath, setActiveProjectPathAtom] = useAtom(
    activeProjectPathAtom,
  );
  const [packageName, setPackageName] = useAtom(packageNameAtom);
  const [initSourceMode, setInitSourceMode] = useAtom(initSourceModeAtom);
  const [selectedTemplateId, setSelectedTemplateId] = useAtom(
    selectedTemplateIdAtom,
  );
  const [createOptionValues, setCreateOptionValues] = useAtom(
    createOptionValuesAtom,
  );
  const [selectedImportedTemplateId, setSelectedImportedTemplateId] = useAtom(
    selectedImportedTemplateIdAtom,
  );
  const [selectedImportedTemplate, setSelectedImportedTemplate] = useAtom(
    selectedImportedTemplateAtom,
  );
  const logs = useAtomValue(logsAtom);
  const [commandChoicePrompt, setCommandChoicePrompt] = useAtom(
    commandChoicePromptAtom,
  );
  const busy = useAtomValue(busyAtom);
  const workflowStatus = useAtomValue(workflowStatusAtom);
  const statusMessage = useAtomValue(statusMessageAtom);
  const [starterFailureReason, setStarterFailureReason] = useAtom(
    starterFailureReasonAtom,
  );
  const environment = useAtomValue(environmentAtom);
  const templateOptions = useAtomValue(templateOptionsAtom);
  const importedTemplateOptions = useAtomValue(importedTemplateOptionsAtom);
  const syncedWorkspaceProjects = useAtomValue(syncedWorkspaceProjectsAtom);
  const toolScanReport = useAtomValue(toolScanReportAtom);
  const toolScanLoading = useAtomValue(toolScanLoadingAtom);
  const setLogs = useSetAtom(logsAtom);
  const setBusy = useSetAtom(busyAtom);
  const setWorkflowStatus = useSetAtom(workflowStatusAtom);
  const setStatusMessage = useSetAtom(statusMessageAtom);
  const setEnvironment = useSetAtom(environmentAtom);
  const setToolScanReport = useSetAtom(toolScanReportAtom);
  const setToolScanLoading = useSetAtom(toolScanLoadingAtom);
  const setTemplateOptions = useSetAtom(templateOptionsAtom);
  const setImportedTemplateOptions = useSetAtom(importedTemplateOptionsAtom);
  const setSyncedWorkspaceProjects = useSetAtom(syncedWorkspaceProjectsAtom);

  const setActiveProjectPath = useCallback(
    (value: string) => {
      persistActiveProjectPath(value);
      setActiveProjectPathAtom(value);
    },
    [setActiveProjectPathAtom],
  );

  const refreshToolScan = useCallback(
    async (force = false) => {
      setToolScanLoading(true);
      try {
        const report = await globalThis.lazify.scanTools(force);
        setToolScanReport(report);
      } finally {
        setToolScanLoading(false);
      }
    },
    [setToolScanLoading, setToolScanReport],
  );

  const refreshSingleTool = useCallback(
    async (toolName: string) => {
      const updated = await globalThis.lazify.probeTool(toolName);
      if (!updated) return;
      setToolScanReport((current) => {
        if (!current) return current;
        return {
          ...current,
          tools: current.tools.map((t) => (t.name === toolName ? updated : t)),
        };
      });
    },
    [setToolScanReport],
  );

  const refreshImportedTemplates = useCallback(async () => {
    const templates = await globalThis.lazify.listImportedTemplates();
    setImportedTemplateOptions(templates);

    if (templates.length === 0) {
      setSelectedImportedTemplateId("");
      setSelectedImportedTemplate(null);
      return templates;
    }

    if (!selectedImportedTemplateId) {
      setSelectedImportedTemplate(null);
      return templates;
    }

    const resolvedId = templates.some(
      (template) => template.id === selectedImportedTemplateId,
    )
      ? selectedImportedTemplateId
      : "";

    if (!resolvedId) {
      setSelectedImportedTemplateId("");
      setSelectedImportedTemplate(null);
      return templates;
    }

    const detail = await globalThis.lazify.getImportedTemplate(resolvedId);

    setSelectedImportedTemplateId(resolvedId);
    setSelectedImportedTemplate(detail);
    return templates;
  }, [
    selectedImportedTemplateId,
    setImportedTemplateOptions,
    setSelectedImportedTemplate,
    setSelectedImportedTemplateId,
  ]);

  const bootstrap = useCallback(async () => {
    const [env, templates] = await Promise.all([
      globalThis.lazify.checkEnvironment(),
      globalThis.lazify.listTemplates(),
    ]);

    setEnvironment({
      nodeVersion: env.nodeVersion,
      npmVersion: env.binaries.npm.version ?? "missing",
      yarnVersion: env.binaries.yarn.version ?? "missing",
    });

    setStatusMessage(
      env.issues.length === 0
        ? "Environment checks passed. Lazify is ready."
        : env.issues.join(" "),
    );

    setWorkflowStatus(env.issues.length === 0 ? "idle" : "error");

    if (templates.length > 0) {
      setTemplateOptions(
        templates.map((template) => ({
          id: template.id,
          label: template.label,
          description: template.description,
          createOptions: template.createOptions,
        })),
      );
    }

    await refreshImportedTemplates();
  }, [
    refreshImportedTemplates,
    setEnvironment,
    setStatusMessage,
    setTemplateOptions,
    setWorkflowStatus,
  ]);

  const bindEvents = useCallback(() => {
    const stopLogs = globalThis.lazify.onLog((entry) => {
      setLogs((current) => [
        ...current,
        {
          key: `${entry.id}-${current.length}`,
          timestamp: entry.timestamp,
          stream: entry.stream,
          message: entry.message.trimEnd(),
        },
      ]);
    });

    const stopProgress = globalThis.lazify.onWorkflowProgress((event) => {
      setWorkflowStatus(event.status);
      setStatusMessage(event.message);
      if (event.status !== "running") setCommandChoicePrompt(null);
    });

    const stopCommandChoicePrompts = globalThis.lazify.onCommandChoicePrompt(
      (prompt) => {
        setCommandChoicePrompt(prompt);
      },
    );

    return () => {
      stopLogs();
      stopProgress();
      stopCommandChoicePrompts();
    };
  }, [setCommandChoicePrompt, setLogs, setStatusMessage, setWorkflowStatus]);

  const chooseCommandOption = useCallback(
    async (promptId: string, optionId: string) => {
      const accepted = await globalThis.lazify.chooseCommandOption(
        promptId,
        optionId,
      );
      if (accepted) setCommandChoicePrompt(null);
      return accepted;
    },
    [setCommandChoicePrompt],
  );

  const createProject = useCallback(async () => {
    if (!projectName.trim() || !projectDirectory.trim()) {
      setWorkflowStatus("error");
      setStatusMessage("Enter a project name and workspace directory first.");
      return;
    }

    if (initSourceMode === "stack" && !selectedTemplateId.trim()) {
      setWorkflowStatus("error");
      setStatusMessage("Choose a stack before creating the project.");
      return;
    }

    if (initSourceMode === "imported" && !selectedImportedTemplateId.trim()) {
      setWorkflowStatus("error");
      setStatusMessage(
        "Choose an imported template before creating the project.",
      );
      return;
    }

    setBusy(true);
    setWorkflowStatus("running");
    setStatusMessage("Starting project creation.");
    setCommandChoicePrompt(null);
    // Cleared up front so a previous failure's notice cannot outlive its run.
    setStarterFailureReason(null);

    try {
      const result = await globalThis.lazify.createProject({
        name: projectName.trim(),
        baseDirectory: projectDirectory.trim(),
        sourceMode: initSourceMode,
        templateId: initSourceMode === "stack" ? selectedTemplateId : null,
        importedTemplateId:
          initSourceMode === "imported" ? selectedImportedTemplateId : null,
        structureTree: [],
        createOptions:
          initSourceMode === "stack" ? createOptionValues : undefined,
      });

      setWorkflowStatus(result.success ? "success" : "error");
      setStatusMessage(result.message);
      setStarterFailureReason(result.reason ?? null);
    } catch (error) {
      setWorkflowStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to create project.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    createOptionValues,
    initSourceMode,
    projectDirectory,
    projectName,
    selectedImportedTemplateId,
    selectedTemplateId,
    setBusy,
    setStarterFailureReason,
    setStatusMessage,
    setWorkflowStatus,
    setCommandChoicePrompt,
  ]);

  const installPackage = useCallback(async () => {
    if (
      !packageName.trim() ||
      !projectDirectory.trim() ||
      !projectName.trim()
    ) {
      setWorkflowStatus("error");
      setStatusMessage(
        "Enter a package name, project name, and workspace directory first.",
      );
      return;
    }

    setBusy(true);
    setWorkflowStatus("running");
    setStatusMessage("Starting package installation.");

    try {
      const result = await globalThis.lazify.installPackage({
        packageName: packageName.trim(),
        baseDirectory: projectDirectory.trim(),
        projectName: projectName.trim(),
      });

      setWorkflowStatus(result.success ? "success" : "error");
      setStatusMessage(result.message);
    } catch (error) {
      setWorkflowStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to install package.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    packageName,
    projectDirectory,
    projectName,
    setBusy,
    setStatusMessage,
    setWorkflowStatus,
  ]);

  const pickProjectDirectory = useCallback(async () => {
    try {
      const selectedPath = await globalThis.lazify.selectDirectory();

      if (selectedPath) {
        persistProjectDirectory(selectedPath);
        setProjectDirectory(selectedPath);
        setWorkflowStatus("idle");
        setStatusMessage(`Project directory selected: ${selectedPath}`);
      }
    } catch (error) {
      setWorkflowStatus("error");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to open the directory picker.",
      );
    }
  }, [setProjectDirectory, setStatusMessage, setWorkflowStatus]);

  const loadImportedTemplate = useCallback(
    async (templateId: string) => {
      if (!templateId) {
        setSelectedImportedTemplateId("");
        setSelectedImportedTemplate(null);
        return;
      }

      const detail = await globalThis.lazify.getImportedTemplate(templateId);
      setSelectedImportedTemplateId(templateId);
      setSelectedImportedTemplate(detail);
    },
    [setSelectedImportedTemplate, setSelectedImportedTemplateId],
  );

  const saveImportedTemplateChanges = useCallback(
    async (
      templateId: string,
      updates: { name?: string | null; tree?: ProjectTreeNode[] | null },
    ) => {
      const detail = await globalThis.lazify.updateImportedTemplate(
        templateId,
        updates,
      );
      await refreshImportedTemplates();
      setSelectedImportedTemplateId(detail.id);
      setSelectedImportedTemplate(detail);
      return detail;
    },
    [
      refreshImportedTemplates,
      setSelectedImportedTemplate,
      setSelectedImportedTemplateId,
    ],
  );

  const removeImportedTemplate = useCallback(
    async (templateId: string) => {
      await globalThis.lazify.deleteImportedTemplate(templateId);
      await refreshImportedTemplates();
    },
    [refreshImportedTemplates],
  );

  const syncWorkspaceProject = useCallback(
    async (projectPath?: string | null) => {
      const pickedPaths = projectPath
        ? [projectPath]
        : await globalThis.lazify.selectDirectories();

      if (pickedPaths.length === 0) {
        return null;
      }

      const isNewSync = projectPath == null;
      const pathsToSync = isNewSync
        ? pickedPaths.filter(
            (path) =>
              !syncedWorkspaceProjects.some((p) => p.projectPath === path),
          )
        : pickedPaths;

      if (pathsToSync.length === 0) {
        throw new Error(
          pickedPaths.length === 1
            ? "This project is already synced to the workspace."
            : "Those projects are already synced to the workspace.",
        );
      }

      const syncedProjects: SyncedWorkspaceProject[] = [];

      for (const path of pathsToSync) {
        const result =
          await globalThis.lazify.importProjectIndexFromDirectory(path);
        const syncedProject: SyncedWorkspaceProject = {
          id: result.projectPath,
          projectName: result.projectName,
          projectPath: result.projectPath,
          stack: result.stackDetection.stack,
          framework: result.stackDetection.framework,
          metaFramework: result.stackDetection.metaFramework,
          packageManager: result.stackDetection.packageManager,
          confidence: result.stackDetection.confidence,
          lastSyncedAt: new Date().toISOString(),
        };

        syncedProjects.push(syncedProject);

        setSyncedWorkspaceProjects((current) => {
          const nextProjects = [
            syncedProject,
            ...current.filter(
              (item) => item.projectPath !== syncedProject.projectPath,
            ),
          ];
          persistWorkspaceProjects(nextProjects);
          return nextProjects;
        });
      }

      setWorkflowStatus("success");
      setStatusMessage(
        syncedProjects.length === 1
          ? `Synced project "${syncedProjects[0].projectName}" into Workspace.`
          : `Synced ${syncedProjects.length} projects into Workspace.`,
      );

      return syncedProjects[0];
    },
    [
      setStatusMessage,
      setSyncedWorkspaceProjects,
      setWorkflowStatus,
      syncedWorkspaceProjects,
    ],
  );

  const removeSyncedWorkspaceProject = useCallback(
    (projectPath: string) => {
      setSyncedWorkspaceProjects((current) => {
        const nextProjects = current.filter(
          (item) => item.projectPath !== projectPath,
        );
        persistWorkspaceProjects(nextProjects);
        return nextProjects;
      });
    },
    [setSyncedWorkspaceProjects],
  );

  /**
   * Moves one project to another's position. The stored array *is* the order
   * the lists render in, so persisting it is all the reorder has to do — no
   * separate index to keep in step with syncs and removals.
   */
  const reorderSyncedWorkspaceProjects = useCallback(
    (fromProjectPath: string, toProjectPath: string) => {
      if (fromProjectPath === toProjectPath) return;

      setSyncedWorkspaceProjects((current) => {
        const fromIndex = current.findIndex(
          (item) => item.projectPath === fromProjectPath,
        );
        const toIndex = current.findIndex(
          (item) => item.projectPath === toProjectPath,
        );

        // A card dropped on something no longer in the list leaves it as-is.
        if (fromIndex === -1 || toIndex === -1) return current;

        const nextProjects = [...current];
        const [moved] = nextProjects.splice(fromIndex, 1);
        nextProjects.splice(toIndex, 0, moved);

        persistWorkspaceProjects(nextProjects);
        return nextProjects;
      });
    },
    [setSyncedWorkspaceProjects],
  );

  const updateProjectNodeVersion = useCallback(
    (projectPath: string, nodeVersion: string | null) => {
      setSyncedWorkspaceProjects((current) => {
        const nextProjects = current.map((item) =>
          item.projectPath === projectPath ? { ...item, nodeVersion } : item,
        );
        persistWorkspaceProjects(nextProjects);
        return nextProjects;
      });
    },
    [setSyncedWorkspaceProjects],
  );

  return {
    busy,
    environment,
    importedTemplateOptions,
    initSourceMode,
    logs,
    commandChoicePrompt,
    packageName,
    projectDirectory,
    activeProjectPath,
    projectName,
    selectedImportedTemplate,
    selectedImportedTemplateId,
    selectedTemplateId,
    syncedWorkspaceProjects,
    toolScanReport,
    toolScanLoading,
    statusMessage,
    templateOptions,
    workflowStatus,
    setProjectName,
    setProjectDirectory: (value: string) => {
      persistProjectDirectory(value);
      setProjectDirectory(value);
    },
    setActiveProjectPath,
    setPackageName,
    setInitSourceMode,
    setSelectedTemplateId,
    loadImportedTemplate,
    saveImportedTemplateChanges,
    removeImportedTemplate,
    syncWorkspaceProject,
    removeSyncedWorkspaceProject,
    reorderSyncedWorkspaceProjects,
    updateProjectNodeVersion,
    pickProjectDirectory,
    bootstrap,
    refreshToolScan,
    refreshSingleTool,
    refreshImportedTemplates,
    createProject,
    chooseCommandOption,
    starterFailureReason,
    installPackage,
    bindEvents,
    createOptionValues,
    setCreateOptionValues,
  };
}
