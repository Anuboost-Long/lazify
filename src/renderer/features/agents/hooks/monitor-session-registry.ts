import type { MonitorColumns, MonitorPanelSize } from "./use-monitor-panels";

const STORAGE_KEY = "lazify-monitor-wall";

export interface MonitorSessionRef {
	runId: string;
	size: MonitorPanelSize;

	order: number;

	title?: string;
}

export interface MonitorWallLayout {
	refs: Record<string, MonitorSessionRef>;
	columns: MonitorColumns;

	activeRunId: string | null;

	monitorMode: boolean;
}

const EMPTY: MonitorWallLayout = {
	refs: {},
	columns: "auto",
	activeRunId: null,
	monitorMode: false,
};

export function loadWallLayout(): MonitorWallLayout {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return EMPTY;

		const parsed = JSON.parse(raw) as Partial<MonitorWallLayout>;
		return {
			refs: parsed.refs && typeof parsed.refs === "object" ? parsed.refs : {},
			columns: parsed.columns ?? "auto",
			activeRunId: parsed.activeRunId ?? null,
			monitorMode: parsed.monitorMode ?? false,
		};
	} catch {
		return EMPTY;
	}
}

export function saveWallLayout(layout: MonitorWallLayout) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
	} catch {}
}

export function registerSession(runId: string): MonitorWallLayout {
	const layout = loadWallLayout();
	if (layout.refs[runId]) return layout;

	const highest = Object.values(layout.refs).reduce((max, ref) => Math.max(max, ref.order), -1);
	const next: MonitorWallLayout = {
		...layout,
		refs: {
			...layout.refs,
			[runId]: { runId, size: "default", order: highest + 1 },
		},
	};

	saveWallLayout(next);
	return next;
}

/**
 * Moves a panel's place on the wall to the session that replaced it.
 *
 * A restart is a new run id for the same panel, and everything the wall knows
 * about that panel — its size, its position, the name someone gave it — is
 * filed under the old one. Without this the panel comes back untitled, at
 * default size, at the end of the wall.
 */
export function renameSession(fromRunId: string, toRunId: string): MonitorWallLayout {
	const layout = loadWallLayout();
	const ref = layout.refs[fromRunId];

	if (!ref) return layout;

	const refs = { ...layout.refs, [toRunId]: { ...ref, runId: toRunId } };
	delete refs[fromRunId];

	const next: MonitorWallLayout = {
		...layout,
		refs,
		activeRunId: layout.activeRunId === fromRunId ? toRunId : layout.activeRunId,
	};

	saveWallLayout(next);
	return next;
}

export function pruneLayout(layout: MonitorWallLayout, liveRunIds: Set<string>): MonitorWallLayout {
	const refs = Object.fromEntries(
		Object.entries(layout.refs).filter(([runId]) => liveRunIds.has(runId)),
	);

	return {
		refs,
		columns: layout.columns,
		activeRunId: layout.activeRunId && liveRunIds.has(layout.activeRunId) ? layout.activeRunId : null,
		monitorMode: layout.monitorMode,
	};
}
