import { useCallback, useEffect, useState } from "react";

import type { FlowSummary } from "@main/diagnostic-tests/service";
import type { DiagnosticConfig } from "@main/diagnostic-tests/types";

import { beginLiveRun, reduceRunEvent, type LiveRun } from "../lib/live-run";
import { isRunSettled } from "../lib/run-verdict";
import { useDiagnosticFlows } from "./use-diagnostic-flows";
import { useDiagnosticRuns } from "./use-diagnostic-runs";
import { useFlowRecorder } from "./use-flow-recorder";

export function useDiagnosticsWorkspace(projectPath: string) {
	const { flows, loading, reload: reloadFlows, addExampleFlow } = useDiagnosticFlows(projectPath);
	const { runs, openRun, reload: reloadRuns, open, close } = useDiagnosticRuns(projectPath);
	const recorder = useFlowRecorder(projectPath);
	const [selectedFlowFile, setSelectedFlowFile] = useState("");
	const [live, setLive] = useState<LiveRun | null>(null);
	const [exportedTo, setExportedTo] = useState("");
	const [config, setConfig] = useState<DiagnosticConfig | null>(null);

	const selectedFlow: FlowSummary | null =
		flows.find((flow) => flow.fileName === selectedFlowFile) ?? null;
	const busy = Boolean(live && !isRunSettled(live.state));

	useEffect(
		() =>
			globalThis.lazify.onDiagnosticRunEvent((event) =>
				setLive((current) => reduceRunEvent(current, event)),
			),
		[],
	);

	useEffect(() => {
		setSelectedFlowFile("");
		setLive(null);
		setExportedTo("");

		if (!projectPath) {
			setConfig(null);
			return;
		}

		void globalThis.lazify.readDiagnosticConfig(projectPath).then(setConfig);
	}, [projectPath]);

	const selectFlow = useCallback(
		(fileName: string) => {
			setSelectedFlowFile(fileName);
			setLive(null);
			setExportedTo("");
			close();
		},
		[close],
	);

	const selectRun = useCallback(
		async (runId: string) => {
			setLive(null);
			setSelectedFlowFile("");
			setExportedTo("");
			await open(runId);
		},
		[open],
	);

	const runFlow = useCallback(
		async (fileName: string) => {
			setSelectedFlowFile(fileName);
			setExportedTo("");
			close();
			setLive(beginLiveRun(fileName));

			try {
				await globalThis.lazify.startDiagnosticRun(projectPath, fileName);
			} finally {
				await reloadRuns();
			}
		},
		[close, projectPath, reloadRuns],
	);

	const cancelRun = useCallback(async () => {
		if (live?.runId) await globalThis.lazify.cancelDiagnosticRun(live.runId);
	}, [live?.runId]);

	const exportReport = useCallback(async (runId: string) => {
		setExportedTo((await globalThis.lazify.exportDiagnosticReport(runId)) ?? "");
	}, []);

	const deleteRun = useCallback(
		async (runId: string) => {
			await globalThis.lazify.deleteDiagnosticRun(runId);
			if (openRun?.id === runId) close();
			await reloadRuns();
		},
		[close, openRun?.id, reloadRuns],
	);

	const clearRuns = useCallback(async () => {
		await globalThis.lazify.clearDiagnosticRuns(projectPath);
		close();
		setLive(null);
		await reloadRuns();
	}, [close, projectPath, reloadRuns]);

	const deleteFlow = useCallback(
		async (fileName: string) => {
			await globalThis.lazify.deleteDiagnosticFlow(projectPath, fileName);
			if (selectedFlowFile === fileName) setSelectedFlowFile("");
			await reloadFlows();
		},
		[projectPath, reloadFlows, selectedFlowFile],
	);

	const saveConfig = useCallback(
		async (next: DiagnosticConfig) => {
			setConfig(await globalThis.lazify.saveDiagnosticConfig(projectPath, next));
			await reloadFlows();
		},
		[projectPath, reloadFlows],
	);

	const startRecording = useCallback(async () => {
		setLive(null);
		close();
		await recorder.start(config?.baseUrl ?? "");
	}, [close, config?.baseUrl, recorder]);

	const saveRecording = useCallback(async () => {
		const saved = await recorder.save();
		if (!saved) return;

		await reloadFlows();
		setSelectedFlowFile(saved.filePath.split("/").pop() ?? "");
	}, [recorder, reloadFlows]);

	return {
		flows,
		loading,
		runs,
		config,
		selectedFlow,
		selectedFlowFile,
		openRun,
		live,
		busy,
		exportedTo,
		recording: recorder.recording,
		reloadFlows,
		addExampleFlow,
		selectFlow,
		selectRun,
		runFlow,
		cancelRun,
		exportReport,
		deleteRun,
		clearRuns,
		deleteFlow,
		saveConfig,
		startRecording,
		stopRecording: recorder.stop,
		renameRecording: recorder.rename,
		discardRecording: recorder.discard,
		saveRecording,
	};
}
