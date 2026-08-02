import type {
  EnvironmentSummary,
  ImportedProjectIndexNode,
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
import type { StarterFailureReason } from "@main/starter-provisioner";
import { collectRemovedPaths } from "@renderer/features/init/lib/prepared-project-tree";
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

  const rawValue = globalThis.localStorage.getItem(WORKSPACE_PROJECTS_STORAGE_KEY);

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
const initWorkflowStageAtom = atom<"configure" | "structure">("configure");
const savedInitWorkflowConfigAtom = atom<SavedInitWorkflowConfig | null>(null);
const savedStructureTreeAtom = atom<ProjectTreeNode[] | null>(null);
/**
 * A stack project whose tree is on disk but which is not installed yet. Holding
 * the index tree as well as the path is what lets the create step work out what
 * the user removed.
 */
const preparedProjectAtom = atom<{
  projectPath: string;
  indexTree: ImportedProjectIndexNode[];
  optionalFolders: { path: string; label: string }[];
  required: string[];
} | null>(null);
const selectedStructurePathsAtom = atom<string[]>([
  "app",
  "components",
  "lib",
  "hooks",
]);
const logsAtom = atom<LogEntry[]>([]);
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
  const [activeProjectPath, setActiveProjectPathAtom] =
    useAtom(activeProjectPathAtom);
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
  const [initWorkflowStage, setInitWorkflowStage] = useAtom(
    initWorkflowStageAtom,
  );
  const [savedInitWorkflowConfig, setSavedInitWorkflowConfig] = useAtom(
    savedInitWorkflowConfigAtom,
  );
  const [preparedProject, setPreparedProject] = useAtom(preparedProjectAtom);
  const [savedStructureTree, setSavedStructureTree] = useAtom(
    savedStructureTreeAtom,
  );
  const [selectedStructurePaths, setSelectedStructurePaths] = useAtom(
    selectedStructurePathsAtom,
  );
  const logs = useAtomValue(logsAtom);
  const busy = useAtomValue(busyAtom);
  const workflowStatus = useAtomValue(workflowStatusAtom);
  const statusMessage = useAtomValue(statusMessageAtom);
  const [starterFailureReason, setStarterFailureReason] = useAtom(starterFailureReasonAtom);
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
    setPreparedProject(null);
  }, [
    setInitWorkflowStage,
    setPreparedProject,
    setSavedInitWorkflowConfig,
    setSavedStructureTree,
  ]);

  /**
   * Going back from the structure step. The tree is already on disk by then, so
   * it has to be cleaned up — main only deletes a directory Lazify created, and
   * leaves a folder that was already there untouched.
   */
  const discardPreparedProject = useCallback(async () => {
    if (preparedProject) {
      await globalThis.lazify.discardPreparedProject(preparedProject.projectPath);
    }
    resetInitFlow();
  }, [preparedProject, resetInitFlow]);

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
      setStatusMessage(
        "Choose an imported template before creating the project.",
      );
      return;
    }

    setBusy(true);
    setWorkflowStatus("running");
    setStatusMessage("Starting project creation.");
    // Cleared up front so a previous failure's notice cannot outlive its run.
    setStarterFailureReason(null);

    try {
      // A stack project already exists on disk by now, so this finishes it:
      // apply what the user changed in the picker, install, initialize a repo.
      const result = preparedProject
        ? await globalThis.lazify.finalizeProject({
            projectPath: preparedProject.projectPath,
            removePaths: collectRemovedPaths(
              preparedProject.indexTree,
              savedStructureTree ?? [],
            ),
            optionalFolderPaths: selectedStructurePaths.filter((candidate) =>
              preparedProject.optionalFolders.some(
                (folder) => folder.path === candidate,
              ),
            ),
          })
        : await globalThis.lazify.createProject({
            name: projectName.trim(),
            baseDirectory: projectDirectory.trim(),
            sourceMode: initSourceMode,
            templateId: initSourceMode === "stack" ? selectedTemplateId : null,
            importedTemplateId:
              initSourceMode === "imported" ? selectedImportedTemplateId : null,
            structureTree: savedStructureTree ?? [],
            createOptions:
              initSourceMode === "stack" ? createOptionValues : undefined,
          });

      setWorkflowStatus(result.success ? "success" : "error");
      setStatusMessage(result.message);
      setStarterFailureReason(result.reason ?? null);

      // Finished, so it is no longer a project waiting to be backed out of.
      if (result.success) {
        setPreparedProject(null);
      }
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
    preparedProject,
    projectDirectory,
    projectName,
    savedStructureTree,
    selectedImportedTemplateId,
    selectedStructurePaths,
    selectedTemplateId,
    setBusy,
    setPreparedProject,
    setStarterFailureReason,
    setStatusMessage,
    setWorkflowStatus,
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

  /**
   * `onPrepareStart` fires only once the input has passed validation and the
   * project is about to be produced, so the caller can send the user somewhere
   * that shows progress without having to re-check the form itself.
   */
  const continueInitWorkflow = useCallback(async (onPrepareStart?: () => void) => {
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
      setStatusMessage(
        "Enter a project name and workspace directory before continuing.",
      );
      return false;
    }

    setSavedInitWorkflowConfig({
      sourceMode: initSourceMode,
      templateId: initSourceMode === "stack" ? selectedTemplateId : null,
      importedTemplateId:
        initSourceMode === "imported" ? selectedImportedTemplateId : null,
      importedTemplateName:
        initSourceMode === "imported"
          ? (selectedImportedTemplate?.name ?? null)
          : null,
      projectName: projectName.trim(),
      projectDirectory: projectDirectory.trim(),
      packageNames: packageName
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    // An imported template already carries its own tree, so there is nothing to
    // produce first. A stack project's tree has to exist on disk before it can
    // be browsed — that is the whole point of reading it rather than inventing it.
    if (initSourceMode === "stack") {
      setBusy(true);
      setWorkflowStatus("running");
      setStatusMessage("Preparing the project files.");
      setStarterFailureReason(null);
      // Cloning or scaffolding takes seconds with nothing to show on the setup
      // step, which reads as the button having done nothing.
      onPrepareStart?.();

      try {
        const prepared = await globalThis.lazify.prepareProject({
          name: projectName.trim(),
          baseDirectory: projectDirectory.trim(),
          sourceMode: "stack",
          templateId: selectedTemplateId,
          importedTemplateId: null,
          structureTree: [],
          createOptions: createOptionValues,
        });

        if (!prepared.success || !prepared.projectPath) {
          setWorkflowStatus("error");
          setStatusMessage(prepared.message);
          setStarterFailureReason(prepared.reason ?? null);
          return false;
        }

        const index = await globalThis.lazify.importProjectIndexFromDirectory(
          prepared.projectPath,
        );

        setPreparedProject({
          projectPath: prepared.projectPath,
          indexTree: index.tree,
          optionalFolders: prepared.optionalFolders ?? [],
          required: prepared.required ?? [],
        });
      } catch (error) {
        setWorkflowStatus("error");
        setStatusMessage(
          error instanceof Error ? error.message : "Unable to prepare the project.",
        );
        return false;
      } finally {
        setBusy(false);
      }
    }

    setInitWorkflowStage("structure");
    setWorkflowStatus("success");
    setStatusMessage(
      "Project files are ready. Review the structure before installing.",
    );
    return true;
  }, [
    createOptionValues,
    initSourceMode,
    packageName,
    projectDirectory,
    projectName,
    selectedImportedTemplate?.name,
    selectedImportedTemplateId,
    selectedTemplateId,
    setBusy,
    setInitWorkflowStage,
    setPreparedProject,
    setSavedInitWorkflowConfig,
    setStarterFailureReason,
    setStatusMessage,
    setWorkflowStatus,
  ]);

  const loadImportedTemplate = useCallback(
    async (templateId: string) => {
      if (!templateId) {
        setSelectedImportedTemplateId("");
        setSelectedImportedTemplate(null);
        resetInitFlow();
        return;
      }

      const detail = await globalThis.lazify.getImportedTemplate(templateId);
      setSelectedImportedTemplateId(templateId);
      setSelectedImportedTemplate(detail);
      resetInitFlow();
    },
    [resetInitFlow, setSelectedImportedTemplate, setSelectedImportedTemplateId],
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
      const selectedPath =
        projectPath ?? (await globalThis.lazify.selectDirectory());

      if (!selectedPath) {
        return null;
      }

      const isNewSync = projectPath == null;
      if (
        isNewSync &&
        syncedWorkspaceProjects.some((p) => p.projectPath === selectedPath)
      ) {
        throw new Error("This project is already synced to the workspace.");
      }

      const result =
        await globalThis.lazify.importProjectIndexFromDirectory(selectedPath);
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

      setWorkflowStatus("success");
      setStatusMessage(
        `Synced project "${syncedProject.projectName}" into Workspace.`,
      );
      return syncedProject;
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
    initWorkflowStage,
    logs,
    packageName,
    projectDirectory,
    activeProjectPath,
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
    setActiveProjectPath,
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
    reorderSyncedWorkspaceProjects,
    updateProjectNodeVersion,
    setInitWorkflowStage,
    pickProjectDirectory,
    bootstrap,
    refreshToolScan,
    refreshSingleTool,
    refreshImportedTemplates,
    createProject,
    preparedProject,
    discardPreparedProject,
    starterFailureReason,
    installPackage,
    continueInitWorkflow,
    bindEvents,
    createOptionValues,
    setCreateOptionValues,
  };
}
