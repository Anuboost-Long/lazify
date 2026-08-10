import fs from "node:fs/promises";
import path from "node:path";

import type { ProjectAssetFile } from "../../renderer/shared/types/lazify";

// Assets travel to the renderer as base64, which costs about a third more than
// the file itself, so the cap sits well under what an IPC message can carry.
const MAX_ASSET_BYTES = 16 * 1024 * 1024;

const ASSET_MIME_TYPES: Record<string, string> = {
  ".apng": "image/apng",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

/** The MIME type this file previews as, or null when it is not an asset. */
export function getProjectAssetMimeType(filePath: string): string | null {
  return ASSET_MIME_TYPES[path.extname(filePath).toLowerCase()] ?? null;
}

/**
 * Reads a file the editor renders rather than reads — an image or a PDF.
 *
 * The text preview path refuses these: they trip its binary check and come
 * back as a placeholder. This one hands the bytes over intact so the renderer
 * can build a blob and show the thing itself.
 */
export async function readProjectAssetFile(filePath: string): Promise<ProjectAssetFile> {
  const resolvedFilePath = path.resolve(filePath);
  const mimeType = getProjectAssetMimeType(resolvedFilePath);

  if (!mimeType) {
    throw new Error("This file type has no preview.");
  }

  const stats = await fs.stat(resolvedFilePath);

  if (!stats.isFile()) {
    throw new Error("The selected path is not a file.");
  }

  if (stats.size > MAX_ASSET_BYTES) {
    throw new Error(
      `Preview omitted. File is larger than ${Math.round(
        MAX_ASSET_BYTES / (1024 * 1024)
      )} MB.`
    );
  }

  const buffer = await fs.readFile(resolvedFilePath);

  return {
    mimeType,
    base64: buffer.toString("base64"),
    byteLength: stats.size,
  };
}
