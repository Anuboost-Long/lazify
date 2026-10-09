import { desktop } from "@chain/sdk";

import { appDataPath, readTextFile, writeTextFile } from "./folders";

const STORE_FILE = "window-zoom.json";
const STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

export const DEFAULT_ZOOM = 1;
export const MIN_ZOOM = STEPS[0];
export const MAX_ZOOM = STEPS[STEPS.length - 1];

const listeners = new Set<(factor: number) => void>();

async function storePath() {
	return `${await appDataPath()}/${STORE_FILE}`;
}

function clamped(factor: number) {
	if (!Number.isFinite(factor)) return DEFAULT_ZOOM;

	return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(factor.toFixed(2))));
}

export async function readZoom(): Promise<number> {
	try {
		const stored = JSON.parse((await readTextFile(await storePath())) ?? "") as { factor?: number };

		return clamped(stored?.factor ?? DEFAULT_ZOOM);
	} catch {
		return DEFAULT_ZOOM;
	}
}

async function writeZoom(factor: number) {
	try {
		await writeTextFile(await storePath(), `${JSON.stringify({ factor }, null, 2)}\n`);
	} catch {
		return;
	}
}

export function nextZoom(factor: number, direction: 1 | -1): number {
	const current = clamped(factor);
	const ordered = direction === 1 ? STEPS : [...STEPS].reverse();
	const beyond = ordered.find((step) => (direction === 1 ? step > current + 0.001 : step < current - 0.001));

	return beyond ?? current;
}

export async function setZoom(factor: number): Promise<number> {
	const applied = clamped(factor);

	await writeZoom(applied);
	await desktop.pageZoom.set(applied);
	for (const listener of listeners) listener(applied);

	return applied;
}

export async function stepZoom(direction: 1 | -1): Promise<number> {
	return setZoom(nextZoom(await readZoom(), direction));
}

export function resetZoom(): Promise<number> {
	return setZoom(DEFAULT_ZOOM);
}

export async function applyStoredZoom(): Promise<void> {
	await desktop.pageZoom.set(await readZoom()).catch(() => undefined);
}

export function onZoomChanged(callback: (factor: number) => void): () => void {
	listeners.add(callback);

	return () => {
		listeners.delete(callback);
	};
}
