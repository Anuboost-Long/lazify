import fs from "node:fs/promises";
import path from "node:path";

import type { MultipartPart } from "./types";

const MAX_ATTACHMENT_BYTES = 25_000_000;

export interface MultipartBody {
  body: Buffer;
  contentType: string;
}

export type MultipartResult = MultipartBody | { error: string };

function quoted(name: string) {
  return name.replace(/[\r\n]/g, " ").replace(/"/g, '\\"');
}

/** Bytes decide the boundary: one that appears inside a file would end it early. */
function boundaryFor(chunks: Buffer[]) {
  let boundary = "LazifyBoundary";

  while (chunks.some((chunk) => chunk.includes(boundary))) boundary += "0";

  return boundary;
}

async function contentOf(part: MultipartPart): Promise<Buffer | { error: string }> {
  if (!part.filePath) return Buffer.from(part.text ?? "", "utf8");

  const stats = await fs.stat(part.filePath).catch(() => null);

  if (!stats?.isFile()) return { error: `${part.filePath} is not a file on this machine.` };
  if (stats.size > MAX_ATTACHMENT_BYTES) {
    return { error: `${path.basename(part.filePath)} is larger than 25 MB.` };
  }

  return fs.readFile(part.filePath);
}

function headerFor(part: MultipartPart, boundary: string) {
  const disposition = part.filePath
    ? `form-data; name="${quoted(part.name)}"; filename="${quoted(path.basename(part.filePath))}"`
    : `form-data; name="${quoted(part.name)}"`;
  const type = part.filePath ? "\r\nContent-Type: application/octet-stream" : "";

  return Buffer.from(`--${boundary}\r\nContent-Disposition: ${disposition}${type}\r\n\r\n`, "utf8");
}

/**
 * A file is read where files can be read. The renderer names the path, main
 * turns it into bytes when the request goes out, so nothing large crosses the
 * boundary between them and a saved request keeps working after a restart.
 */
export async function buildMultipartBody(parts: MultipartPart[]): Promise<MultipartResult> {
  const contents: Buffer[] = [];

  for (const part of parts) {
    const content = await contentOf(part);

    if (!Buffer.isBuffer(content)) return content;

    contents.push(content);
  }

  const boundary = boundaryFor(contents);
  const chunks = parts.flatMap((part, at) => [
    headerFor(part, boundary),
    contents[at],
    Buffer.from("\r\n", "utf8")
  ]);

  return {
    body: Buffer.concat([...chunks, Buffer.from(`--${boundary}--\r\n`, "utf8")]),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}
