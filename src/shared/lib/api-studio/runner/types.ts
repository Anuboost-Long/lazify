import type { HttpMethod, ParameterLocation } from "../types";

export type RequestFieldLocation = ParameterLocation | "header";

export interface RequestHeader {
  name: string;
  value: string;
}

export interface FormEntry {
  name: string;
  /** The text to send, or the path of the file to attach. */
  value: string;
  kind?: "text" | "file";
}

/** One part of a multipart body, resolved to bytes when the request is sent. */
export interface MultipartPart {
  name: string;
  text?: string;
  filePath?: string;
}

export type RequestBodyInput =
  | { mode: "json"; text: string }
  | { mode: "form"; mediaType: string; entries: FormEntry[] };

export type BodyMode = RequestBodyInput["mode"];

export interface ApiRequestDraft {
  method: HttpMethod;
  url: string;
  headers: RequestHeader[];
  body: string | null;
  /**
   * A multipart body, stated rather than encoded: files are read where they can
   * be read, in main, at the moment the request goes out.
   */
  multipart?: MultipartPart[];
}

export interface ApiResponseSummary {
  status: number;
  statusText: string;
  durationMs: number;
  headers: RequestHeader[];
  mediaType: string | null;
  body: string;
  bodyBytes: number;
  truncated: boolean;
  file?: { path: string; name: string } | null;
}

export type ApiSendOutcome =
  | { ok: true; response: ApiResponseSummary }
  | { ok: false; error: string; durationMs: number };
