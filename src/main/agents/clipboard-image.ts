import { clipboard } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Saves whatever image is on the system clipboard to a temp PNG file, so a
 * pasted screenshot can be handed to a PTY as a file path instead of being
 * silently dropped. Returns null when the clipboard holds no image (plain
 * text, a copied file, nothing at all).
 */
export function saveClipboardImageToTempFile(): string | null {
  const image = clipboard.readImage();
  if (image.isEmpty()) return null;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-paste-"));
  const filePath = path.join(dir, "screenshot.png");
  fs.writeFileSync(filePath, image.toPNG());
  return filePath;
}
