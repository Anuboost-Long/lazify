import { useTranslation } from "react-i18next";

import type { Task } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { ConfirmModal } from "@renderer/shared/ui/modal/ConfirmModal";

interface DeleteTaskConfirmProps {
  /** The task waiting on an answer, or null when nothing is being deleted. */
  task: Task | null;
  onConfirm: (task: Task) => void;
  onCancel: () => void;
}

/**
 * The one gate in front of deleting a task.
 *
 * A task takes its prompt history with it — the exact instructions every agent
 * was handed — and none of it comes back. Asked the same way from every list,
 * in the app's own modal rather than the operating system's box.
 */
export function DeleteTaskConfirm({ task, onConfirm, onCancel }: Readonly<DeleteTaskConfirmProps>) {
  const { t } = useTranslation();

  return (
    <ConfirmModal
      open={task !== null}
      title={t(translation.Tasks.DeleteTask)}
      description={task ? t(translation.Tasks.DeleteConfirm, { name: task.name }) : undefined}
      confirmLabel={t(translation.GlobalTerm.Delete)}
      destructive
      onConfirm={() => task && onConfirm(task)}
      onCancel={onCancel}
    />
  );
}
