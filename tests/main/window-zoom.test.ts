import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-zoom-"));

vi.mock("electron", () => ({ app: { getPath: () => userDataPath } }));

const { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, applyZoom, nextZoom, readZoom, resetZoom, stepZoom } =
  await import("../../src/main/window-zoom");

function storeFile() {
  return path.join(userDataPath, "window-zoom.json");
}

function stubWindow() {
  const sent: unknown[] = [];
  const factors: number[] = [];

  return {
    sent,
    factors,
    isDestroyed: () => false,
    webContents: {
      setZoomFactor: (factor: number) => factors.push(factor),
      send: (_channel: string, payload: unknown) => sent.push(payload)
    }
  };
}

beforeEach(() => {
  fs.rmSync(storeFile(), { force: true });
});

describe("how far the app is zoomed", () => {
  it("starts at its normal size", () => {
    expect(readZoom()).toBe(DEFAULT_ZOOM);
  });

  it("remembers what it was put at", () => {
    const window = stubWindow();

    applyZoom(window as never, 1.25);

    expect(readZoom()).toBe(1.25);
    expect(window.factors).toEqual([1.25]);
    expect(window.sent).toEqual([1.25]);
  });

  it("goes back to normal however far it was taken", () => {
    const window = stubWindow();

    applyZoom(window as never, MAX_ZOOM);

    expect(resetZoom(window as never)).toBe(1);
    expect(readZoom()).toBe(1);
  });

  it("stops at the ends rather than running past them", () => {
    expect(nextZoom(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
    expect(nextZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
    expect(applyZoom(null, 12)).toBe(MAX_ZOOM);
    expect(applyZoom(null, 0.01)).toBe(MIN_ZOOM);
  });

  it("steps to the next size in each direction", () => {
    const window = stubWindow();

    expect(stepZoom(window as never, 1)).toBe(1.1);
    expect(stepZoom(window as never, 1)).toBe(1.25);
    expect(stepZoom(window as never, -1)).toBe(1.1);
  });

  it("comes back to normal when what was stored makes no sense", () => {
    fs.writeFileSync(storeFile(), '{"factor":"huge"}');

    expect(readZoom()).toBe(DEFAULT_ZOOM);
  });

  it("keeps working for a window that has gone", () => {
    expect(applyZoom(null, 1.5)).toBe(1.5);
    expect(readZoom()).toBe(1.5);
  });
});
