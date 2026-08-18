import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Task, TaskStatus } from "@main/tasks/types";
import { appRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { useNavigate } from "react-router-dom";
import { railPanelShell, type RailPanelVariant } from "../../agents/components/rail-panel-shell";
import { usePromptPresets } from "../../prompts";
import { SendTaskModal } from "./SendTaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { TaskRow } from "./TaskRow";
import { DeleteTaskConfirm } from "./DeleteTaskConfirm";
import { useTasks } from "../hooks/use-tasks";

interface AgentTaskPanelProps {
  projectPath: string;
  projects: SyncedWorkspaceProject[];
  variant?: RailPanelVariant;
  onClose: () => void;
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "doing",
  doing: "done",
  done: "todo"
};

const GROUPS: TaskStatus[] = ["doing", "todo", "done"];

const groupLabel: Record<TaskStatus, string> = {
  doing: translation.Tasks.StatusDoing,
  todo: translation.Tasks.StatusTodo,
  done: translation.Tasks.StatusDone
};

/**
 * The task list, beside the agents doing the work.
 *
 * A task can be written, ticked off or handed to the agent on screen without
 * leaving the page — this is where the work is, so it is where a task most
 * often gets added. Presets and context are the tool page's job.
 */
export function AgentTaskPanel({
  projectPath,
  projects,
  variant = "rail",
  onClose
}: Readonly<AgentTaskPanelProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { presets } = usePromptPresets();
  const { tasks, create, update, setStatus, remove, refresh } = useTasks(projectPath);
  // One editor for both jobs: `task` null is a task being written, a task is
  // one being worked on. `open` is separate so null stays meaningful.
  const [editor, setEditor] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null
  });
  const opened = editor.task;
  const [sending, setSending] = useState<Task | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const markSent = (task: Task) => {
    setSentId(task.id);
    setTimeout(() => setSentId(null), 2000);
  };

  return (
    <aside className={railPanelShell(variant)}>
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <UiIcon name="check-circle" className="h-3.5 w-3.5 text-accent" />
          <SectionTitle>{t(translation.Tasks.Title)}</SectionTitle>
          {sentId ? (
            <CaptionText className="!text-accent">{t(translation.Tasks.PromptSent)}</CaptionText>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t(translation.GlobalTerm.Close)}
          className="rounded p-1 text-muted hover:text-text"
        >
          <UiIcon name="xmark" className="h-3 w-3" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {GROUPS.map((group) => {
          const inGroup = tasks.filter((task) => task.status === group);
          if (inGroup.length === 0) return null;

          return (
            <section key={group} className="mb-3 flex flex-col gap-1.5">
              <OverlineText tone="muted" className="block px-2 py-1">
                {t(groupLabel[group])}
              </OverlineText>

              {inGroup.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onSelect={() => setEditor({ open: true, task })}
                  onCycleStatus={() => void setStatus(task.id, NEXT_STATUS[task.status])}
                  onSendPrompt={() => setSending(task)}
                  onEdit={() => setEditor({ open: true, task })}
                  onDelete={() => setDeleting(task)}
                />
              ))}
            </section>
          );
        })}

        {tasks.length === 0 ? (
          <CaptionText tone="muted" className="block px-2 py-6 text-center">
            {t(translation.Tasks.Empty)}
          </CaptionText>
        ) : null}
      </div>

      <DeleteTaskConfirm
        task={deleting}
        onConfirm={(task) => {
          setDeleting(null);
          setEditor((current) =>
            current.task?.id === task.id ? { open: false, task: null } : current
          );
          void remove(task.id);
        }}
        onCancel={() => setDeleting(null)}
      />

      <SendTaskModal
        open={sending !== null}
        task={sending}
        onSent={() => {
          if (sending) markSent(sending);
          // Sending starts the task; the list picks that up here.
          void refresh();
        }}
        onClose={() => setSending(null)}
      />

      <TaskDetailModal
        open={editor.open}
        task={editor.task}
        projects={projects}
        projectPath={projectPath}
        projectName={projectPath.split("/").filter(Boolean).at(-1) ?? ""}
        presets={presets}
        onSetStatus={(status) => {
          if (!opened) return;
          void setStatus(opened.id, status);
          setEditor({ open: true, task: { ...opened, status } });
        }}
        onDeleteTask={() => setDeleting(opened)}
        onSaveTask={(input) => {
          if (opened) {
            void update(opened.id, input);
            return;
          }

          // Saved for the first time: the pane stays open on the task that now
          // exists, so its status, history and agents are there to use.
          void create(input).then((created) => setEditor({ open: true, task: created }));
        }}
        onSent={() => {
          setEditor({ open: false, task: null });
          void refresh();
        }}
        onClose={() => setEditor({ open: false, task: null })}
      />

      <footer className="flex flex-col gap-1.5 border-t border-border p-2">
        <button
          type="button"
          onClick={() => setEditor({ open: true, task: null })}
          disabled={!projectPath}
          className={clsx(
            "flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-1.5",
            "text-muted enabled:hover:border-accent/40 enabled:hover:text-accent",
            "disabled:cursor-not-allowed disabled:opacity-40"
          )}
        >
          <UiIcon name="plus" className="h-3 w-3" />
          <CaptionText>{t(translation.Tasks.AddTask)}</CaptionText>
        </button>

        <button
          type="button"
          onClick={() => navigate(appRoute.toolsPromptBuilder)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-muted hover:text-accent"
        >
          <UiIcon name="sparks" className="h-3 w-3" />
          <CaptionText>{t(translation.Tasks.OpenBuilder)}</CaptionText>
        </button>
      </footer>
    </aside>
  );
}
