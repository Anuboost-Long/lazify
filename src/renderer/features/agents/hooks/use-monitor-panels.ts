import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";

import { overflowScreens } from "@renderer/shared/terminal/terminal-pool";

import type { AgentDescriptor } from "../../../../main/agents/agent-registry";
import {
	loadWallLayout,
	pruneLayout,
	registerSession,
	saveWallLayout,
	type MonitorWallLayout,
} from "./monitor-session-registry";
import { planTidyUp } from "./tidy-monitor-wall";

export type MonitorPanelSize = "default" | "wide" | "large";

export const MONITOR_PANEL_SIZES: MonitorPanelSize[] = ["default", "wide", "large"];

export type MonitorColumns = "auto" | 1 | 2 | 3;

export const MONITOR_COLUMN_CHOICES: MonitorColumns[] = ["auto", 1, 2, 3];

export interface MonitorPanel {
	id: string;
	runId: string;
	projectPath: string;
	projectName: string;

	kind: "agent" | "script";

	sourceId: string;

	label: string;

	title?: string;

	displayName: string;

	exited: boolean;

	size: MonitorPanelSize;
}

const layoutAtom = atom<MonitorWallLayout>(loadWallLayout());
const panelsAtom = atom<MonitorPanel[]>([]);

function toPanel(
	session: { runId: string; scriptName: string; projectPath: string; projectName: string },
	agents: AgentDescriptor[],
	size: MonitorPanelSize,
	title: string | undefined,
): MonitorPanel {
	const agent = agents.find((candidate) => candidate.label === session.scriptName);

	return {
		id: session.runId,
		runId: session.runId,
		projectPath: session.projectPath,
		projectName: session.projectName,
		kind: agent ? "agent" : "script",
		sourceId: agent ? agent.id : session.scriptName,
		label: session.scriptName,
		title,
		displayName: title?.trim() || session.scriptName,

		exited: false,
		size,
	};
}

export function useMonitorPanels() {
	const [layout, setLayout] = useAtom(layoutAtom);
	const [panels, setPanels] = useAtom(panelsAtom);

	const panelsRef = useRef(panels);
	panelsRef.current = panels;

	const commitLayout = useCallback(
		(next: MonitorWallLayout) => {
			saveWallLayout(next);
			setLayout(next);
		},
		[setLayout],
	);

	const sync = useCallback(async () => {
		const [sessions, agents] = await Promise.all([
			globalThis.lazify.listSessions(),
			globalThis.lazify.listAgents(),
		]);

		const live = new Set(sessions.map((session) => session.runId));

		const pruned = pruneLayout(loadWallLayout(), live);

		const next = sessions
			.map((session) =>
				toPanel(
					session,
					agents,
					pruned.refs[session.runId]?.size ?? "default",
					pruned.refs[session.runId]?.title,
				),
			)

			.sort(
				(left, right) =>
					(pruned.refs[left.runId]?.order ?? Number.MAX_SAFE_INTEGER) -
					(pruned.refs[right.runId]?.order ?? Number.MAX_SAFE_INTEGER),
			);

		setPanels(next);
		commitLayout(pruned);
	}, [commitLayout, setPanels]);

	useEffect(() => {
		void sync();
	}, [sync]);

	const start = useCallback(
		async (input: {
			projectPath: string;
			kind: "agent" | "script";

			sourceId: string;
			resumeSessionId?: string;
		}) => {
			try {
				const { runId } =
					input.kind === "agent"
						? await globalThis.lazify.openAgentTerminal(
								input.sourceId,
								input.projectPath,
								undefined,
								undefined,
								input.resumeSessionId,
							)
						: await globalThis.lazify.runScript(input.projectPath, input.sourceId);

				setLayout(registerSession(runId));
				await sync();
				commitLayout({ ...loadWallLayout(), activeRunId: runId });
			} catch {
				await sync();
			}
		},
		[commitLayout, setLayout, sync],
	);

	const clear = useCallback(
		async (runId: string) => {
			await globalThis.lazify.stopScript(runId);

			setPanels((current) => current.filter((panel) => panel.runId !== runId));

			const next = loadWallLayout();
			delete next.refs[runId];
			commitLayout({
				...next,
				activeRunId: next.activeRunId === runId ? null : next.activeRunId,
			});
		},
		[commitLayout, setPanels],
	);

	const rename = useCallback(
		(runId: string, title: string) => {
			const trimmed = title.trim();

			setPanels((entries) =>
				entries.map((panel) =>
					panel.runId === runId
						? { ...panel, title: trimmed || undefined, displayName: trimmed || panel.label }
						: panel,
				),
			);

			const stored = loadWallLayout();
			commitLayout({
				...stored,
				refs: {
					...stored.refs,
					[runId]: {
						...stored.refs[runId],
						runId,
						size: stored.refs[runId]?.size ?? "default",
						order: stored.refs[runId]?.order ?? 0,
						title: trimmed || undefined,
					},
				},
			});
		},
		[commitLayout, setPanels],
	);

	const clearAll = useCallback(async () => {
		const running = panelsRef.current;

		setPanels([]);
		commitLayout({ ...loadWallLayout(), refs: {}, activeRunId: null });

		await Promise.all(
			running.map((panel) => globalThis.lazify.stopScript(panel.runId).catch(() => {})),
		);
	}, [commitLayout, setPanels]);

	const setSize = useCallback(
		(runId: string, size: MonitorPanelSize) => {
			setPanels((entries) =>
				entries.map((panel) => (panel.runId === runId ? { ...panel, size } : panel)),
			);

			const stored = loadWallLayout();
			commitLayout({
				...stored,
				refs: {
					...stored.refs,
					[runId]: { ...stored.refs[runId], runId, size, order: stored.refs[runId]?.order ?? 0 },
				},
			});
		},
		[commitLayout, setPanels],
	);

	const reorder = useCallback(
		(fromRunId: string, toRunId: string) => {
			if (fromRunId === toRunId) return;

			const from = panels.findIndex((panel) => panel.runId === fromRunId);
			const to = panels.findIndex((panel) => panel.runId === toRunId);
			if (from === -1 || to === -1) return;

			const next = [...panels];
			const [moved] = next.splice(from, 1);
			next.splice(to, 0, moved);
			setPanels(next);

			const stored = loadWallLayout();
			commitLayout({
				...stored,
				refs: Object.fromEntries(
					next.map((panel, index) => [
						panel.runId,
						{ ...stored.refs[panel.runId], runId: panel.runId, size: panel.size, order: index },
					]),
				),
			});
		},
		[commitLayout, panels, setPanels],
	);

	const tidyUp = useCallback(
		(waitingRunIds: string[]) => {
			const current = panelsRef.current;
			if (current.length === 0) return;

			const plan = planTidyUp({ panels: current, waitingRunIds, overflowScreens });

			const byRunId = new Map(current.map((panel) => [panel.runId, panel]));
			const next = plan.order.flatMap((runId) => {
				const panel = byRunId.get(runId);
				return panel ? [{ ...panel, size: plan.sizes[runId] ?? panel.size }] : [];
			});

			setPanels(next);

			const stored = loadWallLayout();
			commitLayout({
				...stored,
				refs: Object.fromEntries(
					next.map((panel, index) => [
						panel.runId,
						{ ...stored.refs[panel.runId], runId: panel.runId, size: panel.size, order: index },
					]),
				),
			});
		},
		[commitLayout, setPanels],
	);

	const setTarget = useCallback(
		(runId: string) => commitLayout({ ...loadWallLayout(), activeRunId: runId }),
		[commitLayout],
	);

	const setColumns = useCallback(
		(columns: MonitorColumns) => commitLayout({ ...loadWallLayout(), columns }),
		[commitLayout],
	);

	const setMonitorMode = useCallback(
		(monitorMode: boolean) => commitLayout({ ...loadWallLayout(), monitorMode }),
		[commitLayout],
	);

	useEffect(() => {
		return globalThis.lazify.onScriptStatus((event) => {
			if (event.status !== "done" && event.status !== "error") return;

			setPanels((current) =>
				current.map((panel) => (panel.runId === event.runId ? { ...panel, exited: true } : panel)),
			);
		});
	}, [setPanels]);

	useEffect(() => {
		return globalThis.lazify.onSessionKilled((event) => {
			setPanels((current) => current.filter((panel) => panel.runId !== event.runId));
		});
	}, [setPanels]);

	const target = panels.find((panel) => panel.runId === layout.activeRunId) ?? panels[0] ?? null;

	return {
		panels,
		sync,
		start,
		clear,
		clearAll,
		rename,
		setSize,
		reorder,
		tidyUp,
		target,
		setTarget,
		columns: layout.columns,
		setColumns,
		monitorMode: layout.monitorMode,
		setMonitorMode,
	};
}

export type MonitorPanels = ReturnType<typeof useMonitorPanels>;
