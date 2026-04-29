import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import type {
  EnvironmentSummary,
  LogEntry,
  ProjectTreeNode,
  SavedInitWorkflowConfig,
  TemplateOption,
  WorkflowStatus,
} from "@renderer/shared/types/lazify";

const PROJECT_DIRECTORY_STORAGE_KEY = "lazify-project-directory";

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

const projectNameAtom = atom("lazify-starter");
const projectDirectoryAtom = atom(readStoredProjectDirectory());
const packageNameAtom = atom("");
const selectedTemplateIdAtom = atom("");
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

export function useLazifyStore() {
  const [projectName, setProjectName] = useAtom(projectNameAtom);
  const [projectDirectory, setProjectDirectory] = useAtom(projectDirectoryAtom);
  const [packageName, setPackageName] = useAtom(packageNameAtom);
  const [selectedTemplateId, setSelectedTemplateId] = useAtom(selectedTemplateIdAtom);
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
  const setLogs = useSetAtom(logsAtom);
  const setBusy = useSetAtom(busyAtom);
  const setWorkflowStatus = useSetAtom(workflowStatusAtom);
  const setStatusMessage = useSetAtom(statusMessageAtom);
  const setEnvironment = useSetAtom(environmentAtom);
  const setTemplateOptions = useSetAtom(templateOptionsAtom);

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
  }, [setEnvironment, setStatusMessage, setTemplateOptions, setWorkflowStatus]);

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

    setBusy(true);
    setWorkflowStatus("running");
    setStatusMessage("Starting project creation.");

    try {
      const result = await window.lazify.createProject({
        name: projectName.trim(),
        baseDirectory: projectDirectory.trim(),
        templateId: selectedTemplateId,
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
    projectDirectory,
    projectName,
    savedStructureTree,
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
    if (!selectedTemplateId.trim()) {
      setWorkflowStatus("error");
      setStatusMessage("Choose a stack before continuing.");
      return false;
    }

    if (!projectName.trim() || !projectDirectory.trim()) {
      setWorkflowStatus("error");
      setStatusMessage("Enter a project name and workspace directory before continuing.");
      return false;
    }

    setSavedInitWorkflowConfig({
      templateId: selectedTemplateId,
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
    packageName,
    projectDirectory,
    projectName,
    selectedTemplateId,
    setInitWorkflowStage,
    setSavedInitWorkflowConfig,
    setStatusMessage,
    setWorkflowStatus
  ]);

  return {
    busy,
    environment,
    initWorkflowStage,
    logs,
    packageName,
    projectDirectory,
    projectName,
    savedInitWorkflowConfig,
    savedStructureTree,
    selectedStructurePaths,
    selectedTemplateId,
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
    setSelectedTemplateId: (value: string) => {
      setSelectedTemplateId(value);
      setInitWorkflowStage("configure");
      setSavedInitWorkflowConfig(null);
      setSavedStructureTree(null);
    },
    setInitWorkflowStage,
    pickProjectDirectory,
    bootstrap,
    createProject,
    installPackage,
    continueInitWorkflow,
    bindEvents
  };
}
