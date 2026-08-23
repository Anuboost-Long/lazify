import type { ApiVariable } from "../types";
import { interpolate } from "./interpolate";
import type { FormEntry, MultipartPart, RequestBodyInput } from "./types";

export const URLENCODED_MEDIA_TYPE = "application/x-www-form-urlencoded";
export const MULTIPART_MEDIA_TYPE = "multipart/form-data";

export interface EncodedBody {
  text: string;
  mediaType: string;
  /** Set instead of `text` when the parts have to be assembled from files. */
  parts?: MultipartPart[];
}

export function isFormMediaType(mediaType: string | null | undefined): boolean {
  return (
    mediaType?.startsWith(MULTIPART_MEDIA_TYPE) === true ||
    mediaType?.startsWith(URLENCODED_MEDIA_TYPE) === true
  );
}

function urlencoded(entries: FormEntry[]): EncodedBody {
  const form = new URLSearchParams();

  for (const entry of entries) form.append(entry.name, entry.value);

  return { text: form.toString(), mediaType: URLENCODED_MEDIA_TYPE };
}

/** Text parts carry their value; a file part carries where to find it. */
function multipart(entries: FormEntry[]): EncodedBody {
  return {
    text: "",
    mediaType: MULTIPART_MEDIA_TYPE,
    parts: entries.map((entry) =>
      entry.kind === "file"
        ? { name: entry.name, filePath: entry.value }
        : { name: entry.name, text: entry.value }
    )
  };
}

export function encodeBody(
  body: RequestBodyInput,
  jsonMediaType: string,
  variables: ApiVariable[],
  values: Record<string, string>
): EncodedBody | null {
  if (body.mode === "json") {
    return body.text.trim()
      ? { text: interpolate(body.text, variables, values), mediaType: jsonMediaType }
      : null;
  }

  const entries = body.entries
    .filter((entry) => entry.name.trim().length > 0)
    .map((entry) => ({
      name: entry.name.trim(),
      value: interpolate(entry.value, variables, values),
      kind: entry.kind
    }));

  if (entries.length === 0) return null;

  return body.mediaType.startsWith(MULTIPART_MEDIA_TYPE) ? multipart(entries) : urlencoded(entries);
}
