import fs from "node:fs";
import path from "node:path";

import { readCustomCollections } from "../custom-collections";
import { briefFiles } from "./brief";

const SETTLE_MS = 600;

export function watchDocDraft(
  projectPath: string,
  collectionId: string,
  onChange: () => void
): (() => void) | null {
  const collection = readCustomCollections(projectPath).find((one) => one.id === collectionId);

  if (!collection) return null;

  const files = briefFiles(projectPath, collection);
  const answer = path.basename(files.answerPath);

  fs.mkdirSync(files.directory, { recursive: true });

  let settle: ReturnType<typeof setTimeout> | null = null;
  let watcher: fs.FSWatcher;

  try {
    watcher = fs.watch(files.directory, (_event, name) => {
      if (name && name !== answer) return;
      if (settle) clearTimeout(settle);

      settle = setTimeout(onChange, SETTLE_MS);
    });
  } catch {
    return null;
  }

  return () => {
    if (settle) clearTimeout(settle);

    watcher.close();
  };
}
