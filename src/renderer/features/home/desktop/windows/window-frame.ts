export type FixedWindowId = "tasks" | "projects" | "customize";

export type DesktopWindowId = FixedWindowId | `agent:${string}`;

export function agentWindowId(runId: string): DesktopWindowId {
	return `agent:${runId}`;
}

export function agentRunId(id: DesktopWindowId): string | null {
	return id.startsWith("agent:") ? id.slice("agent:".length) : null;
}

export interface WindowFrame {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface DesktopBounds {
	width: number;
	height: number;
}

export const MIN_WIDTH = 320;
export const MIN_HEIGHT = 220;

/** The strip windows never sit under: reserved whether or not the dock shows. */
export const DOCK_HEIGHT = 76;

/** Enough of the title bar stays reachable that a window cannot be lost. */
const KEEP_VISIBLE = 140;
const TITLE_BAR_HEIGHT = 38;

const DEFAULTS: Record<FixedWindowId, { width: number; height: number; offset: number }> = {
	tasks: { width: 760, height: 520, offset: 0 },
	projects: { width: 400, height: 480, offset: 1 },
	customize: { width: 420, height: 460, offset: 2 },
};

const AGENT_WINDOW = { width: 620, height: 460 };

export function defaultFrame(
	id: DesktopWindowId,
	bounds: DesktopBounds,
	alreadyOpen = 0,
): WindowFrame {
	const preset = agentRunId(id)
		? { ...AGENT_WINDOW, offset: alreadyOpen }
		: DEFAULTS[id as FixedWindowId];

	const width = Math.min(preset.width, Math.max(MIN_WIDTH, bounds.width - 48));
	const height = Math.min(preset.height, Math.max(MIN_HEIGHT, bounds.height - 48));
	const cascade = preset.offset * 36;

	return clampFrame(
		{
			x: Math.max(24, (bounds.width - width) / 2 - 120) + cascade,
			y: Math.max(24, (bounds.height - height) / 2 - 40) + cascade,
			width,
			height,
		},
		bounds,
	);
}

export function clampFrame(frame: WindowFrame, bounds: DesktopBounds): WindowFrame {
	const width = Math.max(MIN_WIDTH, Math.min(frame.width, bounds.width));
	const height = Math.max(MIN_HEIGHT, Math.min(frame.height, bounds.height));

	return {
		width,
		height,
		x: Math.min(Math.max(frame.x, KEEP_VISIBLE - width), bounds.width - KEEP_VISIBLE),
		y: Math.min(Math.max(frame.y, 0), Math.max(0, bounds.height - TITLE_BAR_HEIGHT)),
	};
}
