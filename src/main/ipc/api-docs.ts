import { dialog, ipcMain, shell } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

import {
  collectionDocBrief,
  collectionDocQuestions,
  exportCollectionDoc,
  importCollectionDocDraft,
  readCollectionDoc,
  renderCollectionDoc,
  saveCollectionDoc,
  writeCollectionDocBrief,
  writeDocPreviewFile
} from "../api-studio/docs";
import type { CollectionDoc, DocFormat } from "../api-studio/docs";
import { watchDocDraft } from "../api-studio/docs/draft-watch";
import type { IpcContext } from "./context";

const LOGO_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp"
};
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const FORMAT_FILTERS: Record<DocFormat, { name: string; extensions: string[] }> = {
  pdf: { name: "PDF document", extensions: ["pdf"] },
  html: { name: "Web page", extensions: ["html"] }
};

export function registerApiDocHandlers(ctx?: IpcContext) {
  const watching = new Map<string, () => void>();
  const save = async (options: Electron.SaveDialogOptions) =>
    ctx?.mainWindow
      ? await dialog.showSaveDialog(ctx.mainWindow, options)
      : await dialog.showSaveDialog(options);

  ipcMain.handle(
    "lazify:read-collection-doc",
    async (_event, projectPath: string, collectionId: string) =>
      readCollectionDoc(projectPath, collectionId)
  );

  ipcMain.handle(
    "lazify:save-collection-doc",
    async (_event, projectPath: string, doc: CollectionDoc) => saveCollectionDoc(projectPath, doc)
  );

  ipcMain.handle(
    "lazify:preview-collection-doc",
    async (_event, projectPath: string, collectionId: string) =>
      renderCollectionDoc(projectPath, collectionId)
  );

  ipcMain.handle(
    "lazify:open-collection-doc",
    async (_event, projectPath: string, collectionId: string) => {
      const filePath = writeDocPreviewFile(projectPath, collectionId);

      if (!filePath) return null;

      const failure = await shell.openPath(filePath);

      return failure.length > 0 ? failure : null;
    }
  );

  ipcMain.handle(
    "lazify:export-collection-doc",
    async (_event, projectPath: string, collectionId: string, format: DocFormat, name: string) => {
      const filter = FORMAT_FILTERS[format] ?? FORMAT_FILTERS.html;
      const result = await save({
        title: "Where should the document go?",
        defaultPath: `${name || "api"}.${filter.extensions[0]}`,
        filters: [filter]
      });

      if (result.canceled || !result.filePath) return null;

      return exportCollectionDoc(projectPath, collectionId, format, result.filePath);
    }
  );

  ipcMain.handle("lazify:choose-doc-logo", async () => {
    const options = {
      title: "Which image should the cover carry?",
      filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
      properties: ["openFile" as const]
    };
    const result = ctx?.mainWindow
      ? await dialog.showOpenDialog(ctx.mainWindow, options)
      : await dialog.showOpenDialog(options);
    const filePath = result.canceled ? null : (result.filePaths[0] ?? null);

    if (!filePath) return null;

    const mediaType = LOGO_TYPES[path.extname(filePath).toLowerCase()];

    if (!mediaType) return null;

    const bytes = await fs.readFile(filePath);

    if (bytes.byteLength > MAX_LOGO_BYTES) return null;

    return `data:${mediaType};base64,${bytes.toString("base64")}`;
  });

  ipcMain.handle(
    "lazify:collection-doc-brief",
    async (_event, projectPath: string, collectionId: string) =>
      collectionDocBrief(projectPath, collectionId)
  );

  ipcMain.handle(
    "lazify:collection-doc-questions",
    async (_event, projectPath: string, collectionId: string, keys: string[]) =>
      collectionDocQuestions(projectPath, collectionId, keys)
  );

  ipcMain.handle(
    "lazify:write-collection-doc-brief",
    async (_event, projectPath: string, collectionId: string) =>
      writeCollectionDocBrief(projectPath, collectionId)
  );

  ipcMain.handle(
    "lazify:watch-collection-doc-draft",
    async (event, projectPath: string, collectionId: string) => {
      const key = `${event.sender.id}:${collectionId}`;

      watching.get(key)?.();
      watching.delete(key);

      const stop = watchDocDraft(projectPath, collectionId, () => {
        if (!event.sender.isDestroyed()) {
          event.sender.send("lazify:collection-doc-draft-changed", collectionId);
        }
      });

      if (!stop) return false;

      watching.set(key, stop);
      event.sender.once("destroyed", () => {
        stop();
        watching.delete(key);
      });

      return true;
    }
  );

  ipcMain.handle(
    "lazify:unwatch-collection-doc-draft",
    async (event, collectionId: string) => {
      const key = `${event.sender.id}:${collectionId}`;

      watching.get(key)?.();
      watching.delete(key);
    }
  );

  ipcMain.handle(
    "lazify:import-collection-doc-draft",
    async (_event, projectPath: string, collectionId: string, choose: boolean, onlyEmpty = false) => {
      if (!choose) return importCollectionDocDraft(projectPath, collectionId, undefined, onlyEmpty);

      const options = {
        title: "Which draft should be brought in?",
        filters: [{ name: "Document draft", extensions: ["json"] }],
        properties: ["openFile" as const]
      };
      const result = ctx?.mainWindow
        ? await dialog.showOpenDialog(ctx.mainWindow, options)
        : await dialog.showOpenDialog(options);

      if (result.canceled || !result.filePaths[0]) return null;

      return importCollectionDocDraft(projectPath, collectionId, result.filePaths[0], onlyEmpty);
    }
  );
}
