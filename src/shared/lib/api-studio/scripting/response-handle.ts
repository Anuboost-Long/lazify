import type { ApiResponseSummary } from "../runner/types";

export function createResponseHandle(response: ApiResponseSummary): Record<string, unknown> {
  const header = (name: string) =>
    response.headers.find((item) => item.name.toLowerCase() === String(name).toLowerCase()) ?? null;

  return {
    status: response.status,
    statusText: response.statusText,
    durationMs: response.durationMs,
    mediaType: response.mediaType,
    body: response.body,
    json: () => JSON.parse(response.body),
    headers: {
      get: (name: string) => header(name)?.value ?? null,
      has: (name: string) => header(name) !== null,
      all: () => response.headers.map((item) => ({ ...item }))
    }
  };
}
