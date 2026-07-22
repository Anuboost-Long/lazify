import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { AgentFileChange } from "@renderer/shared/types/lazify";
import { MonoText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface AgentChangesPanelProps {
  projectPath: string;
  changes: AgentFileChange[];
  loading: boolean;
  onRefresh: () => void;
  onReset: () => void;
  onClose: () => void;
}

function splitPath(filePath: string) {
  const index = filePath.lastIndexOf("/");

  return index === -1
    ? { directory: "", name: filePath }
    : { directory: filePath.slice(0, index + 1), name: filePath.slice(index + 1) };
}

function diffLineClass(line: string) {
  if (line.startsWith("+++") || line.startsWith("---")) return "text-white/40";
  if (line.startsWith("@@")) return "text-sky-300/80";
  if (line.startsWith("+")) return "text-emerald-300";
  if (line.startsWith("-")) return "text-rose-300";
  return "text-white/55";
}

/**
 * The panel is always dark like the terminal it sits beside, so it uses fixed
 * light-on-dark colours instead of theme tokens.
 */
export function AgentChangesPanel({
  projectPath,
  changes,
  loading,
  onRefresh,
  onReset,
  onClose
}: Readonly<AgentChangesPanelProps>) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [diff, setDiff] = useState<string>("");

  // Drop the open file whenever the project changes underneath us.
  useEffect(() => setSelected(null), [projectPath]);

  useEffect(() => {
    if (!selected) {
      setDiff("");
      return;
    }

    let cancelled = false;

    void globalThis.lazify.getFileDiff(projectPath, selected).then((result) => {
      if (!cancelled) setDiff(result);
    });

    return () => {
      cancelled = true;
    };
  }, [projectPath, selected]);

  return (
    <aside
      className={clsx(
        "flex w-72 shrink-0 flex-col overflow-hidden border-l border-white/10",
        "bg-white/[0.02]"
      )}
    >
      <header className="flex items-center gap-1 border-b border-white/10 px-2 py-1.5">
        {selected ? (
          <IconButton
            icon="arrow-left"
            aria-label={t(translation.GlobalTerm.Back)}
            onClick={() => setSelected(null)}
            className="text-white hover:bg-white/10 dark:hover:bg-white/10"
          />
        ) : (
          <UiIcon name="journal-page" className="ml-1 h-3.5 w-3.5 text-white/70" />
        )}

        <SmallText as="span" className="!text-white truncate">
          {selected ? splitPath(selected).name : t(translation.Agents.SessionChanges)}
        </SmallText>

        {!selected && changes.length > 0 ? (
          <SmallText as="span" className="!text-accent">
            {changes.length}
          </SmallText>
        ) : null}

        <div className="ml-auto flex items-center">
          {selected ? null : (
            <>
              <IconButton
                icon="refresh-circle"
                aria-label={t(translation.GlobalTerm.Refresh)}
                onClick={onRefresh}
                iconClassName={loading ? "animate-spin" : undefined}
                className="text-white hover:bg-white/10 dark:hover:bg-white/10"
              />
              <IconButton
                icon="check-circle"
                aria-label={t(translation.Agents.MarkReviewed)}
                title={t(translation.Agents.MarkReviewed)}
                onClick={onReset}
                className="text-white hover:bg-white/10 dark:hover:bg-white/10"
              />
            </>
          )}
          <IconButton
            icon="xmark"
            aria-label={t(translation.GlobalTerm.Close)}
            onClick={onClose}
            className="text-white hover:bg-white/10 dark:hover:bg-white/10"
          />
        </div>
      </header>

      {selected ? (
        <div className="min-h-0 flex-1 overflow-auto px-2 py-1.5">
          {diff.split("\n").map((line, index) => (
            <MonoText
              as="span"
              key={`${index}-${line.slice(0, 12)}`}
              className={clsx("block whitespace-pre text-[11px] leading-4", diffLineClass(line))}
            >
              {line || " "}
            </MonoText>
          ))}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-1.5">
          {changes.length === 0 ? (
            <SmallText className="!text-white/40 px-1.5 py-2">
              {t(translation.Agents.NoChanges)}
            </SmallText>
          ) : (
            changes.map((change) => {
              const { directory, name } = splitPath(change.path);

              return (
                <button
                  key={change.path}
                  type="button"
                  onClick={() => setSelected(change.path)}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left",
                    "transition-colors hover:bg-white/[0.06]"
                  )}
                  title={`${change.statusLabel} — ${change.path}`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <SmallText as="span" className="!text-white block truncate">
                      {name}
                    </SmallText>
                    {directory ? (
                      <SmallText as="span" className="!text-white/35 block truncate">
                        {directory}
                      </SmallText>
                    ) : null}
                  </span>
                  {change.additions > 0 ? (
                    <MonoText as="span" className="!text-emerald-300 text-[11px]">
                      {`+${change.additions}`}
                    </MonoText>
                  ) : null}
                  {change.deletions > 0 ? (
                    <MonoText as="span" className="!text-rose-300 text-[11px]">
                      {`-${change.deletions}`}
                    </MonoText>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
}
