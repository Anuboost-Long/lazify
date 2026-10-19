import { requestBytes } from "@/platform/http";

import { buildMultipartBody } from "./multipart-body";
import { fileNameFor, isTextual, writeResponseFile, type ResponseFile } from "./response-file";
import { isLoopbackHost } from "./tls-trust";
import type { ApiRequestDraft, ApiResponseSummary, ApiSendOutcome, RequestHeader } from "./types";

const TIMEOUT_MS = 30_000;
const MAX_DISPLAY_BYTES = 2_000_000;
/**
 * `desktop.http` reads a whole body before Lazify ever sees it (no
 * streaming, unlike Electron's `fetch` reader, which could stop pulling
 * bytes the moment it had enough to show) — this is a hard safety net
 * against downloading something truly unbounded, not the display cap.
 */
const MAX_DOWNLOAD_BYTES = 100_000_000;
const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

interface BoundedBody {
	text: string;
	bytes: number;
	truncated: boolean;
	file?: ResponseFile | null;
}

async function boundedBody(bytes: Uint8Array, mediaType: string | null, url: string): Promise<BoundedBody> {
	if (!isTextual(mediaType)) {
		return { text: "", bytes: bytes.byteLength, truncated: false, file: await writeResponseFile(fileNameFor(url, mediaType, null), bytes) };
	}

	const truncated = bytes.byteLength > MAX_DISPLAY_BYTES;
	const text = new TextDecoder().decode(truncated ? bytes.subarray(0, MAX_DISPLAY_BYTES) : bytes);

	return { text, bytes: bytes.byteLength, truncated };
}

function responseHeaders(headers: Record<string, string>): RequestHeader[] {
	return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

function hostnameOf(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return "";
	}
}

interface ChainFailure {
	code?: string;
	message?: string;
}

function failureMessage(error: unknown): string {
	const failure = error as ChainFailure;

	if (failure?.code === "TOO_LARGE") {
		return `The response is larger than Lazify can download at once (over ${MAX_DOWNLOAD_BYTES / 1_000_000} MB).`;
	}

	if (typeof failure?.message === "string") return failure.message;
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;

	return "The request failed for an unknown reason.";
}

type Payload = { data: string | Uint8Array | undefined; headers: RequestHeader[] } | { error: string };

/** The multipart body names its own boundary, so it also names its own header. */
async function payloadOf(draft: ApiRequestDraft): Promise<Payload> {
	if (!draft.multipart?.length) {
		return { data: draft.body ?? undefined, headers: draft.headers };
	}

	const built = await buildMultipartBody(draft.multipart);

	if ("error" in built) return { error: built.error };

	return {
		data: built.body,
		headers: [
			...draft.headers.filter((header) => header.name.toLowerCase() !== "content-type"),
			{ name: "Content-Type", value: built.contentType },
		],
	};
}

function headerRecord(headers: RequestHeader[]): Record<string, string> {
	const record: Record<string, string> = {};

	for (const header of headers) record[header.name] = header.value;

	return record;
}

export async function sendApiRequest(draft: ApiRequestDraft): Promise<ApiSendOutcome> {
	const startedAt = Date.now();
	const payload = await payloadOf(draft);

	if ("error" in payload) {
		return { ok: false, error: payload.error, durationMs: Date.now() - startedAt };
	}

	try {
		const response = await requestBytes({
			url: draft.url,
			method: draft.method,
			headers: headerRecord(payload.headers),
			data: BODYLESS_METHODS.has(draft.method) ? undefined : payload.data,
			timeout: TIMEOUT_MS,
			maxBytes: MAX_DOWNLOAD_BYTES,
			trustLoopbackCertificates: isLoopbackHost(hostnameOf(draft.url)),
		});

		const mediaType = response.headers["content-type"] ?? null;
		const body = await boundedBody(response.bytes, mediaType, draft.url);
		const summary: ApiResponseSummary = {
			status: response.status,
			statusText: response.statusText,
			durationMs: Date.now() - startedAt,
			headers: responseHeaders(response.headers),
			mediaType,
			body: body.text,
			bodyBytes: body.bytes,
			truncated: body.truncated,
			file: body.file ?? null,
		};

		return { ok: true, response: summary };
	} catch (error) {
		return { ok: false, error: failureMessage(error), durationMs: Date.now() - startedAt };
	}
}
