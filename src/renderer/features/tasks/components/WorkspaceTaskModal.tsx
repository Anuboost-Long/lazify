import { useState } from "react";

import type { Task } from "@main/tasks/types";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { usePromptPresets } from "../../prompts";
import { TaskDetailModal } from "./TaskDetailModal";
import { useTasks } from "../hooks/use-tasks";

interface WorkspaceTaskModalProps {
  open: boolean;
  projectPath: string;
  projects: SyncedWorkspaceProject[];
  onClose: () => void;
}

/** Adds a task from the project's own page, where the work is being looked at. */
export function WorkspaceTaskModal({
  open,
  projectPath,
  projects,
  onClose
}: Readonly<WorkspaceTaskModalProps>) {
  const { presets } = usePromptPresets();
  const { create, update, setStatus, remove } = useTasks(projectPath);
  // Null until it is saved, then the same pane keeps working on it.
  const [task, setTask] = useState<Task | null>(null);

  const close = () => {
    setTask(null);
    onClose();
  };

  return (
    <TaskDetailModal
      open={open}
      task={task}
      projects={projects}
      projectPath={projectPath}
      projectName={projectPath.split("/").filter(Boolean).at(-1) ?? ""}
      presets={presets}
      onSaveTask={(input) => {
        if (task) void update(task.id, input);
        else void create(input).then(setTask);
      }}
      onSetStatus={(status) => {
        if (!task) return;
        void setStatus(task.id, status);
        setTask({ ...task, status });
      }}
      onDeleteTask={() => {
        if (!task) return;
        void remove(task.id);
        close();
      }}
      onSent={close}
      onClose={close}
    />
  );
}
