import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { PromptPreset } from "@main/prompts/types";
import type { Task, TaskInput, TaskStatus } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import {
  CaptionText,
  OverlineText,
  SectionTitle,
  SmallText
} from "@renderer/shared/typography";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { ProjectPickerModal } from "@renderer/shared/ui/project-picker/ProjectPickerModal";
import { TaskDetailPane } from "./TaskDetailPane";

interface TaskDetailModalProps {
  open: boolean;
  task: Task | null;
  projectPath: string;
  projectName: string;
  projects: SyncedWorkspaceProject[];
  presets: PromptPreset[];
  onSaveTask: (input: TaskInput) => void;
  onSetStatus: (status: TaskStatus) => void;
  /** Deleting closes the modal: what it was showing is gone. */
  onDeleteTask: () => void;
  onSent: () => void;
  onClose: () => void;
}

/**
 * A task and the prompt it becomes, opened from wherever its list is.
 *
 * The list stays a list; this is where the task is actually worked on — fields
 * on the left, the exact text an agent will receive on the right. Writing a new
 * one happens here too, with `task` null until it is saved: one place to learn,
 * and a task is worth seeing as a prompt from the moment it is written.
 */
export function TaskDetailModal(props: Readonly<TaskDetailModalProps>) {
  const { open, task, projectPath, projects, onClose } = props;
  const [selectedProjectPath, setSelectedProjectPath] = useState(projectPath);
  const [pickingProject, setPickingProject] = useState(false);

  useEffect(() => {
    if (!open) return;

    setSelectedProjectPath(task?.projectPath ?? projectPath);
    setPickingProject(false);
  }, [open, projectPath, task?.id, task?.projectPath]);

  const selectedProjectName =
    projects.find((project) => project.projectPath === selectedProjectPath)?.projectName ??
    props.projectName;

  return (
    <>
      <BaseModal open={open} cancellable={!pickingProject} onClose={onClose}>
        {open ? (
          <DetailCard
            {...props}
            projectPath={selectedProjectPath}
            projectName={selectedProjectName}
            onPickProject={() => setPickingProject(true)}
          />
        ) : null}
      </BaseModal>

      <ProjectPickerModal
        open={open && pickingProject}
        projects={projects}
        selectedPath={selectedProjectPath}
        title={translation.PromptBuilder.ChooseProject}
        emptyMessage={translation.Tasks.SyncFirst}
        onSelect={setSelectedProjectPath}
        onClose={() => setPickingProject(false)}
      />
    </>
  );
}

type DetailCardProps = TaskDetailModalProps & { onPickProject: () => void };

function DetailCard({
  task,
  projectPath,
  projectName,
  presets,
  onSaveTask,
  onSetStatus,
  onDeleteTask,
  onSent,
  onClose,
  onPickProject
}: Readonly<DetailCardProps>) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        "flex h-[min(820px,90vh)] w-[min(1180px,94vw)] flex-col overflow-hidden",
        "rounded-2xl border border-border bg-bg shadow-2xl"
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <SectionTitle className="truncate">
            {task ? task.name : t(translation.Tasks.AddTask)}
          </SectionTitle>
          {task ? <CaptionText tone="muted">{projectName}</CaptionText> : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t(translation.GlobalTerm.Close)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-text/[0.06]"
        >
          <UiIcon name="xmark" className="h-4 w-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
        {!task ? (
          <div className="mb-5 flex shrink-0 flex-col gap-2">
            <OverlineText tone="muted">{t(translation.Tasks.Project)}</OverlineText>
            <button
              type="button"
              onClick={onPickProject}
              className={clsx(
                "group flex w-full items-center gap-4 rounded-xl border border-accent/25 bg-accent/[0.04] px-4 py-4 text-left",
                "transition-colors hover:border-accent/50 hover:bg-accent/[0.07]"
              )}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <UiIcon name="folder" filled className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <SmallText className="!text-text block truncate text-sm font-semibold">
                  {projectName || t(translation.Tasks.NoProject)}
                </SmallText>
                {projectPath ? (
                  <CaptionText tone="muted" className="block truncate font-mono">
                    {projectPath}
                  </CaptionText>
                ) : null}
              </span>
              <SmallText className="shrink-0 !text-accent">
                {t(translation.PromptBuilder.ChooseProject)}
              </SmallText>
              <UiIcon
                name="arrow-right"
                className="h-4 w-4 shrink-0 rotate-90 text-muted transition-colors group-hover:text-accent"
              />
            </button>
          </div>
        ) : null}

        <TaskDetailPane
          task={task}
          projectPath={projectPath}
          projectName={projectName}
          presets={presets}
          onSaveTask={onSaveTask}
          onSetStatus={onSetStatus}
          onDeleteTask={() => {
            onDeleteTask();
            onClose();
          }}
          onSent={() => {
            onSent();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
