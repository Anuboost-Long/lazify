import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { ContextEntry, ContextScope } from "@main/prompts/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ContextEntryRow } from "./ContextEntryRow";
import { groupByPack } from "../lib/group-context";

const BUILTIN_PREFIX = "ctx-builtin-";

interface ContextColumnProps {
  scope: ContextScope;
  title: string;
  subtitle: string;
  entries: ContextEntry[];
  presetNames: Record<string, string>;
  disabled?: boolean;
  onAdd: () => void;
  onEdit: (entry: ContextEntry) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onTogglePack: (pack: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

/** One scope's context: what it holds, and how much of it is switched on. */
export function ContextColumn({
  scope,
  title,
  subtitle,
  entries,
  presetNames,
  disabled = false,
  onAdd,
  onEdit,
  onToggle,
  onTogglePack,
  onDelete
}: Readonly<ContextColumnProps>) {
  const { t } = useTranslation();
  const packs = groupByPack(entries);
  const active = entries.filter((entry) => entry.isActive).length;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-soft">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <UiIcon
              name={scope === "global" ? "globe" : "folder"}
              className="h-3.5 w-3.5 shrink-0 text-accent"
            />
            <SectionTitle className="truncate">{title}</SectionTitle>
            <CaptionText tone="muted">
              {t(translation.PromptBuilder.ActiveCount, { active, total: entries.length })}
            </CaptionText>
          </div>
          <CaptionText tone="muted" className="mt-0.5 block leading-5">
            {subtitle}
          </CaptionText>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className={clsx(
            "flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5",
            "text-[11px] text-text enabled:hover:border-accent/40 enabled:hover:text-accent",
            "disabled:cursor-not-allowed disabled:opacity-40"
          )}
        >
          <UiIcon name="plus" className="h-3 w-3" />
          {t(translation.PromptBuilder.AddEntry)}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {packs.map((pack) => (
          <div key={pack.name} className="mb-3">
            <div className="flex items-center justify-between gap-2 px-2 py-1">
              <OverlineText tone="muted" className="truncate">
                {pack.name || t(translation.PromptBuilder.PackUngrouped)}
              </OverlineText>

              {pack.name ? (
                <button
                  type="button"
                  onClick={() => onTogglePack(pack.name, !pack.allActive)}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-muted hover:text-accent"
                >
                  {t(
                    pack.allActive
                      ? translation.PromptBuilder.PackDisable
                      : translation.PromptBuilder.PackEnable
                  )}
                </button>
              ) : null}
            </div>

            {pack.entries.map((entry) => (
              <ContextEntryRow
                key={entry.id}
                entry={entry}
                deletable={!entry.id.startsWith(BUILTIN_PREFIX)}
                presetNames={presetNames}
                onToggle={(isActive) => onToggle(entry.id, isActive)}
                onEdit={() => onEdit(entry)}
                onDelete={() => onDelete(entry.id)}
              />
            ))}
          </div>
        ))}

        {entries.length === 0 ? (
          <CaptionText tone="muted" className="block px-2 py-10 text-center leading-6">
            {disabled
              ? t(translation.Tasks.SyncFirst)
              : t(translation.PromptBuilder.ContextEmpty)}
          </CaptionText>
        ) : null}
      </div>
    </section>
  );
}
