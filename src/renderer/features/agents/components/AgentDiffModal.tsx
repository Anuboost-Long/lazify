import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { MonoText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { DiffView, type DiffViewMode } from "@renderer/shared/ui/code/diff/DiffView";
import { splitPath } from "../utils/paths";

interface AgentDiffModalProps {
  projectPath: string;
  /** The file to review, or null while the modal is closed. */
  filePath: string | null;
  additions: number;
  deletions: number;
  onClose: () => void;
}

/**
 * Reviewing code needs room the rail cannot give, so the diff opens here
 * instead — dark like the panel it was opened from.
 */
export function AgentDiffModal({
  projectPath,
  filePath,
  additions,
  deletions,
  onClose
}: Readonly<AgentDiffModalProps>) {
  const { t } = useTranslation();
  const [diff, setDiff] = useState<string>("");
  const [viewMode, setViewMode] = useState<DiffViewMode>("unified");

  useEffect(() => {
    if (!filePath) {
      setDiff("");
      return;
    }

    let cancelled = false;

    // The whole file, with the changes marked in place, so the edit can be
    // read against the structure around it.
    void globalThis.lazify.getFileDiff(projectPath, filePath, true).then((result) => {
      if (!cancelled) setDiff(result);
    });

    return () => {
      cancelled = true;
    };
  }, [projectPath, filePath]);

  const { directory, name } = filePath ? splitPath(filePath) : { directory: "", name: "" };

  return (
    <BaseModal open={filePath !== null} onClose={onClose}>
      <div
        className={clsx(
          "flex h-[85vh] w-[min(92vw,72rem)] flex-col overflow-hidden",
          "rounded-2xl border border-border bg-soft shadow-2xl"
        )}
      >
        <header className="flex items-center gap-2 border-b border-border px-3 py-2">
          <span className="min-w-0">
            <SmallText as="span" className="!text-text block truncate">
              {name}
            </SmallText>
            {directory ? (
              <SmallText as="span" className="!text-muted block truncate">
                {directory}
              </SmallText>
            ) : null}
          </span>

          {additions > 0 ? (
            <MonoText as="span" className="!text-emerald-700 dark:!text-emerald-300 shrink-0 text-[11px]">
              {`+${additions}`}
            </MonoText>
          ) : null}
          {deletions > 0 ? (
            <MonoText as="span" className="!text-rose-700 dark:!text-rose-300 shrink-0 text-[11px]">
              {`-${deletions}`}
            </MonoText>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center rounded-md border border-border p-0.5">
              {(["unified", "split"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={clsx(
                    "rounded px-2 py-0.5 transition-colors",
                    viewMode === mode ? "bg-text/10" : "hover:bg-text/[0.06]"
                  )}
                >
                  <SmallText
                    as="span"
                    className={viewMode === mode ? "!text-text" : "!text-muted"}
                  >
                    {t(
                      mode === "unified"
                        ? translation.Agents.DiffUnified
                        : translation.Agents.DiffSplit
                    )}
                  </SmallText>
                </button>
              ))}
            </div>

            <IconButton
              icon="xmark"
              aria-label={t(translation.GlobalTerm.Close)}
              onClick={onClose}
              className="text-text"
            />
          </div>
        </header>

        {/* The file name is what picks the language: without it the diff is
            tokenised as plain text and comes out uncoloured. */}
        <DiffView
          diff={diff}
          mode={viewMode}
          fileName={name}
          showHunkHeaders={false}
          collapseUnchanged
        />
      </div>
    </BaseModal>
  );
}
