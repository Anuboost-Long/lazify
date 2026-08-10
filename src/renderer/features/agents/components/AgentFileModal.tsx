import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import { SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { CodeSurface } from "@renderer/shared/ui/code/CodeSurface";
import { CopyButton } from "@renderer/shared/ui/CopyButton";
import { FilePreview } from "@renderer/shared/ui/code/preview/FilePreview";
import {
  getFilePreviewKind,
  getRenderedPreviewKind,
  needsAssetBytes,
} from "@renderer/shared/ui/code/preview/file-preview-kind";
import { PreviewModeToggle } from "@renderer/shared/ui/code/preview/PreviewModeToggle";
import type { SymbolPosition } from "@renderer/shared/ui/code/symbol-at-point";

interface AgentFileModalProps {
  /** The file being read, or null while the modal is closed. */
  file: ImportedProjectIndexNode | null;
  /** Absent when no terminal is open, which hides the send button. */
  onSendToTerminal: ((text: string) => void) | null;
  /** Clicking an identifier asks the panel to open where it is declared. */
  onOpenSymbol?: (symbol: string, position?: SymbolPosition) => void;
  /** 1-based line to reveal, set when this file was reached by a jump. */
  focusLine?: number | null;
  /** Returns to the file jumped from; absent when there is nowhere back to. */
  onBack?: () => void;
  onClose: () => void;
}

/**
 * Read-only look at a file while an agent is working, so its path and contents
 * can be quoted back into the conversation.
 */
export function AgentFileModal({
  file,
  onSendToTerminal,
  onOpenSymbol,
  focusLine,
  onBack,
  onClose
}: Readonly<AgentFileModalProps>) {
  const { t } = useTranslation();
  /** File text, or base64 bytes once `mimeType` says this one is rendered. */
  const [loaded, setLoaded] = useState<{
    content: string;
    mimeType?: string;
    byteLength?: number;
  }>({ content: "" });
  // Same bargain as the workbench editor: an SVG opens as the picture, and the
  // reader can ask for the source behind it.
  const [svgMode, setSvgMode] = useState<"preview" | "code">("preview");

  useEffect(() => {
    if (!file) {
      setLoaded({ content: "" });
      return;
    }

    let cancelled = false;

    // Images and PDFs have no text to show, so their bytes come over whole.
    const load = needsAssetBytes(file.name)
      ? globalThis.lazify.readProjectAssetFile(file.absolutePath).then((asset) => ({
          content: asset.base64,
          mimeType: asset.mimeType,
          byteLength: asset.byteLength
        }))
      : globalThis.lazify
          .readImportedProjectFile(file.absolutePath)
          .then((content) => ({ content }));

    void load
      .then((result) => {
        if (!cancelled) setLoaded(result);
      })
      .catch((error) => {
        // A file too large to preview says so, rather than leaving a blank
        // pane the reader has to guess at.
        if (!cancelled) {
          setLoaded({ content: error instanceof Error ? error.message : "" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  const previewKind = file ? getFilePreviewKind(file.name) : "text";
  const renderedKind = getRenderedPreviewKind(
    previewKind,
    svgMode,
    Boolean(loaded.mimeType)
  );

  return (
    <BaseModal open={file !== null} onClose={onClose}>
      <div
        className={clsx(
          "flex h-[85vh] w-[min(92vw,72rem)] flex-col overflow-hidden",
          "rounded-2xl border border-border bg-soft shadow-2xl"
        )}
      >
        <header className="flex items-center gap-2 border-b border-border px-3 py-2">
          {/* A jump replaces what the modal is showing, so there has to be a way
              back to the file the symbol was clicked in. */}
          {onBack ? (
            <IconButton
              icon="arrow-left"
              aria-label={t(translation.GlobalTerm.Back)}
              onClick={onBack}
              className="text-text"
            />
          ) : null}
          <UiIcon name="page" className="h-3.5 w-3.5 shrink-0 text-muted" />
          <span className="min-w-0">
            <SmallText as="span" className="!text-text block truncate">
              {file?.name ?? ""}
            </SmallText>
            <SmallText as="span" className="!text-muted block truncate">
              {file?.relativePath ?? ""}
            </SmallText>
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {previewKind === "svg" ? (
              <PreviewModeToggle
                value={svgMode}
                onChange={setSvgMode}
                options={[
                  { id: "preview", label: t(translation.ProjectTree.PreviewImage) },
                  { id: "code", label: t(translation.ProjectTree.PreviewCode) }
                ]}
              />
            ) : null}

            {/* Pasting the path into the agent beats retyping it by hand. */}
            {onSendToTerminal ? (
              <button
                type="button"
                onClick={() => {
                  if (!file) return;
                  onSendToTerminal(file.relativePath);
                  onClose();
                }}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md border border-border px-2 py-1",
                  "transition-colors hover:bg-text/[0.06]"
                )}
              >
                <UiIcon name="terminal" className="h-3 w-3 text-muted" />
                <SmallText as="span" className="!text-muted">
                  {t(translation.Agents.SendPathToTerminal)}
                </SmallText>
              </button>
            ) : null}

            <CopyButton
              value={file?.relativePath ?? ""}
              label={t(translation.Agents.CopyPath)}
              copiedLabel={t(translation.Agents.PathCopied)}
            />

            <IconButton
              icon="xmark"
              aria-label={t(translation.GlobalTerm.Close)}
              onClick={onClose}
              className="text-text"
            />
          </div>
        </header>

        <div className="min-h-0 flex-1">
          {renderedKind ? (
            <FilePreview
              kind={renderedKind}
              fileName={file?.name ?? ""}
              content={loaded.content}
              // An SVG renders from the source already in hand, so it brings
              // its own type rather than one the loader reported.
              mimeType={loaded.mimeType ?? "image/svg+xml"}
              byteLength={loaded.byteLength}
            />
          ) : (
            <CodeSurface
              variant="flush"
              content={loaded.content}
              fileName={file?.name}
              onOpenSymbol={onOpenSymbol}
              focusLine={focusLine}
            />
          )}
        </div>
      </div>
    </BaseModal>
  );
}
