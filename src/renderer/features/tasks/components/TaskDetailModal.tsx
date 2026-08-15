import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { PromptPreset } from "@main/prompts/types";
import type { Task, TaskInput, TaskStatus } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { TaskDetailPane } from "./TaskDetailPane";

interface TaskDetailModalProps {
  open: boolean;
  task: Task | null;
  projectPath: string;
  projectName: string;
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
  const { open, onClose } = props;

  return (
    <BaseModal open={open} onClose={onClose}>
      {open ? <DetailCard {...props} /> : null}
    </BaseModal>
  );
}

function DetailCard({
  task,
  projectPath,
  projectName,
  presets,
  onSaveTask,
  onSetStatus,
  onDeleteTask,
  onSent,
  onClose
}: Readonly<TaskDetailModalProps>) {
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
          <CaptionText tone="muted">{projectName}</CaptionText>
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
