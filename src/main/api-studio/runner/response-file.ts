import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

const DOWNLOAD_DIRECTORY = "api-studio-downloads";
const TEXTUAL = /^(text\/|application\/(json|xml|javascript|x-www-form-urlencoded|graphql|.*\+json|.*\+xml)|image\/svg)/i;

export interface ResponseFile {
  path: string;
  name: string;
}

export function isTextual(mediaType: string | null): boolean {
  if (!mediaType) return true;

  return TEXTUAL.test(mediaType.split(";")[0].trim());
}

function extensionFor(mediaType: string | null): string {
  const type = (mediaType ?? "").split(";")[0].trim().toLowerCase();
  const known: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "application/octet-stream": ".bin",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "text/csv": ".csv",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp"
  };

  if (known[type]) return known[type];

  const subtype = type.split("/")[1];

  return subtype ? `.${subtype.replace(/[^a-z0-9]+/g, "")}` : "";
}

function fromDisposition(header: string | null): string | null {
  const quoted = header?.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
  const name = quoted?.[1]?.trim();

  return name ? path.basename(decodeURIComponent(name)) : null;
}

export function fileNameFor(url: string, mediaType: string | null, disposition: string | null) {
  const declared = fromDisposition(disposition);

  if (declared) return declared;

  const fromUrl = (() => {
    try {
      return path.basename(new URL(url).pathname);
    } catch {
      return "";
    }
  })();
  const stem = fromUrl && fromUrl !== "/" ? fromUrl : "response";

  return path.extname(stem) ? stem : `${stem}${extensionFor(mediaType)}`;
}

export function downloadDirectory() {
  return path.join(app.getPath("userData"), DOWNLOAD_DIRECTORY);
}

function freePath(directory: string, name: string): string {
  const stamp = Date.now();

  for (let index = 0; ; index += 1) {
    const filePath = path.join(directory, index === 0 ? `${stamp}-${name}` : `${stamp}-${index}-${name}`);

    if (!fs.existsSync(filePath)) return filePath;
  }
}

export function writeResponseFile(name: string, bytes: Uint8Array): ResponseFile {
  const directory = downloadDirectory();

  fs.mkdirSync(directory, { recursive: true });

  const filePath = freePath(directory, name);

  fs.writeFileSync(filePath, bytes);

  return { path: filePath, name };
}
