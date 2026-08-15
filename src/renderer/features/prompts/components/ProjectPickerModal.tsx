import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, SectionTitle, SmallText } from "@renderer/shared/typography";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { fieldBase } from "./form-fields";

interface ProjectPickerModalProps {
  open: boolean;
  projects: SyncedWorkspaceProject[];
  selectedPath: string;
  onSelect: (projectPath: string) => void;
  onClose: () => void;
}

export function ProjectPickerModal(props: Readonly<ProjectPickerModalProps>) {
  return (
    <BaseModal open={props.open} onClose={props.onClose}>
      {props.open ? <PickerCard {...props} /> : null}
    </BaseModal>
  );
}

function PickerCard({
  projects,
  selectedPath,
  onSelect,
  onClose
}: Readonly<ProjectPickerModalProps>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? projects.filter((project) =>
        `${project.projectName} ${project.projectPath}`.toLowerCase().includes(needle)
      )
    : projects;

  return (
    <div
      className={clsx(
        "flex max-h-[80vh] w-[min(560px,92vw)] flex-col overflow-hidden",
        "rounded-2xl border border-border bg-bg shadow-2xl"
      )}
    >
      <header className="flex flex-col gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>{t(translation.PromptBuilder.ChooseProject)}</SectionTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(translation.GlobalTerm.Close)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-text/[0.06]"
          >
            <UiIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex items-center">
          <UiIcon
            name="search"
            className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted"
          />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(translation.GlobalTerm.Search)}
            className={clsx(fieldBase, "pl-9")}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {shown.map((project) => {
          const selected = project.projectPath === selectedPath;

          return (
            <button
              key={project.projectPath}
              type="button"
              onClick={() => {
                onSelect(project.projectPath);
                onClose();
              }}
              className={clsx(
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                selected ? "bg-accent/10" : "hover:bg-text/[0.04]"
              )}
            >
              <span
                className={clsx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  selected ? "bg-accent/15 text-accent" : "bg-text/[0.05] text-muted"
                )}
              >
                <UiIcon name="folder" filled={selected} className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <SmallText className={clsx("block truncate", selected && "!text-accent")}>
                  {project.projectName}
                </SmallText>
                <CaptionText tone="muted" className="block truncate font-mono">
                  {project.projectPath}
                </CaptionText>
              </div>

              {selected ? (
                <UiIcon name="check-circle" filled className="h-4 w-4 shrink-0 text-accent" />
              ) : null}
            </button>
          );
        })}

        {shown.length === 0 ? (
          <CaptionText tone="muted" className="block px-3 py-8 text-center">
            {t(translation.Tasks.SyncFirst)}
          </CaptionText>
        ) : null}
      </div>
    </div>
  );
}
