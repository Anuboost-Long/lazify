import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SectionTitle } from "@renderer/shared/typography";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { ProjectPickerPanel } from "./ProjectPickerPanel";

interface ProjectPickerModalProps {
  open: boolean;
  projects: SyncedWorkspaceProject[];
  selectedPath: string;
  title: string;
  emptyMessage: string;
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
  title,
  emptyMessage,
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
          <SectionTitle>{t(title)}</SectionTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(translation.GlobalTerm.Close)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-text/[0.06]"
          >
            <UiIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>

        <TextInput
          autoFocus
          type="search"
          size="sm"
          icon="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(translation.GlobalTerm.Search)}
          className="!min-h-10 !rounded-xl"
        />
      </header>

      <ProjectPickerPanel
        projects={shown}
        selectedPath={selectedPath}
        emptyMessage={emptyMessage}
        inset
        onSelect={(project) => {
          onSelect(project.projectPath);
          onClose();
        }}
      />
    </div>
  );
}
