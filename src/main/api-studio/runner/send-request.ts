import { buildMultipartBody } from "./multipart-body";
import { fileNameFor, isTextual, writeResponseFile, type ResponseFile } from "./response-file";
import type { ApiRequestDraft, ApiResponseSummary, ApiSendOutcome, RequestHeader } from "./types";

const TIMEOUT_MS = 30_000;
const MAX_BODY_BYTES = 2_000_000;
const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

interface BoundedBody {
  text: string;
  bytes: number;
  truncated: boolean;
  file?: ResponseFile | null;
}

async function readFileBody(response: Response, url: string): Promise<BoundedBody> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const name = fileNameFor(
    url,
    response.headers.get("content-type"),
    response.headers.get("content-disposition")
  );

  return { text: "", bytes: bytes.byteLength, truncated: false, file: writeResponseFile(name, bytes) };
}

async function readBoundedBody(response: Response): Promise<BoundedBody> {
  const reader = response.body?.getReader();
  if (!reader) return { text: "", bytes: 0, truncated: false };

  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytes = 0;
  let truncated = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) break;

    bytes += value.byteLength;

    if (bytes > MAX_BODY_BYTES) {
      chunks.push(decoder.decode(value.slice(0, value.byteLength - (bytes - MAX_BODY_BYTES))));
      truncated = true;
      await reader.cancel();
      break;
    }

    chunks.push(decoder.decode(value, { stream: true }));
  }

  return { text: chunks.join(""), bytes, truncated };
}

function responseHeaders(response: Response): RequestHeader[] {
  const headers: RequestHeader[] = [];

  response.headers.forEach((value, name) => headers.push({ name, value }));

  return headers;
}

function failureMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return `The request did not finish within ${TIMEOUT_MS / 1000} seconds.`;
  }

  const message = error instanceof Error ? ((error as { cause?: unknown }).cause ?? error) : error;

  return message instanceof Error ? message.message : String(message);
}

type Payload =
  | { body: string | Uint8Array | undefined; headers: RequestHeader[] }
  | { error: string };

/** The multipart body names its own boundary, so it also names its own header. */
async function payloadOf(draft: ApiRequestDraft): Promise<Payload> {
  if (!draft.multipart?.length) {
    return { body: draft.body ?? undefined, headers: draft.headers };
  }

  const built = await buildMultipartBody(draft.multipart);

  if ("error" in built) return { error: built.error };

  return {
    body: built.body,
    headers: [
      ...draft.headers.filter((header) => header.name.toLowerCase() !== "content-type"),
      { name: "Content-Type", value: built.contentType }
    ]
  };
}

export async function sendApiRequest(draft: ApiRequestDraft): Promise<ApiSendOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();
  const payload = await payloadOf(draft);

  if ("error" in payload) {
    clearTimeout(timer);

    return { ok: false, error: payload.error, durationMs: Date.now() - startedAt };
  }

  try {
    const response = await fetch(draft.url, {
      method: draft.method,
      headers: payload.headers.map((header) => [header.name, header.value] as [string, string]),
      body: BODYLESS_METHODS.has(draft.method) ? undefined : (payload.body as BodyInit | undefined),
      redirect: "follow",
      signal: controller.signal
    });

    const body = isTextual(response.headers.get("content-type"))
      ? await readBoundedBody(response)
      : await readFileBody(response, draft.url);
    const summary: ApiResponseSummary = {
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
      headers: responseHeaders(response),
      mediaType: response.headers.get("content-type"),
      body: body.text,
      bodyBytes: body.bytes,
      truncated: body.truncated,
      file: body.file ?? null
    };

    return { ok: true, response: summary };
  } catch (error) {
    return { ok: false, error: failureMessage(error), durationMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}
