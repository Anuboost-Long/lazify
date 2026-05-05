import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import type {
  EnvironmentSummary,
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
  LogEntry,
  ProjectTreeNode,
  SavedInitWorkflowConfig,
  SyncedWorkspaceProject,
  TemplateOption,
  ToolScanReport,
  WorkflowStatus,
} from "@renderer/shared/types/lazify";

const PROJECT_DIRECTORY_STORAGE_KEY = "lazify-project-directory";
const WORKSPACE_PROJECTS_STORAGE_KEY = "lazify-workspace-projects";

function readStoredProjectDirectory() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(PROJECT_DIRECTORY_STORAGE_KEY) ?? "";
}

function persistProjectDirectory(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROJECT_DIRECTORY_STORAGE_KEY, value);
}

function readStoredWorkspaceProjects() {
  if (typeof window === "undefined") {
    return [] as SyncedWorkspaceProject[];
  }

  const rawValue = window.localStorage.getItem(WORKSPACE_PROJECTS_STORAGE_KEY);

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

  window.localStorage.setItem(WORKSPACE_PROJECTS_STORAGE_KEY, JSON.stringify(value));
}

const projectNameAtom = atom("lazify-starter");
const projectDirectoryAtom = atom(readStoredProjectDirectory());
const packageNameAtom = atom("");
const initSourceModeAtom = atom<"stack" | "imported">("stack");
const selectedTemplateIdAtom = atom("");
const selectedImportedTemplateIdAtom = atom("");
const selectedImportedTemplateAtom = atom<ImportedTemplateSnapshot | null>(null);
const initWorkflowStageAtom = atom<"configure" | "structure">("configure");
const savedInitWorkflowConfigAtom = atom<SavedInitWorkflowConfig | null>(null);
const savedStructureTreeAtom = atom<ProjectTreeNode[] | null>(null);
const selectedStructurePathsAtom = atom<string[]>(["app", "components", "lib", "hooks"]);
const logsAtom = atom<LogEntry[]>([]);
const busyAtom = atom(false);
const workflowStatusAtom = atom<WorkflowStatus>("idle");
const statusMessageAtom = atom("Checking local runtime prerequisites.");
const environmentAtom = atom<EnvironmentSummary | null>(null);
const templateOptionsAtom = atom<TemplateOption[]>([
  {
    id: "expo-default",
    label: "Expo Starter",
    description: "Default Expo template."
  }
]);
const importedTemplateOptionsAtom = atom<ImportedTemplateOption[]>([]);
const syncedWorkspaceProjectsAtom = atom<SyncedWorkspaceProject[]>(readStoredWorkspaceProjects());
const toolScanReportAtom = atom<ToolScanReport | null>(null);
const toolScanLoadingAtom = atom(false);

export function useLazifyStore() {
  const [projectName, setProjectName] = useAtom(projectNameAtom);
  const [projectDirectory, setProjectDirectory] = useAtom(projectDirectoryAtom);
  const [packageName, setPackageName] = useAtom(packageNameAtom);
  const [initSourceMode, setInitSourceMode] = useAtom(initSourceModeAtom);
  const [selectedTemplateId, setSelectedTemplateId] = useAtom(selectedTemplateIdAtom);
  const [selectedImportedTemplateId, setSelectedImportedTemplateId] = useAtom(selectedImportedTemplateIdAtom);
  const [selectedImportedTemplate, setSelectedImportedTemplate] = useAtom(selectedImportedTemplateAtom);
  const [initWorkflowStage, setInitWorkflowStage] = useAtom(initWorkflowStageAtom);
  const [savedInitWorkflowConfig, setSavedInitWorkflowConfig] = useAtom(savedInitWorkflowConfigAtom);
  const [savedStructureTree, setSavedStructureTree] = useAtom(savedStructureTreeAtom);
  const [selectedStructurePaths, setSelectedStructurePaths] = useAtom(selectedStructurePathsAtom);
  const logs = useAtomValue(logsAtom);
  const busy = useAtomValue(busyAtom);
  const workflowStatus = useAtomValue(workflowStatusAtom);
  const statusMessage = useAtomValue(statusMessageAtom);
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

  const resetInitFlow = useCallback(() => {
    setInitWorkflowStage("configure");
    setSavedInitWorkflowConfig(null);
    setSavedStructureTree(null);
  }, [setInitWorkflowStage, setSavedInitWorkflowConfig, setSavedStructureTree]);

  const refreshToolScan = useCallback(async (force = false) => {
    setToolScanLoading(true);
    try {
      const report = await window.lazify.scanTools(force);
      setToolScanReport(report);
    } finally {
      setToolScanLoading(false);
    }
  }, [setToolScanLoading, setToolScanReport]);

  const refreshSingleTool = useCallback(async (toolName: string) => {
    const updated = await window.lazify.probeTool(toolName);
    if (!updated) return;
    setToolScanReport((current) => {
      if (!current) return current;
      return {
        ...current,
        tools: current.tools.map((t) => t.name === toolName ? updated : t),
      };
    });
  }, [setToolScanReport]);

  const refreshImportedTemplates = useCallback(async () => {
    const templates = await window.lazify.listImportedTemplates();
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

    const resolvedId = templates.some((template) => template.id === selectedImportedTemplateId)
      ? selectedImportedTemplateId
      : "";

    if (!resolvedId) {
      setSelectedImportedTemplateId("");
      setSelectedImportedTemplate(null);
      return templates;
    }

    const detail = await window.lazify.getImportedTemplate(resolvedId);

    setSelectedImportedTemplateId(resolvedId);
    setSelectedImportedTemplate(detail);
    return templates;
  }, [
    selectedImportedTemplateId,
    setImportedTemplateOptions,
    setSelectedImportedTemplate,
    setSelectedImportedTemplateId
  ]);

  const bootstrap = useCallback(async () => {
    const [env, templates] = await Promise.all([
      window.lazify.checkEnvironment(),
      window.lazify.listTemplates()
    ]);

    setEnvironment({
      nodeVersion: env.nodeVersion,
      npmVersion: env.binaries.npm.version ?? "missing",
      yarnVersion: env.binaries.yarn.version ?? "missing"
    });

    setStatusMessage(
      env.issues.length === 0
        ? "Environment checks passed. Lazify is ready."
        : env.issues.join(" ")
    );

    setWorkflowStatus(env.issues.length === 0 ? "idle" : "error");

    if (templates.length > 0) {
      setTemplateOptions(
        templates.map((template) => ({
          id: template.id,
          label: template.label,
          description: template.description
        }))
      );
    }

    await refreshImportedTemplates();
  }, [
    refreshImportedTemplates,
    setEnvironment,
    setStatusMessage,
    setTemplateOptions,
    setWorkflowStatus
  ]);

  const bindEvents = useCallback(() => {
    const stopLogs = window.lazify.onLog((entry) => {
      setLogs((current) => [
        ...current,
        {
          key: `${entry.id}-${current.length}`,
          timestamp: entry.timestamp,
          stream: entry.stream,
          message: entry.message.trimEnd()
        }
      ]);
    });

    const stopProgress = window.lazify.onWorkflowProgress((event) => {
      setWorkflowStatus(event.status);
      setStatusMessage(event.message);
    });

    return () => {
      stopLogs();
      stopProgress();
    };
  }, [setLogs, setStatusMessage, setWorkflowStatus]);

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
      setStatusMessage("Choose an imported template before creating the project.");
      return;
    }

    setBusy(true);
    setWorkflowStatus("running");
    setStatusMessage("Starting project creation.");

    try {
      const result = await window.lazify.createProject({
        name: projectName.trim(),
        baseDirectory: projectDirectory.trim(),
        sourceMode: initSourceMode,
        templateId: initSourceMode === "stack" ? selectedTemplateId : null,
        importedTemplateId: initSourceMode === "imported" ? selectedImportedTemplateId : null,
        structureTree: savedStructureTree ?? []
      });

      setWorkflowStatus(result.success ? "success" : "error");
      setStatusMessage(result.message);
    } catch (error) {
      setWorkflowStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to create project.");
    } finally {
      setBusy(false);
    }
  }, [
    initSourceMode,
    projectDirectory,
    projectName,
    savedStructureTree,
    selectedImportedTemplateId,
    selectedTemplateId,
    setBusy,
    setStatusMessage,
    setWorkflowStatus
  ]);

  const installPackage = useCallback(async () => {
    if (!packageName.trim() || !projectDirectory.trim() || !projectName.trim()) {
      setWorkflowStatus("error");
      setStatusMessage("Enter a package name, project name, and workspace directory first.");
      return;
    }

    setBusy(true);
    setWorkflowStatus("running");
    setStatusMessage("Starting package installation.");

    try {
      const result = await window.lazify.installPackage({
        packageName: packageName.trim(),
        baseDirectory: projectDirectory.trim(),
        projectName: projectName.trim()
      });

      setWorkflowStatus(result.success ? "success" : "error");
      setStatusMessage(result.message);
    } catch (error) {
      setWorkflowStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to install package.");
    } finally {
      setBusy(false);
    }
  }, [
    packageName,
    projectDirectory,
    projectName,
    setBusy,
    setStatusMessage,
    setWorkflowStatus
  ]);

  const pickProjectDirectory = useCallback(async () => {
    try {
      const selectedPath = await window.lazify.selectDirectory();

      if (selectedPath) {
        persistProjectDirectory(selectedPath);
        setProjectDirectory(selectedPath);
        setWorkflowStatus("idle");
        setStatusMessage(`Project directory selected: ${selectedPath}`);
      }
    } catch (error) {
      setWorkflowStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to open the directory picker.");
    }
  }, [setProjectDirectory, setStatusMessage, setWorkflowStatus]);

  const continueInitWorkflow = useCallback(() => {
    if (initSourceMode === "stack" && !selectedTemplateId.trim()) {
      setWorkflowStatus("error");
      setStatusMessage("Choose a stack before continuing.");
      return false;
    }

    if (initSourceMode === "imported" && !selectedImportedTemplateId.trim()) {
      setWorkflowStatus("error");
      setStatusMessage("Choose an imported template before continuing.");
      return false;
    }

    if (!projectName.trim() || !projectDirectory.trim()) {
      setWorkflowStatus("error");
      setStatusMessage("Enter a project name and workspace directory before continuing.");
      return false;
    }

    setSavedInitWorkflowConfig({
      sourceMode: initSourceMode,
      templateId: initSourceMode === "stack" ? selectedTemplateId : null,
      importedTemplateId: initSourceMode === "imported" ? selectedImportedTemplateId : null,
      importedTemplateName: initSourceMode === "imported" ? selectedImportedTemplate?.name ?? null : null,
      projectName: projectName.trim(),
      projectDirectory: projectDirectory.trim(),
      packageNames: packageName
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    });
    setInitWorkflowStage("structure");
    setWorkflowStatus("success");
    setStatusMessage("Project setup saved. Continue with file structure configuration.");
    return true;
  }, [
    initSourceMode,
    packageName,
    projectDirectory,
    projectName,
    selectedImportedTemplate?.name,
    selectedImportedTemplateId,
    selectedTemplateId,
    setInitWorkflowStage,
    setSavedInitWorkflowConfig,
    setStatusMessage,
    setWorkflowStatus
  ]);

  const loadImportedTemplate = useCallback(async (templateId: string) => {
    if (!templateId) {
      setSelectedImportedTemplateId("");
      setSelectedImportedTemplate(null);
      resetInitFlow();
      return;
    }

    const detail = await window.lazify.getImportedTemplate(templateId);
    setSelectedImportedTemplateId(templateId);
    setSelectedImportedTemplate(detail);
    resetInitFlow();
  }, [resetInitFlow, setSelectedImportedTemplate, setSelectedImportedTemplateId]);

  const saveImportedTemplateChanges = useCallback(async (
    templateId: string,
    updates: { name?: string | null; tree?: ProjectTreeNode[] | null }
  ) => {
    const detail = await window.lazify.updateImportedTemplate(templateId, updates);
    await refreshImportedTemplates();
    setSelectedImportedTemplateId(detail.id);
    setSelectedImportedTemplate(detail);
    return detail;
  }, [
    refreshImportedTemplates,
    setSelectedImportedTemplate,
    setSelectedImportedTemplateId
  ]);

  const removeImportedTemplate = useCallback(async (templateId: string) => {
    await window.lazify.deleteImportedTemplate(templateId);
    await refreshImportedTemplates();
  }, [refreshImportedTemplates]);

  const syncWorkspaceProject = useCallback(async (projectPath?: string | null) => {
    const selectedPath = projectPath ?? (await window.lazify.selectDirectory());

    if (!selectedPath) {
      return null;
    }

    const isNewSync = projectPath == null;
    if (isNewSync && syncedWorkspaceProjects.some((p) => p.projectPath === selectedPath)) {
      throw new Error("This project is already synced to the workspace.");
    }

    const result = await window.lazify.importProjectIndexFromDirectory(selectedPath);
    const syncedProject: SyncedWorkspaceProject = {
      id: result.projectPath,
      projectName: result.projectName,
      projectPath: result.projectPath,
      stack: result.stackDetection.stack,
      framework: result.stackDetection.framework,
      metaFramework: result.stackDetection.metaFramework,
      packageManager: result.stackDetection.packageManager,
      confidence: result.stackDetection.confidence,
      lastSyncedAt: new Date().toISOString()
    };

    setSyncedWorkspaceProjects((current) => {
      const nextProjects = [
        syncedProject,
        ...current.filter((item) => item.projectPath !== syncedProject.projectPath)
      ];
      persistWorkspaceProjects(nextProjects);
      return nextProjects;
    });

    setWorkflowStatus("success");
    setStatusMessage(`Synced project "${syncedProject.projectName}" into Workspace.`);
    return syncedProject;
  }, [setStatusMessage, setSyncedWorkspaceProjects, setWorkflowStatus, syncedWorkspaceProjects]);

  const removeSyncedWorkspaceProject = useCallback((projectPath: string) => {
    setSyncedWorkspaceProjects((current) => {
      const nextProjects = current.filter((item) => item.projectPath !== projectPath);
      persistWorkspaceProjects(nextProjects);
      return nextProjects;
    });
  }, [setSyncedWorkspaceProjects]);

  return {
    busy,
    environment,
    importedTemplateOptions,
    initSourceMode,
    initWorkflowStage,
    logs,
    packageName,
    projectDirectory,
    projectName,
    savedInitWorkflowConfig,
    savedStructureTree,
    selectedImportedTemplate,
    selectedImportedTemplateId,
    selectedStructurePaths,
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
    setPackageName,
    setSavedStructureTree,
    setSelectedStructurePaths,
    setInitSourceMode: (value: "stack" | "imported") => {
      setInitSourceMode(value);
      resetInitFlow();
    },
    setSelectedTemplateId: (value: string) => {
      setSelectedTemplateId(value);
      resetInitFlow();
    },
    loadImportedTemplate,
    saveImportedTemplateChanges,
    removeImportedTemplate,
    syncWorkspaceProject,
    removeSyncedWorkspaceProject,
    setInitWorkflowStage,
    pickProjectDirectory,
    bootstrap,
    refreshToolScan,
    refreshSingleTool,
    refreshImportedTemplates,
    createProject,
    installPackage,
    continueInitWorkflow,
    bindEvents
  };
}
