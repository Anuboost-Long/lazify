import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { AgentFileChange } from "@renderer/shared/types/lazify";
import { MonoText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { AgentDiffModal } from "./AgentDiffModal";
import { splitPath } from "../utils/paths";
import { railPanelShell, type RailPanelVariant } from "./rail-panel-shell";

interface AgentChangesPanelProps {
  projectPath: string;
  changes: AgentFileChange[];
  loading: boolean;
  onRefresh: () => void;
  onReset: () => void;
  onClose: () => void;

  variant?: RailPanelVariant;
}

export function AgentChangesPanel({
  projectPath,
  changes,
  loading,
  onRefresh,
  onReset,
  onClose,
  variant = "rail"
}: Readonly<AgentChangesPanelProps>) {
  const { t } = useTranslation();

  const [selected, setSelected] = useState<AgentFileChange | null>(null);

  useEffect(() => setSelected(null), [projectPath]);

  return (
    <aside className={railPanelShell(variant)}>
      <header className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <UiIcon name="journal-page" className="ml-1 h-3.5 w-3.5 text-muted" />

        <SmallText as="span" className="!text-text truncate">
          {t(translation.Agents.SessionChanges)}
        </SmallText>

        {changes.length > 0 ? (
          <SmallText as="span" className="!text-accent">
            {changes.length}
          </SmallText>
        ) : null}

        <div className="ml-auto flex items-center">
          <IconButton
            icon="refresh-circle"
            aria-label={t(translation.GlobalTerm.Refresh)}
            onClick={onRefresh}
            iconClassName={loading ? "animate-spin" : undefined}
            className="text-text"
          />
          <IconButton
            icon="check-circle"
            aria-label={t(translation.Agents.MarkReviewed)}
            title={t(translation.Agents.MarkReviewed)}
            onClick={onReset}
            className="text-text"
          />
          <IconButton
            icon="xmark"
            aria-label={t(translation.GlobalTerm.Close)}
            onClick={onClose}
            className="text-text"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-1.5">
        {changes.length === 0 ? (
          <SmallText className="!text-muted px-1.5 py-2">
            {t(translation.Agents.NoChanges)}
          </SmallText>
        ) : (
          changes.map((change) => {
            const { directory, name } = splitPath(change.path);

            return (
              <button
                key={change.path}
                type="button"
                onClick={() => setSelected(change)}
                className={clsx(
                  "flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left",
                  "transition-colors hover:bg-text/[0.06]"
                )}
                title={`${change.statusLabel} — ${change.path}`}
              >
                <span className="min-w-0 flex-1 truncate">
                  <SmallText as="span" className="!text-text block truncate">
                    {name}
                  </SmallText>
                  {directory ? (
                    <SmallText as="span" className="!text-muted block truncate">
                      {directory}
                    </SmallText>
                  ) : null}
                </span>
                {change.additions > 0 ? (
                  <MonoText as="span" className="!text-emerald-700 dark:!text-emerald-300 text-[11px]">
                    {`+${change.additions}`}
                  </MonoText>
                ) : null}
                {change.deletions > 0 ? (
                  <MonoText as="span" className="!text-rose-700 dark:!text-rose-300 text-[11px]">
                    {`-${change.deletions}`}
                  </MonoText>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      <AgentDiffModal
        projectPath={projectPath}
        filePath={selected?.path ?? null}
        additions={selected?.additions ?? 0}
        deletions={selected?.deletions ?? 0}
        onClose={() => setSelected(null)}
      />
    </aside>
  );
}
