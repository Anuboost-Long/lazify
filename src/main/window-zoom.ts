import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";

const STORE_FILE = "window-zoom.json";
const STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

export const DEFAULT_ZOOM = 1;
export const MIN_ZOOM = STEPS[0];
export const MAX_ZOOM = STEPS[STEPS.length - 1];

function storePath() {
  return path.join(app.getPath("userData"), STORE_FILE);
}

function clamped(factor: number) {
  if (!Number.isFinite(factor)) return DEFAULT_ZOOM;

  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(factor.toFixed(2))));
}

export function readZoom(): number {
  try {
    const stored = JSON.parse(fs.readFileSync(storePath(), "utf8")) as { factor?: number };

    return clamped(stored?.factor ?? DEFAULT_ZOOM);
  } catch {
    return DEFAULT_ZOOM;
  }
}

function writeZoom(factor: number) {
  try {
    fs.mkdirSync(path.dirname(storePath()), { recursive: true });
    fs.writeFileSync(storePath(), `${JSON.stringify({ factor }, null, 2)}\n`, "utf8");
  } catch {
    return;
  }
}

export function nextZoom(factor: number, direction: 1 | -1): number {
  const current = clamped(factor);
  const ordered = direction === 1 ? STEPS : [...STEPS].reverse();
  const beyond = ordered.find((step) =>
    direction === 1 ? step > current + 0.001 : step < current - 0.001
  );

  return beyond ?? current;
}

export function applyZoom(window: BrowserWindow | null, factor: number): number {
  const applied = clamped(factor);

  writeZoom(applied);

  if (window && !window.isDestroyed()) {
    window.webContents.setZoomFactor(applied);
    window.webContents.send("lazify:zoom-changed", applied);
  }

  return applied;
}

export function stepZoom(window: BrowserWindow | null, direction: 1 | -1): number {
  return applyZoom(window, nextZoom(readZoom(), direction));
}

export function resetZoom(window: BrowserWindow | null): number {
  return applyZoom(window, DEFAULT_ZOOM);
}

export function holdZoomSteady(window: BrowserWindow) {
  void window.webContents.setVisualZoomLevelLimits(1, 1);
  window.webContents.setZoomFactor(readZoom());
}
