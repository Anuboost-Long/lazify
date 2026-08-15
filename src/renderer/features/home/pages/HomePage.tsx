import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { Task, TaskStatus } from "@main/tasks/types";
import { appRoute, getAgentsRoute } from "@renderer/app/app-routes";
import { PageActions } from "@renderer/app/components/PageChrome";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, SectionTitle } from "@renderer/shared/typography";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { PageHero } from "@renderer/shared/ui/PageHero";
import { SegmentedTabs, type SegmentedTab } from "@renderer/shared/ui/SegmentedTabs";
import { usePromptPresets } from "../../prompts";
import { ProjectPickerModal } from "../../prompts/components/ProjectPickerModal";
import { SendTaskModal } from "../../tasks/components/SendTaskModal";
import { TaskDetailModal } from "../../tasks/components/TaskDetailModal";
import { DeleteTaskConfirm } from "../../tasks/components/DeleteTaskConfirm";
import { HomeTaskRow } from "../components/HomeTaskRow";
import { TaskStatTiles } from "../components/TaskStatTiles";

interface HomePageProps {
  projects: SyncedWorkspaceProject[];
  activeProjectPath: string | null;
  onActiveProjectChange: (projectPath: string) => void;
}

type Filter = "open" | "all";

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "doing",
  doing: "done",
  done: "todo"
};

const FILTERS: SegmentedTab<Filter>[] = [
  { id: "open", label: translation.Home.FilterOpen, icon: "play" },
  { id: "all", label: translation.Home.FilterAll, icon: "journal-page" }
];

/**
 * Where the app opens: what is on your plate, across every project.
 *
 * Tasks live in one database, so this is the one screen that can answer "what
 * now" without picking a project first — and every row leads to the place the
 * work actually happens.
 */
export function HomePage({
  projects,
  activeProjectPath,
  onActiveProjectChange
}: Readonly<HomePageProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { presets } = usePromptPresets();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [pickingProject, setPickingProject] = useState(false);
  const [sending, setSending] = useState<Task | null>(null);
  // One editor for both jobs: a task to work on, or null to write a new one in
  // the project it is being added to.
  const [editor, setEditor] = useState<{ task: Task | null; projectPath: string } | null>(null);
  const opened = editor?.task ?? null;
  const [deleting, setDeleting] = useState<Task | null>(null);

  const refresh = useCallback(async () => {
    setTasks(await globalThis.lazify.listAllTasks());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const projectNames = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.projectPath, project.projectName])),
    [projects]
  );

  const shown = filter === "open" ? tasks.filter((task) => task.status !== "done") : tasks;

  const cycle = async (task: Task) => {
    await globalThis.lazify.setTaskStatus(task.id, NEXT_STATUS[task.status]);
    await refresh();
  };

  const removeTask = async (task: Task) => {
    setDeleting(null);
    await globalThis.lazify.deleteTask(task.id);
    setEditor((current) => (current?.task?.id === task.id ? null : current));
    await refresh();
  };

  const startNewTask = () => {
    if (projects.length === 0) {
      navigate(appRoute.workspace);
      return;
    }

    if (activeProjectPath) setEditor({ task: null, projectPath: activeProjectPath });
    else setPickingProject(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageActions>
        <button
          type="button"
          onClick={startNewTask}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-[8px] bg-accent px-3 py-1",
            "text-xs font-semibold text-white transition-colors hover:bg-accentHover"
          )}
        >
          <UiIcon name="plus" className="h-3.5 w-3.5" />
          {t(translation.Tasks.AddTask)}
        </button>
      </PageActions>

      <PageHero
        eyebrow={translation.Home.Eyebrow}
        title={translation.Home.Title}
        description={translation.Home.Subtitle}
      />

      <TaskStatTiles tasks={tasks} />

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-soft p-4">
        <header className="flex items-center justify-between gap-3">
          <SectionTitle>{t(translation.Home.YourTasks)}</SectionTitle>
          <SegmentedTabs tabs={FILTERS} active={filter} onSelect={setFilter} />
        </header>

        <div className="flex flex-col gap-2">
          {shown.map((task) => (
            <HomeTaskRow
              key={task.id}
              task={task}
              projectName={projectNames[task.projectPath] ?? task.projectPath.split("/").at(-1) ?? ""}
              onOpen={() => setEditor({ task, projectPath: task.projectPath })}
              onCycleStatus={() => void cycle(task)}
              onSendPrompt={() => setSending(task)}
              onOpenAgents={() => {
                onActiveProjectChange(task.projectPath);
                navigate(getAgentsRoute(task.projectPath));
              }}
              onDelete={() => setDeleting(task)}
            />
          ))}

          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg text-muted">
                <UiIcon name="check-circle" className="h-5 w-5" />
              </span>
              <CaptionText tone="muted">
                {t(filter === "open" ? translation.Home.AllClear : translation.Tasks.Empty)}
              </CaptionText>
              <button
                type="button"
                onClick={startNewTask}
                className={clsx(
                  "rounded-full border border-accent/40 bg-accent/10 px-4 py-2",
                  "text-[12px] text-accent hover:bg-accent/15"
                )}
              >
                {t(translation.Tasks.AddTask)}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <TaskDetailModal
        open={editor !== null}
        task={opened}
        projectPath={editor?.projectPath ?? ""}
        projectName={
          editor
            ? (projectNames[editor.projectPath] ?? editor.projectPath.split("/").at(-1) ?? "")
            : ""
        }
        presets={presets}
        onSetStatus={(status) => {
          if (!editor?.task) return;
          void globalThis.lazify.setTaskStatus(editor.task.id, status).then(refresh);
          setEditor({ ...editor, task: { ...editor.task, status } });
        }}
        onDeleteTask={() => setDeleting(opened)}
        onSaveTask={(input) => {
          if (!editor) return;

          if (editor.task) {
            void globalThis.lazify.updateTask(editor.task.id, input).then(refresh);
            return;
          }

          // Saved for the first time: the pane stays open on the task that now
          // exists, so its status, history and agents are there to use.
          void globalThis.lazify.createTask(input).then((created) => {
            setEditor({ task: created, projectPath: created.projectPath });
            void refresh();
          });
        }}
        onSent={() => {
          setEditor(null);
          void refresh();
        }}
        onClose={() => setEditor(null)}
      />

      <DeleteTaskConfirm
        task={deleting}
        onConfirm={(task) => void removeTask(task)}
        onCancel={() => setDeleting(null)}
      />

      <SendTaskModal
        open={sending !== null}
        task={sending}
        onSent={(session) => {
          // Sending starts the task, so the list is asked again on the way out.
          void refresh();
          // Follow the prompt: the paste lands when that terminal is on screen.
          onActiveProjectChange(session.projectPath);
          navigate(getAgentsRoute(session.projectPath));
        }}
        onClose={() => setSending(null)}
      />

      <ProjectPickerModal
        open={pickingProject}
        projects={projects}
        selectedPath={activeProjectPath ?? ""}
        onSelect={(projectPath) => {
          onActiveProjectChange(projectPath);
          setEditor({ task: null, projectPath });
        }}
        onClose={() => setPickingProject(false)}
      />

    </div>
  );
}
