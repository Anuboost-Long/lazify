import { useEffect, useState } from "react";

/**
 * A blob URL for a file the editor renders.
 *
 * Blobs rather than `data:` URLs: a multi-megabyte data URI has to sit in the
 * DOM as one enormous attribute, and Chromium's PDF viewer will not load one
 * at all. The URL is revoked as soon as the file or the view changes, so
 * flipping through images does not leak them.
 */
export function useAssetObjectUrl(
  data: string,
  mimeType: string,
  encoding: "base64" | "text"
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      setUrl(null);
      return;
    }

    let objectUrl: string;

    try {
      objectUrl = URL.createObjectURL(
        new Blob([encoding === "base64" ? decodeBase64(data) : data], {
          type: mimeType,
        })
      );
    } catch {
      // Malformed bytes are the loader's problem to report; the viewer just
      // shows nothing rather than tearing the pane down.
      setUrl(null);
      return;
    }

    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [data, mimeType, encoding]);

  return url;
}

function decodeBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
