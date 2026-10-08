import { ImagePreview } from "./ImagePreview";
import { PdfPreview } from "./PdfPreview";
import { useAssetObjectUrl } from "./use-asset-url";

interface FilePreviewProps {
  /** Text files never reach here — the pane sends those to the code surface. */
  kind: "image" | "svg" | "pdf";
  fileName: string;
  /** Base64 bytes for an image or PDF; the source itself for an SVG. */
  content: string;
  mimeType: string;
  byteLength?: number;
}

/**
 * The rendered view of a file: the picture, or the document. An SVG arrives as
 * the text the editor already loaded and is drawn through an `<img>`, which
 * cannot run whatever scripts the file happens to carry.
 */
export function FilePreview({
  kind,
  fileName,
  content,
  mimeType,
  byteLength,
}: Readonly<FilePreviewProps>) {
  const url = useAssetObjectUrl(content, mimeType, kind === "svg" ? "text" : "base64");

  if (kind === "pdf") {
    return <PdfPreview url={url} fileName={fileName} />;
  }

  return <ImagePreview url={url} fileName={fileName} byteLength={byteLength} />;
}
