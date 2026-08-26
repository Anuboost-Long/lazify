import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

import {
	activeProjectPathAtom,
	busyAtom,
	commandChoicePromptAtom,
	createOptionValuesAtom,
	environmentAtom,
	importedTemplateOptionsAtom,
	initSourceModeAtom,
	logsAtom,
	packageNameAtom,
	projectDirectoryAtom,
	projectNameAtom,
	selectedTemplateIdAtom,
	starterFailureReasonAtom,
	statusMessageAtom,
	templateOptionsAtom,
	toolScanLoadingAtom,
	toolScanReportAtom,
	workflowStatusAtom,
} from "./lazify-store/atoms";
import { persistActiveProjectPath, persistProjectDirectory } from "./lazify-store/storage";
import { useImportedTemplates } from "./lazify-store/use-imported-templates";
import { useToolScan } from "./lazify-store/use-tool-scan";
import { useWorkspaceProjects } from "./lazify-store/use-workspace-projects";

export function useLazifyStore() {
	const [projectName, setProjectName] = useAtom(projectNameAtom);
	const [projectDirectory, setProjectDirectory] = useAtom(projectDirectoryAtom);
	const [activeProjectPath, setActiveProjectPathAtom] = useAtom(activeProjectPathAtom);
	const [packageName, setPackageName] = useAtom(packageNameAtom);
	const [initSourceMode, setInitSourceMode] = useAtom(initSourceModeAtom);
	const [selectedTemplateId, setSelectedTemplateId] = useAtom(selectedTemplateIdAtom);
	const [createOptionValues, setCreateOptionValues] = useAtom(createOptionValuesAtom);
	const logs = useAtomValue(logsAtom);
	const [commandChoicePrompt, setCommandChoicePrompt] = useAtom(commandChoicePromptAtom);
	const busy = useAtomValue(busyAtom);
	const workflowStatus = useAtomValue(workflowStatusAtom);
	const statusMessage = useAtomValue(statusMessageAtom);
	const [starterFailureReason, setStarterFailureReason] = useAtom(starterFailureReasonAtom);
	const environment = useAtomValue(environmentAtom);
	const templateOptions = useAtomValue(templateOptionsAtom);
	const importedTemplateOptions = useAtomValue(importedTemplateOptionsAtom);
	const toolScanReport = useAtomValue(toolScanReportAtom);
	const toolScanLoading = useAtomValue(toolScanLoadingAtom);
	const setLogs = useSetAtom(logsAtom);
	const setBusy = useSetAtom(busyAtom);
	const setWorkflowStatus = useSetAtom(workflowStatusAtom);
	const setStatusMessage = useSetAtom(statusMessageAtom);
	const setEnvironment = useSetAtom(environmentAtom);
	const setTemplateOptions = useSetAtom(templateOptionsAtom);

	const { refreshToolScan, refreshSingleTool } = useToolScan();
	const {
		selectedImportedTemplate,
		selectedImportedTemplateId,
		refreshImportedTemplates,
		loadImportedTemplate,
		saveImportedTemplateChanges,
		removeImportedTemplate,
	} = useImportedTemplates();
	const {
		syncedWorkspaceProjects,
		syncWorkspaceProject,
		removeSyncedWorkspaceProject,
		reorderSyncedWorkspaceProjects,
		updateProjectNodeVersion,
	} = useWorkspaceProjects();

	const setActiveProjectPath = useCallback(
		(value: string) => {
			persistActiveProjectPath(value);
			setActiveProjectPathAtom(value);
		},
		[setActiveProjectPathAtom],
	);

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
			env.issues.length === 0 ? "Environment checks passed. Lazify is ready." : env.issues.join(" "),
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

		const stopCommandChoicePrompts = globalThis.lazify.onCommandChoicePrompt((prompt) => {
			setCommandChoicePrompt(prompt);
		});

		return () => {
			stopLogs();
			stopProgress();
			stopCommandChoicePrompts();
		};
	}, [setCommandChoicePrompt, setLogs, setStatusMessage, setWorkflowStatus]);

	const chooseCommandOption = useCallback(
		async (promptId: string, optionId: string) => {
			const accepted = await globalThis.lazify.chooseCommandOption(promptId, optionId);
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
			setStatusMessage("Choose an imported template before creating the project.");
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
				importedTemplateId: initSourceMode === "imported" ? selectedImportedTemplateId : null,
				structureTree: [],
				createOptions: initSourceMode === "stack" ? createOptionValues : undefined,
			});

			setWorkflowStatus(result.success ? "success" : "error");
			setStatusMessage(result.message);
			setStarterFailureReason(result.reason ?? null);
		} catch (error) {
			setWorkflowStatus("error");
			setStatusMessage(error instanceof Error ? error.message : "Unable to create project.");
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
		if (!packageName.trim() || !projectDirectory.trim() || !projectName.trim()) {
			setWorkflowStatus("error");
			setStatusMessage("Enter a package name, project name, and workspace directory first.");
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
			setStatusMessage(error instanceof Error ? error.message : "Unable to install package.");
		} finally {
			setBusy(false);
		}
	}, [packageName, projectDirectory, projectName, setBusy, setStatusMessage, setWorkflowStatus]);

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
				error instanceof Error ? error.message : "Unable to open the directory picker.",
			);
		}
	}, [setProjectDirectory, setStatusMessage, setWorkflowStatus]);

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
