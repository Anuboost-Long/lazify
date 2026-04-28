import { useCallback, useState } from "react";
import type {
  EnvironmentSummary,
  LogEntry,
  TemplateOption,
  WorkflowStatus,
} from "@renderer/shared/types/lazify";

export function useLazifyStore() {
  const [projectName, setProjectName] = useState("lazify-starter");
  const [projectDirectory, setProjectDirectory] = useState("");
  const [packageName, setPackageName] = useState("react-native-reanimated");
  const [selectedTemplateId, setSelectedTemplateId] = useState("expo-default");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Checking local runtime prerequisites.");
  const [environment, setEnvironment] = useState<EnvironmentSummary | null>(null);
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([
    {
      id: "expo-default",
      label: "Expo Starter",
      description: "Default Expo template."
    }
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
      setSelectedTemplateId(templates[0].id);
    }
  }, []);

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
  }, []);

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
        templateId: selectedTemplateId
      });

      setWorkflowStatus(result.success ? "success" : "error");
      setStatusMessage(result.message);
    } catch (error) {
      setWorkflowStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to create project.");
    } finally {
      setBusy(false);
    }
  }, [projectDirectory, projectName, selectedTemplateId]);

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
  }, [packageName, projectDirectory, projectName]);

  const pickProjectDirectory = useCallback(async () => {
    try {
      const selectedPath = await window.lazify.selectDirectory();

      if (selectedPath) {
        setProjectDirectory(selectedPath);
        setWorkflowStatus("idle");
        setStatusMessage(`Project directory selected: ${selectedPath}`);
      }
    } catch (error) {
      setWorkflowStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to open the directory picker.");
    }
  }, []);

  return {
    busy,
    environment,
    logs,
    packageName,
    projectDirectory,
    projectName,
    selectedTemplateId,
    statusMessage,
    templateOptions,
    workflowStatus,
    setProjectName,
    setProjectDirectory,
    setPackageName,
    setSelectedTemplateId,
    pickProjectDirectory,
    bootstrap,
    createProject,
    installPackage,
    bindEvents
  };
}
