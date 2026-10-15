import { fileStat, readFileBytes } from "@/platform/folders";
import path from "@/shared/lib/path";

import type { MultipartPart } from "./types";

const MAX_ATTACHMENT_BYTES = 25_000_000;

export interface MultipartBody {
	body: Uint8Array;
	contentType: string;
}

export type MultipartResult = MultipartBody | { error: string };

function quoted(name: string) {
	return name.replaceAll(/[\r\n]/g, " ").replaceAll('"', String.raw`\"`);
}

function bytesInclude(haystack: Uint8Array, needle: Uint8Array): boolean {
	outer: for (let start = 0; start <= haystack.length - needle.length; start += 1) {
		for (let offset = 0; offset < needle.length; offset += 1) {
			if (haystack[start + offset] !== needle[offset]) continue outer;
		}

		return true;
	}

	return needle.length === 0;
}

/** Bytes decide the boundary: one that appears inside a file would end it early. */
function boundaryFor(chunks: Uint8Array[]) {
	let boundary = "LazifyBoundary";

	while (chunks.some((chunk) => bytesInclude(chunk, new TextEncoder().encode(boundary)))) boundary += "0";

	return boundary;
}

async function contentOf(part: MultipartPart): Promise<Uint8Array | { error: string }> {
	if (!part.filePath) return new TextEncoder().encode(part.text ?? "");

	const stats = await fileStat(part.filePath).catch(() => null);

	if (stats?.kind !== "file") return { error: `${part.filePath} is not a file on this machine.` };
	if (stats.size > MAX_ATTACHMENT_BYTES) {
		return { error: `${path.basename(part.filePath)} is larger than 25 MB.` };
	}

	return readFileBytes(part.filePath);
}

function headerFor(part: MultipartPart, boundary: string) {
	const disposition = part.filePath
		? `form-data; name="${quoted(part.name)}"; filename="${quoted(path.basename(part.filePath))}"`
		: `form-data; name="${quoted(part.name)}"`;
	const type = part.filePath ? "\r\nContent-Type: application/octet-stream" : "";

	return new TextEncoder().encode(`--${boundary}\r\nContent-Disposition: ${disposition}${type}\r\n\r\n`);
}

function concat(chunks: Uint8Array[]): Uint8Array {
	const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const joined = new Uint8Array(total);
	let offset = 0;

	for (const chunk of chunks) {
		joined.set(chunk, offset);
		offset += chunk.length;
	}

	return joined;
}

/**
 * A file is read where files can be read. The renderer names the path, this
 * turns it into bytes when the request goes out, so nothing large crosses the
 * boundary between them and a saved request keeps working after a restart.
 */
export async function buildMultipartBody(parts: MultipartPart[]): Promise<MultipartResult> {
	const contents: Uint8Array[] = [];

	for (const part of parts) {
		const content = await contentOf(part);

		if (!(content instanceof Uint8Array)) return content;

		contents.push(content);
	}

	const boundary = boundaryFor(contents);
	const chunks = parts.flatMap((part, at) => [
		headerFor(part, boundary),
		contents[at],
		new TextEncoder().encode("\r\n"),
	]);

	return {
		body: concat([...chunks, new TextEncoder().encode(`--${boundary}--\r\n`)]),
		contentType: `multipart/form-data; boundary=${boundary}`,
	};
}
