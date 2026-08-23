import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-doc-watch-"));
const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-watch-project-"));

vi.mock("electron", () => ({ app: { getPath: () => userDataPath }, BrowserWindow: class {} }));

const { saveCustomCollections } = await import("../../../src/main/api-studio/custom-collections");
const { watchDocDraft } = await import("../../../src/main/api-studio/docs/draft-watch");
const { briefFiles } = await import("../../../src/main/api-studio/docs/brief");

type CustomCollection = import("../../../src/main/api-studio/custom-collections").CustomCollection;

const collection = {
  id: "collection-1",
  name: "Public API",
  folders: [],
  requests: []
} as CustomCollection;

async function eventually(ready: () => boolean, within = 8000) {
  const deadline = Date.now() + within;

  while (Date.now() < deadline) {
    if (ready()) return;

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error(`the watcher reported nothing within ${within}ms`);
}

describe("watching for an agent's answers", () => {
  it("reports the draft file being written", async () => {
    saveCustomCollections(projectPath, [collection]);

    let changes = 0;
    const stop = watchDocDraft(projectPath, "collection-1", () => {
      changes += 1;
    });

    expect(stop).toBeTruthy();

    fs.writeFileSync(
      briefFiles(projectPath, collection).answerPath,
      JSON.stringify({ collection: { overview: "Written by an agent." } })
    );

    await eventually(() => changes > 0);

    expect(changes).toBeGreaterThan(0);

    stop?.();
  });
});
