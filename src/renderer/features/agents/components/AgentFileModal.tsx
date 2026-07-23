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

interface AgentFileModalProps {
  /** The file being read, or null while the modal is closed. */
  file: ImportedProjectIndexNode | null;
  /** Absent when no terminal is open, which hides the send button. */
  onSendToTerminal: ((text: string) => void) | null;
  onClose: () => void;
}

/**
 * Read-only look at a file while an agent is working, so its path and contents
 * can be quoted back into the conversation.
 */
export function AgentFileModal({ file, onSendToTerminal, onClose }: Readonly<AgentFileModalProps>) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!file) {
      setContent("");
      return;
    }

    let cancelled = false;

    void globalThis.lazify
      .readImportedProjectFile(file.absolutePath)
      .then((result) => {
        if (!cancelled) setContent(result);
      })
      .catch(() => {
        if (!cancelled) setContent("");
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <BaseModal open={file !== null} onClose={onClose}>
      <div
        className={clsx(
          "flex h-[85vh] w-[min(92vw,72rem)] flex-col overflow-hidden",
          "rounded-2xl border border-border bg-soft shadow-2xl"
        )}
      >
        <header className="flex items-center gap-2 border-b border-border px-3 py-2">
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
            {/* Pasting the path into the agent beats retyping it by hand. */}
            {onSendToTerminal ? (
              <button
                type="button"
                onClick={() => file && onSendToTerminal(file.relativePath)}
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
          <CodeSurface variant="flush" content={content} fileName={file?.name} />
        </div>
      </div>
    </BaseModal>
  );
}
