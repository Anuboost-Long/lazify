import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { Task, TaskStatus } from "@main/tasks/types";
import { appRoute, getAgentsRoute, getWorkspaceProjectRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, SectionTitle } from "@renderer/shared/typography";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { PageHero } from "@renderer/shared/ui/PageHero";
import { ProjectPickerModal } from "@renderer/shared/ui/project-picker/ProjectPickerModal";
import { SegmentedTabs, type SegmentedTab } from "@renderer/shared/ui/SegmentedTabs";
import { usePromptPresets } from "../../prompts";
import { SendTaskModal } from "../../tasks/components/SendTaskModal";
import { TaskDetailModal } from "../../tasks/components/TaskDetailModal";
import { DeleteTaskConfirm } from "../../tasks/components/DeleteTaskConfirm";
import { formatStackLabel } from "@renderer/shared/lib/stack-label";
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
      <PageHero
        eyebrow={translation.Home.Eyebrow}
        title={translation.Home.Title}
        description={translation.Home.Subtitle}
      >
        <TaskStatTiles tasks={tasks} />
      </PageHero>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-[18px] border border-border bg-soft">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <SectionTitle className="!text-lg">{t(translation.Home.YourTasks)}</SectionTitle>
              <span className="rounded-full bg-text/[0.06] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
                {shown.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <SegmentedTabs tabs={FILTERS} active={filter} onSelect={setFilter} />
              <button
                type="button"
                onClick={startNewTask}
                className={clsx(
                  "inline-flex h-8 items-center gap-2 rounded-[10px] border border-accent/70 bg-accent px-3.5",
                  "text-xs font-semibold text-white shadow-panel transition-[background-color,transform,box-shadow]",
                  "hover:bg-accentHover hover:shadow-glow active:translate-y-px active:shadow-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-soft"
                )}
              >
                <UiIcon name="plus" className="h-4 w-4" strokeWidth={2.2} />
                {t(translation.Tasks.AddTask)}
              </button>
            </div>
          </header>

          <div className="flex flex-col">
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
              <div className="flex flex-col items-center gap-3 py-14">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted">
                  <UiIcon name="check-circle" className="h-5 w-5" />
                </span>
                <CaptionText tone="muted">
                  {t(filter === "open" ? translation.Home.AllClear : translation.Tasks.Empty)}
                </CaptionText>
                <button
                  type="button"
                  onClick={startNewTask}
                  className={clsx(
                    "rounded-[10px] border border-accent/30 bg-accent/10 px-4 py-2",
                    "text-[12px] font-semibold text-accent hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  )}
                >
                  {t(translation.Tasks.AddTask)}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="overflow-hidden rounded-[18px] border border-border bg-soft">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <SectionTitle className="!text-lg">{t(translation.Agents.Projects)}</SectionTitle>
            <span className="rounded-full bg-text/[0.06] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
              {projects.length}
            </span>
          </header>

          {projects.length > 0 ? (
            <div className="divide-y divide-border">
              {projects.slice(0, 5).map((project) => {
                const projectTasks = tasks.filter((task) => task.projectPath === project.projectPath);
                const completedTasks = projectTasks.filter((task) => task.status === "done").length;
                const progress = projectTasks.length === 0
                  ? 0
                  : Math.round((completedTasks / projectTasks.length) * 100);
                const active = project.projectPath === activeProjectPath;

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      onActiveProjectChange(project.projectPath);
                      navigate(getWorkspaceProjectRoute(project.projectPath));
                    }}
                    className={clsx(
                      "group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors",
                      "hover:bg-text/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50",
                      active && "bg-accent/[0.06]"
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border",
                        active
                          ? "border-accent/30 bg-accent/10 text-accent"
                          : "border-border bg-bg/50 text-muted group-hover:text-text"
                      )}
                    >
                      <UiIcon name="folder" filled={active} className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-text">
                        {project.projectName}
                      </span>
                      <CaptionText tone="muted" className="mt-1 block truncate">
                        {formatStackLabel(project.stack)}
                      </CaptionText>
                    </span>

                    <span className="w-12 shrink-0 text-right">
                      <span className="text-xs font-semibold tabular-nums text-text">
                        {progress}%
                      </span>
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-text/[0.08]">
                        <span
                          style={{ width: `${progress}%` }}
                          className="block h-full rounded-full bg-accent"
                        />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <UiIcon name="folder-plus" className="mx-auto h-6 w-6 text-muted" />
              <CaptionText tone="muted" className="mt-3">
                {t(translation.Workspace.NoSyncedYet)}
              </CaptionText>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate(appRoute.workspace)}
            className={clsx(
              "flex w-full items-center justify-between border-t border-border px-5 py-3.5",
              "text-xs font-semibold text-muted transition-colors hover:bg-text/[0.025] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
            )}
          >
            {t(translation.Navigation.Workspace)}
            <UiIcon name="arrow-right" className="h-3.5 w-3.5" />
          </button>
        </aside>
      </div>

      <TaskDetailModal
        open={editor !== null}
        task={opened}
        projects={projects}
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
        title={translation.PromptBuilder.ChooseProject}
        emptyMessage={translation.Tasks.SyncFirst}
        onSelect={(projectPath) => {
          onActiveProjectChange(projectPath);
          setEditor({ task: null, projectPath });
        }}
        onClose={() => setPickingProject(false)}
      />

    </div>
  );
}
