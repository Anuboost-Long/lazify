/**
 * What the editor should do with a file: read it as code, or render it.
 *
 * SVG is its own kind because it is both — text the reader may want to edit
 * and a picture they may want to look at — so the pane offers a toggle rather
 * than picking for them.
 */
export type FilePreviewKind = "text" | "image" | "svg" | "pdf";

const IMAGE_EXTENSIONS = new Set([
  "apng",
  "avif",
  "bmp",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "webp",
]);

export function getFilePreviewKind(fileName: string): FilePreviewKind {
  const extension = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();

  if (extension === "svg") return "svg";
  if (extension === "pdf") return "pdf";
  if (IMAGE_EXTENSIONS.has(extension)) return "image";

  return "text";
}

/**
 * The rendered view a surface should show for a file, or null to fall back to
 * its text.
 *
 * An image or PDF only renders once its bytes have arrived, so a caller that
 * reads every file as text keeps the code surface it always had. An SVG needs
 * no bytes — it is its own source — so the reader's toggle decides.
 */
export function getRenderedPreviewKind(
  kind: FilePreviewKind,
  svgMode: "preview" | "code",
  hasAssetBytes: boolean
): Exclude<FilePreviewKind, "text"> | null {
  if (kind === "svg") return svgMode === "preview" ? "svg" : null;
  if (kind === "text") return null;

  return hasAssetBytes ? kind : null;
}

/** Files whose bytes have to come over intact rather than as decoded text. */
export function needsAssetBytes(fileName: string): boolean {
  const kind = getFilePreviewKind(fileName);

  return kind === "image" || kind === "pdf";
}

/** "1.2 MB" — the size line under a rendered asset. */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
