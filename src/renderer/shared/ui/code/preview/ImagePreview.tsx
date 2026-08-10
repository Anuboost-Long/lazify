import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { EditorPaneNotice } from "@renderer/shared/ui/code/EditorPaneShell";
import { formatByteSize } from "./file-preview-kind";
import { PreviewModeToggle } from "./PreviewModeToggle";

type ZoomMode = "fit" | "actual";

interface ImagePreviewProps {
  url: string | null;
  fileName: string;
  /** Shown in the status line; omit where the size is not known. */
  byteLength?: number;
}

/**
 * Renders an image file the way an image viewer would: centred on a
 * checkerboard so transparency is visible, scaled down to fit by default, and
 * switchable to actual size for anything the reader needs to inspect closely.
 */
export function ImagePreview({ url, fileName, byteLength }: Readonly<ImagePreviewProps>) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState<ZoomMode>("fit");
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <EditorPaneNotice
        chrome="flush"
        tone={failed ? "error" : "neutral"}
        title={t(
          failed
            ? translation.ProjectTree.PreviewRenderError
            : translation.ProjectTree.LoadingFilePreview
        )}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto" style={CHECKERBOARD}>
        <div className="flex min-h-full min-w-full items-center justify-center p-6">
          <img
            src={url}
            alt={fileName}
            onLoad={(event) =>
              setSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            onError={() => setFailed(true)}
            className={clsx(
              "shadow-panel",
              zoom === "fit" ? "max-h-full max-w-full object-contain" : "max-w-none"
            )}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-soft px-4 py-2">
        <SmallText className="truncate !text-muted">
          {[
            size ? `${size.width} × ${size.height}` : null,
            byteLength === undefined ? null : formatByteSize(byteLength),
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </SmallText>

        <PreviewModeToggle<ZoomMode>
          value={zoom}
          onChange={setZoom}
          options={[
            { id: "fit", label: t(translation.ProjectTree.PreviewFit) },
            { id: "actual", label: t(translation.ProjectTree.PreviewActual) },
          ]}
        />
      </div>
    </div>
  );
}

// Two offset gradients make the classic transparency grid without an asset.
// It follows the theme, because the border colour is already a translucent
// tint of whichever way round the palette is.
const CHECKERBOARD = {
  backgroundColor: "rgb(var(--color-bg))",
  backgroundImage:
    "linear-gradient(45deg, var(--color-border) 25%, transparent 25%, transparent 75%, var(--color-border) 75%), linear-gradient(45deg, var(--color-border) 25%, transparent 25%, transparent 75%, var(--color-border) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 8px 8px",
} as const;
